import assert from "node:assert/strict";
import test from "node:test";

import { migrate } from "../lib/db/migrations.ts";
import {
  archiveCategory,
  findGroupByName,
  insertCategory,
  insertGroup,
  listCategories,
  listGroups,
  renameGroup,
  restoreCategory,
  updateCategory,
} from "../lib/db/repositories/categories.ts";
import { ensureIncomeSource, listIncomeSources } from "../lib/db/repositories/income-sources.ts";
import { ensureProfile } from "../lib/db/repositories/profile.ts";
import { seedStarterData } from "../lib/db/seed.ts";
import { createTestDb } from "./helpers/test-db.mjs";

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

test("starter data gives categories but no money", async () => {
  const db = await freshDb();
  await seedStarterData(db);

  const groups = await listGroups(db);
  const categories = await listCategories(db);

  assert.deepEqual(
    groups.map((group) => group.name),
    ["Essentials", "Lifestyle", "Savings"],
  );
  assert.equal(categories.length, 7);
  assert.equal(categories.filter((category) => category.kind === "savings").length, 1);

  const transactions = await db.getAllAsync("SELECT id FROM transactions");
  const allocations = await db.getAllAsync("SELECT id FROM budget_allocations");
  assert.equal(transactions.length, 0);
  assert.equal(allocations.length, 0);

  db.close();
});

test("seeding twice does not duplicate the starter set", async () => {
  const db = await freshDb();

  await seedStarterData(db);
  await seedStarterData(db);

  assert.equal((await listGroups(db)).length, 3);
  assert.equal((await listCategories(db)).length, 7);
  assert.equal((await listIncomeSources(db)).length, 5);

  db.close();
});

test("an emptied budget does not grow starter categories back", async () => {
  const db = await freshDb();
  await seedStarterData(db);

  await db.runAsync("UPDATE categories SET deleted_at = ?", ["2026-08-15T10:00:00.000Z"]);
  await seedStarterData(db);

  assert.equal((await listCategories(db)).length, 0);

  db.close();
});

test("profile is created once and reused", async () => {
  const db = await freshDb();

  const first = await ensureProfile(db);
  const second = await ensureProfile(db);

  assert.equal(first.id, second.id);
  assert.equal(first.currency, "EUR");
  assert.equal(first.monthStartDay, 1);

  db.close();
});

test("archiving hides a category from new operations and is reversible", async () => {
  const db = await freshDb();
  const group = await insertGroup(db, { name: "Essentials" });
  const category = await insertCategory(db, {
    groupId: group.id,
    name: "Groceries",
    kind: "fixed",
    icon: "groceries",
  });

  await archiveCategory(db, category.id);
  const archived = (await listCategories(db)).find((item) => item.id === category.id);
  assert.ok(archived?.archivedAt);

  // Дата архивации не сдвигается при повторе.
  await archiveCategory(db, category.id);
  const again = (await listCategories(db)).find((item) => item.id === category.id);
  assert.equal(again?.archivedAt, archived?.archivedAt);

  await restoreCategory(db, category.id);
  const restored = (await listCategories(db)).find((item) => item.id === category.id);
  assert.equal(restored?.archivedAt, null);

  db.close();
});

test("archiving keeps the transaction history pointing at the category", async () => {
  const db = await freshDb();
  const group = await insertGroup(db, { name: "Essentials" });
  const category = await insertCategory(db, {
    groupId: group.id,
    name: "Groceries",
    kind: "fixed",
    icon: "groceries",
  });

  const now = "2026-08-15T10:00:00.000Z";
  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, category_id, payee, note, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["t-1", "expense", -12.5, category.id, "Tesco", "", "2026-08-02", now, now],
  );

  await archiveCategory(db, category.id);

  const row = await db.getFirstAsync(
    `SELECT c.name FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?`,
    ["t-1"],
  );
  assert.equal(row.name, "Groceries");

  db.close();
});

test("renaming a category renames it across the whole history", async () => {
  const db = await freshDb();
  const group = await insertGroup(db, { name: "Essentials" });
  const category = await insertCategory(db, {
    groupId: group.id,
    name: "Groceries",
    kind: "fixed",
    icon: "groceries",
  });

  const now = "2026-08-15T10:00:00.000Z";
  await db.runAsync(
    `INSERT INTO transactions (id, type, amount, category_id, payee, note, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["t-old", "expense", -12.5, category.id, "Tesco", "", "2025-01-02", now, now],
  );

  await updateCategory(db, category.id, {
    groupId: group.id,
    name: "Food",
    kind: "fixed",
    icon: "groceries",
  });

  const row = await db.getFirstAsync(
    `SELECT c.name FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?`,
    ["t-old"],
  );
  assert.equal(row.name, "Food");

  db.close();
});

test("a group is matched by name regardless of case and spacing", async () => {
  const db = await freshDb();
  const group = await insertGroup(db, { name: "Fun money" });

  assert.equal((await findGroupByName(db, "  fun MONEY "))?.id, group.id);
  assert.equal(await findGroupByName(db, "Holidays"), null);

  await renameGroup(db, group.id, "Fun");
  assert.equal((await listGroups(db))[0].name, "Fun");

  db.close();
});

test("income sources are reused instead of duplicated", async () => {
  const db = await freshDb();

  const first = await ensureIncomeSource(db, "Salary", "income");
  const second = await ensureIncomeSource(db, " salary ", "income");

  assert.equal(first.id, second.id);
  assert.equal((await listIncomeSources(db)).length, 1);

  db.close();
});
