/** Профиль пользователя — одна строка на всё локальное приложение. */

import { generateId } from "../../id.ts";
import type { Profile } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso } from "./shared.ts";

interface ProfileRow {
  id: string;
  currency: string;
  month_start_day: number;
  onboarded_at: string | null;
}

function toProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    currency: row.currency,
    monthStartDay: row.month_start_day,
    onboardedAt: row.onboarded_at,
  };
}

/**
 * Возвращает профиль, создавая его при первом запуске.
 *
 * Отдельного «аккаунта» в local-only версии нет, но строка нужна уже сейчас:
 * в ней живут валюта и день старта бюджетного месяца, а при переходе в
 * Supabase к ней добавится `user_id`.
 */
export async function ensureProfile(db: Db): Promise<Profile> {
  const existing = await db.getFirstAsync<ProfileRow>(
    `SELECT id, currency, month_start_day, onboarded_at FROM profile LIMIT 1`,
  );
  if (existing) return toProfile(existing);

  const profile: Profile = {
    id: generateId("p"),
    currency: "EUR",
    monthStartDay: 1,
    onboardedAt: null,
  };
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO profile (id, currency, month_start_day, onboarded_at, created_at, updated_at)
     VALUES (?, ?, ?, NULL, ?, ?)`,
    [profile.id, profile.currency, profile.monthStartDay, createdAt, updatedAt],
  );

  return profile;
}

export async function setMonthStartDay(db: Db, id: string, day: number): Promise<void> {
  await db.runAsync(
    `UPDATE profile SET month_start_day = ?, updated_at = ? WHERE id = ?`,
    [day, nowIso(), id],
  );
}

export async function markOnboarded(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE profile SET onboarded_at = ?, updated_at = ? WHERE id = ? AND onboarded_at IS NULL`,
    [nowIso(), nowIso(), id],
  );
}
