import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCategoryMonths,
  contributionPerPeriod,
  monthKeysSpanning,
  periodsUntil,
  savingsEventsFrom,
  statesForMonth,
} from "../lib/budget.ts";
import { buildSavingsHistory } from "../lib/savings-history.ts";

test("the month range is continuous even where nothing happened", () => {
  assert.deepEqual(monthKeysSpanning(["2026-05", "2026-08"], "2026-09"), [
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
    "2026-09",
  ]);

  // Без данных остаётся один текущий месяц.
  assert.deepEqual(monthKeysSpanning([], "2026-08"), ["2026-08"]);
});

test("unspent money rolls into the next month", () => {
  const states = buildCategoryMonths(
    [
      { monthKey: "2026-07", categoryId: "c-1", assigned: 500 },
      { monthKey: "2026-08", categoryId: "c-1", assigned: 500 },
    ],
    [{ date: "2026-07-10", amount: -400, categoryId: "c-1" }],
    "2026-08",
  );

  const july = statesForMonth(states, "2026-07").get("c-1");
  const august = statesForMonth(states, "2026-08").get("c-1");

  assert.deepEqual(july, {
    monthKey: "2026-07",
    categoryId: "c-1",
    carriedIn: 0,
    assigned: 500,
    spent: 400,
    available: 100,
  });
  assert.equal(august.carriedIn, 100);
  assert.equal(august.available, 600);
});

test("overspending carries into the next month as a negative balance", () => {
  const states = buildCategoryMonths(
    [
      { monthKey: "2026-07", categoryId: "c-1", assigned: 120 },
      { monthKey: "2026-08", categoryId: "c-1", assigned: 120 },
    ],
    [{ date: "2026-07-10", amount: -148.5, categoryId: "c-1" }],
    "2026-08",
  );

  assert.equal(statesForMonth(states, "2026-07").get("c-1").available, -28.5);
  assert.equal(statesForMonth(states, "2026-08").get("c-1").carriedIn, -28.5);
  assert.equal(statesForMonth(states, "2026-08").get("c-1").available, 91.5);
});

test("an empty month still passes the balance along", () => {
  const states = buildCategoryMonths(
    [{ monthKey: "2026-06", categoryId: "c-1", assigned: 300 }],
    [],
    "2026-09",
  );

  assert.equal(statesForMonth(states, "2026-07").get("c-1").carriedIn, 300);
  assert.equal(statesForMonth(states, "2026-08").get("c-1").available, 300);
  assert.equal(statesForMonth(states, "2026-09").get("c-1").available, 300);
});

test("income and uncategorised money do not belong to any category", () => {
  const states = buildCategoryMonths(
    [{ monthKey: "2026-08", categoryId: "c-1", assigned: 100 }],
    [
      { date: "2026-08-01", amount: 3200, categoryId: null },
      { date: "2026-08-01", amount: 500, categoryId: "c-1" },
      { date: "2026-08-02", amount: -20, categoryId: null },
    ],
    "2026-08",
  );

  const august = statesForMonth(states, "2026-08").get("c-1");
  assert.equal(august.spent, 0);
  assert.equal(august.available, 100);
});

test("savings history is derived from allocations without a second ledger", () => {
  const allocations = [
    { monthKey: "2026-06", categoryId: "c-trip", assigned: 100 },
    { monthKey: "2026-07", categoryId: "c-trip", assigned: 50 },
    { monthKey: "2026-07", categoryId: "c-rent", assigned: 1450 },
  ];
  const transactions = [{ date: "2026-08-03", amount: -30, categoryId: "c-trip" }];

  const events = savingsEventsFrom(allocations, transactions, new Set(["c-trip"]));
  const history = buildSavingsHistory(events, "2026-08");

  assert.deepEqual(
    history.map((point) => [point.key, point.balance]),
    [
      ["2026-06", 100],
      ["2026-07", 150],
      ["2026-08", 120],
    ],
  );
});

test("the savings balance matches what the category actually holds", () => {
  const allocations = [
    { monthKey: "2026-07", categoryId: "c-trip", assigned: 200 },
    { monthKey: "2026-08", categoryId: "c-trip", assigned: 80 },
  ];
  const transactions = [{ date: "2026-08-03", amount: -30, categoryId: "c-trip" }];

  const states = buildCategoryMonths(allocations, transactions, "2026-08");
  const available = statesForMonth(states, "2026-08").get("c-trip").available;

  const history = buildSavingsHistory(
    savingsEventsFrom(allocations, transactions, new Set(["c-trip"])),
    "2026-08",
  );

  assert.equal(available, 250);
  assert.equal(history[history.length - 1].balance, available);
});

test("periods until the goal date never drop below one", () => {
  assert.equal(periodsUntil("2026-08-15", "2027-06-15", "monthly"), 10);
  assert.equal(periodsUntil("2026-08-15", "2026-08-30", "monthly"), 1);
  assert.equal(periodsUntil("2026-08-15", "2026-06-01", "monthly"), 1);
  assert.equal(periodsUntil("2026-08-01", "2026-08-29", "weekly"), 4);
});

test("the contribution covers what is still missing", () => {
  const goal = { targetAmount: 2000, targetDate: "2027-06-01", cadence: "monthly" };

  assert.equal(contributionPerPeriod(goal, 1000, "2026-08-01"), 100);
  // Округляем вверх: делённая до цента сумма не должна не доехать до цели.
  assert.equal(contributionPerPeriod(goal, 0, "2026-12-01"), 333.34);
  // Цель уже достигнута — обещать нечего.
  assert.equal(contributionPerPeriod(goal, 2000, "2026-08-01"), null);
  assert.equal(
    contributionPerPeriod({ targetAmount: 2000, targetDate: null, cadence: null }, 0, "2026-08-01"),
    null,
  );
  assert.equal(
    contributionPerPeriod({ targetAmount: null, targetDate: null, cadence: null }, 0, "2026-08-01"),
    null,
  );
});
