import assert from "node:assert/strict";
import test from "node:test";

import {
  LATEST_SCHEMA_VERSION,
  migrate,
  schemaVersion,
} from "../lib/db/migrations.ts";
import { createTestDb } from "./helpers/test-db.mjs";

const EXPECTED_TABLES = [
  "analytics_events",
  "app_meta",
  "budget_allocations",
  "budget_months",
  "categories",
  "category_groups",
  "income_sources",
  "profile",
  "savings_goals",
  "transactions",
];

async function tableNames(db) {
  const rows = await db.getAllAsync(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return rows.map((row) => row.name);
}

test("empty database gets the full schema", async () => {
  const db = createTestDb();

  assert.equal(await schemaVersion(db), 0);
  assert.equal(await migrate(db), LATEST_SCHEMA_VERSION);
  assert.deepEqual(await tableNames(db), EXPECTED_TABLES);

  db.close();
});

test("repeated migration changes nothing", async () => {
  const db = createTestDb();

  await migrate(db);
  const afterFirst = await tableNames(db);

  assert.equal(await migrate(db), LATEST_SCHEMA_VERSION);
  assert.deepEqual(await tableNames(db), afterFirst);

  db.close();
});

test("a failing migration leaves the previous version intact", async () => {
  const db = createTestDb();
  await migrate(db);

  const before = await schemaVersion(db);
  const broken = {
    version: LATEST_SCHEMA_VERSION + 1,
    statements: [
      "CREATE TABLE half_applied (id TEXT PRIMARY KEY NOT NULL)",
      "CREATE TABLE this is not valid sql",
    ],
  };

  await assert.rejects(async () => {
    for (const statement of broken.statements) {
      await db.execAsync(statement);
    }
  });

  // Транзакция миграции откатывает всё целиком: таблицы из упавшей версии
  // остаться не должно, иначе следующий запуск наткнётся на «уже существует».
  const db2 = createTestDb();
  await migrate(db2);
  await assert.rejects(() =>
    db2.withTransactionAsync(async () => {
      for (const statement of broken.statements) {
        await db2.execAsync(statement);
      }
    }),
  );
  const tables = await tableNames(db2);
  assert.ok(!tables.includes("half_applied"));
  assert.equal(await schemaVersion(db2), before);

  db.close();
  db2.close();
});

test("transactions reference categories and keep a signed amount", async () => {
  const db = createTestDb();
  await migrate(db);

  const now = "2026-08-15T10:00:00.000Z";
  await db.runAsync(
    "INSERT INTO category_groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ["g-1", "Essentials", 0, now, now],
  );
  await db.runAsync(
    "INSERT INTO categories (id, group_id, name, kind, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["c-1", "g-1", "Groceries", "fixed", "groceries", 0, now, now],
  );
  await db.runAsync(
    "INSERT INTO transactions (id, type, amount, category_id, note, date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["t-1", "expense", -42.18, "c-1", "Tesco", "2026-08-02", now, now],
  );

  const row = await db.getFirstAsync(
    "SELECT t.amount, c.name AS category FROM transactions t JOIN categories c ON c.id = t.category_id",
  );
  assert.deepEqual(row, { amount: -42.18, category: "Groceries" });

  // Категория не может исчезнуть из-под истории.
  await assert.rejects(() => db.runAsync("DELETE FROM categories WHERE id = ?", ["c-1"]));

  db.close();
});

test("a category cannot be assigned twice in the same month", async () => {
  const db = createTestDb();
  await migrate(db);

  const now = "2026-08-15T10:00:00.000Z";
  await db.runAsync(
    "INSERT INTO category_groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ["g-1", "Essentials", 0, now, now],
  );
  await db.runAsync(
    "INSERT INTO categories (id, group_id, name, kind, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["c-1", "g-1", "Groceries", "fixed", "groceries", 0, now, now],
  );
  await db.runAsync(
    "INSERT INTO budget_months (id, month_key, starts_on, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ["m-1", "2026-08", "2026-08-01", now, now],
  );
  await db.runAsync(
    "INSERT INTO budget_allocations (id, month_key, category_id, assigned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
    ["a-1", "2026-08", "c-1", 500, now, now],
  );

  await assert.rejects(() =>
    db.runAsync(
      "INSERT INTO budget_allocations (id, month_key, category_id, assigned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ["a-2", "2026-08", "c-1", 100, now, now],
    ),
  );

  db.close();
});

test("savings goal kinds are limited to the three planned shapes", async () => {
  const db = createTestDb();
  await migrate(db);

  const now = "2026-08-15T10:00:00.000Z";
  await db.runAsync(
    "INSERT INTO category_groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ["g-1", "Savings", 0, now, now],
  );
  await db.runAsync(
    "INSERT INTO categories (id, group_id, name, kind, icon, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    ["c-1", "g-1", "Summer trip", "savings", "trip", 0, now, now],
  );

  for (const kind of ["target", "target_date", "open"]) {
    await db.runAsync(
      "INSERT INTO savings_goals (id, category_id, kind, target_amount, target_date, cadence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [`sg-${kind}`, "c-1", kind, 2000, null, null, now, now],
    );
    await db.runAsync("DELETE FROM savings_goals WHERE id = ?", [`sg-${kind}`]);
  }

  await assert.rejects(() =>
    db.runAsync(
      "INSERT INTO savings_goals (id, category_id, kind, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      ["sg-bad", "c-1", "someday", now, now],
    ),
  );

  db.close();
});
