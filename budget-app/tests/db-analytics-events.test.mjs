import assert from "node:assert/strict";
import test from "node:test";

import { migrate } from "../lib/db/migrations.ts";
import {
  ONBOARDING_GOAL_EVENT,
  listEvents,
  recordEvent,
} from "../lib/db/repositories/analytics-events.ts";
import { createTestDb } from "./helpers/test-db.mjs";

async function freshDb() {
  const db = createTestDb();
  await migrate(db);
  return db;
}

test("an event keeps its name and properties", async () => {
  const db = await freshDb();

  await recordEvent(db, ONBOARDING_GOAL_EVENT, { goal: "understand" });

  const [event] = await listEvents(db);
  assert.equal(event.name, "onboarding_goal_selected");
  assert.deepEqual(event.props, { goal: "understand" });
  assert.ok(event.createdAt.length > 0);

  db.close();
});

test("the free-text goal from Other is stored next to the choice", async () => {
  const db = await freshDb();

  await recordEvent(db, ONBOARDING_GOAL_EVENT, {
    goal: "other",
    text: "Pay off my car loan",
  });

  const [event] = await listEvents(db);
  assert.deepEqual(event.props, { goal: "other", text: "Pay off my car loan" });

  db.close();
});

test("an event without properties reads back as an empty object", async () => {
  const db = await freshDb();

  await recordEvent(db, "onboarding_finished");

  const [event] = await listEvents(db);
  assert.deepEqual(event.props, {});

  db.close();
});

test("broken stored properties do not break reading", async () => {
  const db = await freshDb();

  // Строка могла испортиться при будущей миграции или ручной правке базы.
  // Аналитика — не тот повод, чтобы у пользователя не открылось приложение.
  await db.runAsync(
    "INSERT INTO analytics_events (id, name, props, created_at) VALUES (?, ?, ?, ?)",
    ["ev-broken", "onboarding_goal_selected", "{not json", "2026-08-16T10:00:00.000Z"],
  );

  const [event] = await listEvents(db);
  assert.deepEqual(event.props, {});

  db.close();
});

test("events come back in the order they happened", async () => {
  const db = await freshDb();

  for (const [index, goal] of ["understand", "save", "other"].entries()) {
    await db.runAsync(
      "INSERT INTO analytics_events (id, name, props, created_at) VALUES (?, ?, ?, ?)",
      [
        `ev-${index}`,
        ONBOARDING_GOAL_EVENT,
        JSON.stringify({ goal }),
        `2026-08-1${index}T10:00:00.000Z`,
      ],
    );
  }

  const events = await listEvents(db);
  assert.deepEqual(
    events.map((event) => event.props.goal),
    ["understand", "save", "other"],
  );

  db.close();
});
