/**
 * Локальная очередь продуктовых событий.
 *
 * Не путать с `lib/analytics.ts` — тот считает траты для экрана Insights.
 * Здесь лежит то, что роадмап называет продуктовой аналитикой: факты действий
 * пользователя, которые уедут в PostHog, когда он появится.
 *
 * Правило из роадмапа зашито в тип `EventProps`: значением может быть только
 * строка или число, которое мы кладём осознанно. Сырые финансовые данные —
 * суммы, заметки, продавцы, список транзакций — сюда не попадают.
 */

import { generateId } from "../../id.ts";
import type { Db } from "../types.ts";
import { nowIso } from "./shared.ts";

export type EventProps = Record<string, string | number>;

/** Ответ на «What brings you here?» в онбординге. */
export const ONBOARDING_GOAL_EVENT = "onboarding_goal_selected";

export interface AnalyticsEvent {
  id: string;
  name: string;
  props: EventProps;
  createdAt: string;
}

interface AnalyticsEventRow {
  id: string;
  name: string;
  props: string;
  created_at: string;
}

export async function recordEvent(
  db: Db,
  name: string,
  props: EventProps = {},
): Promise<void> {
  await db.runAsync(
    `INSERT INTO analytics_events (id, name, props, created_at) VALUES (?, ?, ?, ?)`,
    [generateId("ev"), name, JSON.stringify(props), nowIso()],
  );
}

export async function listEvents(db: Db): Promise<AnalyticsEvent[]> {
  const rows = await db.getAllAsync<AnalyticsEventRow>(
    `SELECT id, name, props, created_at FROM analytics_events ORDER BY created_at, id`,
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    // Событие с испорченным JSON не должно ронять чтение: аналитика — не тот
    // повод, чтобы не открылось приложение.
    props: parseProps(row.props),
    createdAt: row.created_at,
  }));
}

function parseProps(raw: string): EventProps {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as EventProps;
  } catch {
    return {};
  }
}
