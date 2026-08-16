import assert from "node:assert/strict";
import test from "node:test";

import { onboardingWrites } from "../lib/onboarding.ts";

const NOTHING = { goal: null, goalText: null, startingBalance: null };

test("a chosen goal becomes a product event", () => {
  const writes = onboardingWrites({ ...NOTHING, goal: "understand" });

  assert.deepEqual(writes.event, {
    name: "onboarding_goal_selected",
    props: { goal: "understand" },
  });
});

test("the free text of Other travels with the choice", () => {
  const writes = onboardingWrites({
    goal: "other",
    goalText: "  Pay off my car loan  ",
    startingBalance: null,
  });

  assert.deepEqual(writes.event.props, { goal: "other", text: "Pay off my car loan" });
});

test("Other without any text is still an answer, just without the text", () => {
  const writes = onboardingWrites({ goal: "other", goalText: "   ", startingBalance: null });

  assert.deepEqual(writes.event.props, { goal: "other" });
});

test("free text on a preset goal is ignored", () => {
  // Поле «Other» с выбранным другим вариантом не показывается, но состояние
  // формы могло остаться от прошлого выбора — в событие оно попасть не должно.
  const writes = onboardingWrites({
    goal: "save",
    goalText: "left over from Other",
    startingBalance: null,
  });

  assert.deepEqual(writes.event.props, { goal: "save" });
});

test("a skipped goal step records nothing", () => {
  assert.equal(onboardingWrites(NOTHING).event, null);
});

test("a starting balance survives as an amount", () => {
  assert.equal(onboardingWrites({ ...NOTHING, startingBalance: 1240.5 }).startingBalance, 1240.5);
});

test("starting from zero creates no transaction", () => {
  assert.equal(onboardingWrites({ ...NOTHING, startingBalance: 0 }).startingBalance, null);
  assert.equal(onboardingWrites({ ...NOTHING, startingBalance: null }).startingBalance, null);
});

test("a negative or oversized balance is refused", () => {
  assert.equal(onboardingWrites({ ...NOTHING, startingBalance: -10 }).startingBalance, null);
  assert.equal(onboardingWrites({ ...NOTHING, startingBalance: 1e12 }).startingBalance, null);
});

test("the balance never leaks into the analytics event", () => {
  const writes = onboardingWrites({
    goal: "save",
    goalText: null,
    startingBalance: 8420.35,
  });

  assert.deepEqual(Object.keys(writes.event.props), ["goal"]);
  assert.ok(!JSON.stringify(writes.event.props).includes("8420"));
});
