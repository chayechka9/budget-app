/**
 * Источники дохода.
 *
 * Раньше это был захардкоженный список в моках; роадмап требует, чтобы
 * пользователь мог заводить свои. Refund — обычный источник дохода: возврат
 * денег вводится именно так.
 */

import type { IconName } from "../../../components/Icon";
import { generateId } from "../../id.ts";
import type { IncomeSource } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso } from "./shared.ts";

interface IncomeSourceRow {
  id: string;
  name: string;
  icon: IconName;
  sort_order: number;
  archived_at: string | null;
}

function toIncomeSource(row: IncomeSourceRow): IncomeSource {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

export async function listIncomeSources(db: Db): Promise<IncomeSource[]> {
  const rows = await db.getAllAsync<IncomeSourceRow>(
    `SELECT id, name, icon, sort_order, archived_at FROM income_sources
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name`,
  );
  return rows.map(toIncomeSource);
}

export async function insertIncomeSource(
  db: Db,
  input: { name: string; icon: IconName; sortOrder?: number },
): Promise<IncomeSource> {
  const row = await db.getFirstAsync<{ next: number | null }>(
    `SELECT MAX(sort_order) + 1 AS next FROM income_sources`,
  );

  const source: IncomeSource = {
    id: generateId("is"),
    name: input.name,
    icon: input.icon,
    sortOrder: input.sortOrder ?? row?.next ?? 0,
    archivedAt: null,
  };
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO income_sources (id, name, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [source.id, source.name, source.icon, source.sortOrder, createdAt, updatedAt],
  );

  return source;
}

/**
 * Источник с таким названием или новый. Пользователь вводит источник текстом,
 * и «Salary» дважды не должно превратиться в два разных источника.
 */
export async function ensureIncomeSource(
  db: Db,
  name: string,
  icon: IconName,
): Promise<IncomeSource> {
  const existing = await db.getFirstAsync<IncomeSourceRow>(
    `SELECT id, name, icon, sort_order, archived_at FROM income_sources
     WHERE deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?))
     LIMIT 1`,
    [name],
  );
  if (existing) return toIncomeSource(existing);
  return insertIncomeSource(db, { name: name.trim(), icon });
}

export async function archiveIncomeSource(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE income_sources SET archived_at = ?, updated_at = ?
     WHERE id = ? AND archived_at IS NULL`,
    [nowIso(), nowIso(), id],
  );
}
