import assert from "node:assert/strict";
import test from "node:test";

import {
  aggregateSavingsEvents,
  buildSavingsHistory,
  savingsBalanceByCategory,
  savingsEventsForAssignment,
  savingsHistoryForMonths,
  totalSavingsBalance,
} from "../lib/savings-history.ts";

const event = (id, categoryId, amount, date) => ({ id, categoryId, amount, date });

test("aggregates savings events by YYYY-MM", () => {
  const totals = aggregateSavingsEvents([
    event("3", "trip", 25, "2026-02-20"),
    event("1", "emergency", 100, "2026-01-02"),
    event("2", "emergency", 40, "2026-01-28"),
    event("4", "trip", -5, "2026-02-21"),
  ]);

  assert.deepEqual(totals, [
    { key: "2026-01", amount: 140 },
    { key: "2026-02", amount: 20 },
  ]);
});

test("builds cumulative balances for every calendar month", () => {
  const history = buildSavingsHistory(
    [
      event("1", "emergency", 100, "2026-01-02"),
      event("2", "trip", 50, "2026-03-10"),
    ],
    "2026-04",
  );

  assert.deepEqual(history, [
    { key: "2026-01", balance: 100, change: 100 },
    { key: "2026-02", balance: 100, change: 0 },
    { key: "2026-03", balance: 150, change: 50 },
    { key: "2026-04", balance: 150, change: 0 },
  ]);
});

test("change is the difference from the previous factual monthly balance", () => {
  const history = buildSavingsHistory([
    event("1", "emergency", 100, "2026-01-02"),
    event("2", "emergency", -30, "2026-02-02"),
    event("3", "emergency", 10, "2026-02-12"),
  ]);

  assert.deepEqual(history.map(({ balance, change }) => ({ balance, change })), [
    { balance: 100, change: 100 },
    { balance: 80, change: -20 },
  ]);
});

test("empty savings history stays empty", () => {
  assert.deepEqual(aggregateSavingsEvents([]), []);
  assert.deepEqual(buildSavingsHistory([], "2026-08"), []);
  assert.deepEqual(savingsHistoryForMonths([], ["2026-08"]), []);
});

test("changing period only filters already calculated monthly values", () => {
  const history = buildSavingsHistory(
    [
      event("1", "emergency", 100, "2026-01-02"),
      event("2", "emergency", 20, "2026-02-02"),
      event("3", "emergency", 30, "2026-04-02"),
      event("4", "emergency", 40, "2026-06-02"),
    ],
    "2026-06",
  );
  const sixMonths = savingsHistoryForMonths(history, [
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
  ]);
  const threeMonths = savingsHistoryForMonths(history, [
    "2026-04", "2026-05", "2026-06",
  ]);

  assert.deepEqual(threeMonths, sixMonths.slice(-3));
  assert.equal(threeMonths[0].balance, 150);
  assert.equal(threeMonths[0].change, 30);
});

test("last history point equals the current savings-category balance", () => {
  const events = [
    event("1", "emergency", 100, "2026-01-02"),
    event("2", "trip", 50, "2026-02-02"),
    event("3", "emergency", 25, "2026-03-02"),
  ];
  const history = buildSavingsHistory(events, "2026-03");
  const byCategory = savingsBalanceByCategory(events);
  const categoryTotal = Object.values(byCategory).reduce((sum, amount) => sum + amount, 0);

  assert.equal(history.at(-1).balance, categoryTotal);
  assert.equal(history.at(-1).balance, totalSavingsBalance(events));
});

test("assignment creates events only for savings categories in the current month", () => {
  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const events = savingsEventsForAssignment(
    { fixed: 20, emergency: 75, trip: 0, missing: 10 },
    [
      { id: "fixed", kind: "fixed" },
      { id: "emergency", kind: "savings" },
      { id: "trip", kind: "savings" },
    ],
    4,
  );

  assert.equal(events.length, 1);
  assert.equal(events[0].categoryId, "emergency");
  assert.equal(events[0].amount, 75);
  assert.equal(events[0].date.slice(0, 7), currentMonth);
});
