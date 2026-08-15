import assert from "node:assert/strict";
import test from "node:test";

import { migrate } from "../lib/db/migrations.ts";
import {
  addAssigned,
  ensureMonth,
  listAllocations,
  listMonths,
  setAssigned,
} from "../lib/db/repositories/budget.ts";
import { insertCategory, insertGroup, updateCategory } from "../lib/db/repositories/categories.ts";
import { ensureIncomeSource } from "../lib/db/repositories/income-sources.ts";
import {
  deleteSavingsGoal,
  goalKindFor,
  listSavingsGoals,
  upsertSavingsGoal,
} from "../lib/db/repositories/savings-goals.ts";
import {
  findTransaction,
  insertTransaction,
  listTransactions,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
} from "../lib/db/repositories/transactions.ts";
import { createTestDb } from "./helpers/test-db.mjs";

async function fixture() {
  const db = createTestDb();
  await migrate(db);

  const group = await insertGroup(db, { name: "Essentials" });
  const groceries = await insertCategory(db, {
    groupId: group.id,
    name: "Groceries",
    kind: "fixed",
    icon: "groceries",
  });
  const trip = await insertCategory(db, {
    groupId: group.id,
    name: "Summer trip",
    kind: "savings",
    icon: "trip",
  });
  const salary = await ensureIncomeSource(db, "Salary", "income");

  return { db, group, groceries, trip, salary };
}

test("an expense is stored as a negative amount, income as a positive one", async () => {
  const { db, groceries, salary } = await fixture();

  await insertTransaction(db, {
    type: "expense",
    amount: 42.18,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "Tesco",
    date: "2026-08-02",
  });
  await insertTransaction(db, {
    type: "income",
    amount: 3200,
    categoryId: null,
    incomeSourceId: salary.id,
    note: "",
    date: "2026-08-01",
  });

  const [expense, income] = await listTransactions(db);
  assert.equal(expense.amount, -42.18);
  assert.equal(income.amount, 3200);

  db.close();
});

test("the row label falls back from note to category name", async () => {
  const { db, groceries, salary } = await fixture();

  const withNote = await insertTransaction(db, {
    type: "expense",
    amount: 10,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "Tesco",
    date: "2026-08-02",
  });
  const withoutNote = await insertTransaction(db, {
    type: "expense",
    amount: 10,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "",
    date: "2026-08-02",
  });
  const incomeId = await insertTransaction(db, {
    type: "income",
    amount: 3200,
    categoryId: null,
    incomeSourceId: salary.id,
    note: "",
    date: "2026-08-01",
  });
  const startingId = await insertTransaction(db, {
    type: "starting_balance",
    amount: 500,
    categoryId: null,
    incomeSourceId: null,
    note: "",
    date: "2026-08-01",
  });

  assert.equal((await findTransaction(db, withNote)).payee, "Tesco");
  assert.equal((await findTransaction(db, withoutNote)).payee, "Groceries");
  assert.equal((await findTransaction(db, withoutNote)).category, "Groceries");
  assert.equal((await findTransaction(db, incomeId)).payee, "Salary");
  assert.equal((await findTransaction(db, incomeId)).category, "Income");
  assert.equal((await findTransaction(db, startingId)).payee, "Starting balance");
  assert.equal((await findTransaction(db, startingId)).category, "Starting balance");

  db.close();
});

test("renaming a category renames the label of a note-less expense", async () => {
  const { db, group, groceries } = await fixture();

  const id = await insertTransaction(db, {
    type: "expense",
    amount: 10,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "",
    date: "2026-08-02",
  });

  await updateCategory(db, groceries.id, {
    groupId: group.id,
    name: "Food",
    kind: "fixed",
    icon: "groceries",
  });

  assert.equal((await findTransaction(db, id)).payee, "Food");

  db.close();
});

test("deleting hides the transaction but keeps it for undo", async () => {
  const { db, groceries } = await fixture();

  const id = await insertTransaction(db, {
    type: "expense",
    amount: 42.18,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "Tesco",
    date: "2026-08-02",
  });

  await softDeleteTransaction(db, id);
  assert.equal((await listTransactions(db)).length, 0);

  const stillThere = await db.getFirstAsync("SELECT id, deleted_at FROM transactions WHERE id = ?", [id]);
  assert.ok(stillThere.deleted_at);

  await restoreTransaction(db, id);
  const restored = await listTransactions(db);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].amount, -42.18);
  assert.equal(restored[0].payee, "Tesco");

  db.close();
});

test("editing rewrites the record and keeps its id and creation time", async () => {
  const { db, groceries, trip } = await fixture();

  const id = await insertTransaction(db, {
    type: "expense",
    amount: 42.18,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "Tesco",
    date: "2026-08-02",
  });
  const before = await findTransaction(db, id);

  await updateTransaction(db, id, {
    type: "expense",
    amount: 15,
    categoryId: trip.id,
    incomeSourceId: null,
    note: "Ticket",
    date: "2026-08-03",
  });
  const after = await findTransaction(db, id);

  assert.equal(after.id, before.id);
  assert.equal(after.createdAt, before.createdAt);
  assert.equal(after.amount, -15);
  assert.equal(after.categoryId, trip.id);
  assert.equal(after.date, "2026-08-03");

  db.close();
});

test("newest transactions come first, ties broken by entry order", async () => {
  const { db, groceries } = await fixture();

  const older = await insertTransaction(db, {
    type: "expense",
    amount: 1,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "first",
    date: "2026-08-02",
  });
  const newer = await insertTransaction(db, {
    type: "expense",
    amount: 2,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "second",
    date: "2026-08-02",
  });
  await insertTransaction(db, {
    type: "expense",
    amount: 3,
    categoryId: groceries.id,
    incomeSourceId: null,
    note: "yesterday",
    date: "2026-08-01",
  });

  const list = await listTransactions(db);
  assert.deepEqual(
    list.map((item) => item.note),
    ["second", "first", "yesterday"],
  );
  assert.ok(list[0].id === newer && list[1].id === older);

  db.close();
});

test("assigning adds up within a month and stays separate between months", async () => {
  const { db, groceries } = await fixture();

  await addAssigned(db, "2026-08", groceries.id, 300);
  await addAssigned(db, "2026-08", groceries.id, 200);
  await addAssigned(db, "2026-09", groceries.id, 100);

  const allocations = await listAllocations(db);
  assert.deepEqual(
    allocations.map((item) => [item.monthKey, item.assigned]),
    [
      ["2026-08", 500],
      ["2026-09", 100],
    ],
  );

  // Поле суммы в форме категории задаёт план целиком, а не прибавляет.
  await setAssigned(db, "2026-08", groceries.id, 450);
  const updated = await listAllocations(db);
  assert.equal(updated[0].assigned, 450);

  db.close();
});

test("a budget month is created once and keeps its start date", async () => {
  const { db } = await fixture();

  const first = await ensureMonth(db, "2026-08");
  const second = await ensureMonth(db, "2026-08", 15);

  assert.equal(first.id, second.id);
  assert.equal(second.startsOn, "2026-08-01");
  assert.equal((await listMonths(db)).length, 1);

  db.close();
});

test("goal kind follows the fields the user filled in", async () => {
  assert.equal(goalKindFor(2000, "2027-06-01"), "target_date");
  assert.equal(goalKindFor(2000, null), "target");
  assert.equal(goalKindFor(null, null), "open");
  // Дата без суммы целью не является: копить не к чему.
  assert.equal(goalKindFor(null, "2027-06-01"), "open");
});

test("a savings goal is stored per category and replaced on edit", async () => {
  const { db, trip } = await fixture();

  await upsertSavingsGoal(db, trip.id, {
    targetAmount: 2000,
    targetDate: "2027-06-01",
    cadence: "weekly",
  });
  let [goal] = await listSavingsGoals(db);
  assert.equal(goal.kind, "target_date");
  assert.equal(goal.cadence, "weekly");

  // Дата снята — остаётся цель по сумме, а ритм взносов теряет смысл.
  await upsertSavingsGoal(db, trip.id, {
    targetAmount: 2000,
    targetDate: null,
    cadence: "weekly",
  });
  [goal] = await listSavingsGoals(db);
  assert.equal(goal.kind, "target");
  assert.equal(goal.targetDate, null);
  assert.equal(goal.cadence, null);
  assert.equal((await listSavingsGoals(db)).length, 1);

  await upsertSavingsGoal(db, trip.id, {
    targetAmount: null,
    targetDate: null,
    cadence: null,
  });
  [goal] = await listSavingsGoals(db);
  assert.equal(goal.kind, "open");
  assert.equal(goal.targetAmount, null);

  await deleteSavingsGoal(db, trip.id);
  assert.equal((await listSavingsGoals(db)).length, 0);

  db.close();
});
