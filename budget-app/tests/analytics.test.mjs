import assert from "node:assert/strict";
import test from "node:test";

import {
  bucketsFor,
  categoryBreakdown,
  resolveWindow,
  savingsHistoryForBuckets,
  spentByCategoryIn,
} from "../lib/analytics.ts";
import { buildSavingsHistory } from "../lib/savings-history.ts";

function dateInMonth(offset, day = 1) {
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth() + offset, day);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateOfMonth = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dateOfMonth}`;
}

function monthKey(offset) {
  return dateInMonth(offset).slice(0, 7);
}

const transaction = (date, amount, category) => ({ date, amount, category });

test("bucketsFor fills monthly buckets and aggregates income, spending, and net", () => {
  const buckets = bucketsFor(
    [
      transaction(dateInMonth(-3, 15), -999, "Outside window"),
      transaction(dateInMonth(-2, 15), -40, "Transport"),
      transaction(dateInMonth(-1, 15), 300, "Income"),
      transaction(dateInMonth(-1, 16), -80, "Groceries"),
      transaction(dateInMonth(0), 500, "Income"),
      transaction(dateInMonth(0), -125, "Rent"),
      transaction(dateInMonth(0), -25, "Groceries"),
    ],
    { kind: "preset", count: 3 },
  );

  assert.deepEqual(
    buckets.map(({ key, income, spent, net, isCurrent }) => ({
      key,
      income,
      spent,
      net,
      isCurrent,
    })),
    [
      { key: monthKey(-2), income: 0, spent: 40, net: -40, isCurrent: false },
      { key: monthKey(-1), income: 300, spent: 80, net: 220, isCurrent: false },
      { key: monthKey(0), income: 500, spent: 150, net: 350, isCurrent: true },
    ],
  );
});

test("category totals include expenses only and categoryBreakdown sorts and limits", () => {
  const currentMonth = monthKey(0);
  const transactions = [
    transaction(dateInMonth(0), -40, "Groceries"),
    transaction(dateInMonth(0), -20, "Groceries"),
    transaction(dateInMonth(0), -25, "Transport"),
    transaction(dateInMonth(0), -10, "Eating out"),
    transaction(dateInMonth(0), 500, "Groceries"),
    transaction(dateInMonth(-1, 15), -100, "Groceries"),
  ];

  assert.deepEqual(spentByCategoryIn(transactions, currentMonth), {
    Groceries: 60,
    Transport: 25,
    "Eating out": 10,
  });

  const currentBucket = bucketsFor(transactions, { kind: "preset", count: 3 }).at(-1);
  assert.ok(currentBucket);
  assert.deepEqual(categoryBreakdown(transactions, currentBucket, 2), [
    { name: "Groceries", amount: 60 },
    { name: "Transport", amount: 25 },
  ]);
});

test("preset periods cover 3, 6, and 12 months while All time starts at first data", () => {
  for (const count of [3, 6, 12]) {
    const buckets = bucketsFor([], { kind: "preset", count });
    assert.equal(buckets.length, count);
    assert.equal(buckets[0].key, monthKey(-(count - 1)));
    assert.equal(buckets.at(-1).key, monthKey(0));
  }

  const firstDate = dateInMonth(-14, 12);
  const allTime = bucketsFor(
    [transaction(firstDate, -10, "Groceries")],
    { kind: "preset", count: 0 },
  );
  assert.equal(allTime[0].key, monthKey(-14));
  assert.equal(allTime.at(-1).key, monthKey(0));

  const threeMonthWindow = resolveWindow([], { kind: "preset", count: 3 });
  assert.equal(threeMonthWindow.from, dateInMonth(-2));
  assert.equal(threeMonthWindow.to, dateInMonth(0, new Date().getDate()));
  assert.equal(
    resolveWindow([transaction(firstDate, -10, "Groceries")], {
      kind: "preset",
      count: 0,
    }).from,
    firstDate,
  );
});

test("empty analytics data produces zero buckets and empty category and savings totals", () => {
  const buckets = bucketsFor([], { kind: "preset", count: 3 });
  const allTime = bucketsFor([], { kind: "preset", count: 0 });

  assert.equal(buckets.length, 3);
  assert.ok(buckets.every(({ income, spent, net }) => income === 0 && spent === 0 && net === 0));
  assert.equal(allTime.length, 1);
  assert.equal(allTime[0].key, monthKey(0));
  assert.deepEqual(
    { income: allTime[0].income, spent: allTime[0].spent, net: allTime[0].net },
    { income: 0, spent: 0, net: 0 },
  );
  assert.deepEqual(spentByCategoryIn([], monthKey(0)), {});
  assert.deepEqual(categoryBreakdown([], buckets.at(-1), 3), []);
  assert.deepEqual(savingsHistoryForBuckets([], buckets), []);
});

test("switching savings period only filters existing history points", () => {
  const events = [
    { id: "1", categoryId: "emergency", amount: 100, date: dateInMonth(-5, 2) },
    { id: "2", categoryId: "emergency", amount: 20, date: dateInMonth(-3, 2) },
    { id: "3", categoryId: "trip", amount: 30, date: dateInMonth(-1, 2) },
    { id: "4", categoryId: "trip", amount: 40, date: dateInMonth(0) },
  ];
  const history = buildSavingsHistory(events, monthKey(0));
  const sixMonths = savingsHistoryForBuckets(
    history,
    bucketsFor([], { kind: "preset", count: 6 }),
  );
  const threeMonths = savingsHistoryForBuckets(
    history,
    bucketsFor([], { kind: "preset", count: 3 }),
  );

  assert.deepEqual(threeMonths, sixMonths.slice(-3));
  assert.deepEqual(
    threeMonths.map(({ balance, change }) => ({ balance, change })),
    [
      { balance: 120, change: 0 },
      { balance: 150, change: 30 },
      { balance: 190, change: 40 },
    ],
  );
});

test("a starting balance is not income of its month", () => {
  const transactions = [
    { date: `${monthKey(0)}-01`, amount: 500, category: "Starting balance", type: "starting_balance" },
    { date: `${monthKey(0)}-02`, amount: 3200, category: "Income", type: "income" },
    { date: `${monthKey(0)}-03`, amount: -50, category: "Groceries", type: "expense" },
  ];

  const [bucket] = bucketsFor(transactions, { kind: "preset", count: 1 });

  assert.equal(bucket.income, 3200);
  assert.equal(bucket.spent, 50);
  assert.equal(bucket.net, 3150);
});
