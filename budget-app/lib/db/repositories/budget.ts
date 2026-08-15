/**
 * Бюджетные месяцы и раскладка денег по категориям.
 *
 * Перенос остатка (rollover) здесь не хранится: он считается из этих же
 * аллокаций и транзакций в `lib/budget.ts`. Отдельная колонка с переносом
 * рано или поздно разошлась бы с фактом — достаточно задним числом поправить
 * одну трату в прошлом месяце.
 */

import { generateId } from "../../id.ts";
import type { BudgetAllocation, BudgetMonth } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso } from "./shared.ts";

interface MonthRow {
  id: string;
  month_key: string;
  starts_on: string;
  closed_at: string | null;
}

interface AllocationRow {
  id: string;
  month_key: string;
  category_id: string;
  assigned: number;
}

function toMonth(row: MonthRow): BudgetMonth {
  return {
    id: row.id,
    monthKey: row.month_key,
    startsOn: row.starts_on,
    closedAt: row.closed_at,
  };
}

function toAllocation(row: AllocationRow): BudgetAllocation {
  return {
    id: row.id,
    monthKey: row.month_key,
    categoryId: row.category_id,
    assigned: row.assigned,
  };
}

export async function listMonths(db: Db): Promise<BudgetMonth[]> {
  const rows = await db.getAllAsync<MonthRow>(
    `SELECT id, month_key, starts_on, closed_at FROM budget_months ORDER BY month_key`,
  );
  return rows.map(toMonth);
}

export async function listAllocations(db: Db): Promise<BudgetAllocation[]> {
  const rows = await db.getAllAsync<AllocationRow>(
    `SELECT id, month_key, category_id, assigned FROM budget_allocations
     ORDER BY month_key, category_id`,
  );
  return rows.map(toAllocation);
}

/**
 * Строка месяца, создаваемая при первом обращении.
 *
 * `starts_on` фиксируется в момент создания: день старта бюджетного месяца
 * можно поменять, и уже прожитые месяцы обязаны остаться с той границей, по
 * которой их считали.
 */
export async function ensureMonth(
  db: Db,
  monthKey: string,
  startDay = 1,
): Promise<BudgetMonth> {
  const existing = await db.getFirstAsync<MonthRow>(
    `SELECT id, month_key, starts_on, closed_at FROM budget_months WHERE month_key = ?`,
    [monthKey],
  );
  if (existing) return toMonth(existing);

  const month: BudgetMonth = {
    id: generateId("m"),
    monthKey,
    startsOn: `${monthKey}-${String(startDay).padStart(2, "0")}`,
    closedAt: null,
  };
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO budget_months (id, month_key, starts_on, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [month.id, month.monthKey, month.startsOn, createdAt, updatedAt],
  );

  return month;
}

/** Разложить сумму на категорию: прибавляется к тому, что уже разложено. */
export async function addAssigned(
  db: Db,
  monthKey: string,
  categoryId: string,
  amount: number,
): Promise<void> {
  await ensureMonth(db, monthKey);
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO budget_allocations (id, month_key, category_id, assigned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(month_key, category_id) DO UPDATE
       SET assigned = assigned + excluded.assigned, updated_at = excluded.updated_at`,
    [generateId("a"), monthKey, categoryId, amount, createdAt, updatedAt],
  );
}

/** Задать план месяца целиком — так работает поле суммы в форме категории. */
export async function setAssigned(
  db: Db,
  monthKey: string,
  categoryId: string,
  amount: number,
): Promise<void> {
  await ensureMonth(db, monthKey);
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO budget_allocations (id, month_key, category_id, assigned, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(month_key, category_id) DO UPDATE
       SET assigned = excluded.assigned, updated_at = excluded.updated_at`,
    [generateId("a"), monthKey, categoryId, amount, createdAt, updatedAt],
  );
}

export async function closeMonth(db: Db, monthKey: string): Promise<void> {
  await db.runAsync(
    `UPDATE budget_months SET closed_at = ?, updated_at = ? WHERE month_key = ? AND closed_at IS NULL`,
    [nowIso(), nowIso(), monthKey],
  );
}
