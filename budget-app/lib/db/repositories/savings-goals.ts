/**
 * Цели накопления.
 *
 * Три формы из роадмапа: цель по сумме, цель по сумме и дате, и бессрочное
 * накопление без конечной цели. Строка есть только у savings-категории;
 * приложение по цели ничего не переводит и бюджет само не меняет — оно лишь
 * считает, сколько нужно откладывать.
 */

import { generateId } from "../../id.ts";
import type { GoalCadence, SavingsGoal, SavingsGoalKind } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso, nullable } from "./shared.ts";

interface GoalRow {
  id: string;
  category_id: string;
  kind: SavingsGoalKind;
  target_amount: number | null;
  target_date: string | null;
  cadence: GoalCadence | null;
}

function toGoal(row: GoalRow): SavingsGoal {
  return {
    id: row.id,
    categoryId: row.category_id,
    kind: row.kind,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    cadence: row.cadence,
  };
}

export async function listSavingsGoals(db: Db): Promise<SavingsGoal[]> {
  const rows = await db.getAllAsync<GoalRow>(
    `SELECT id, category_id, kind, target_amount, target_date, cadence FROM savings_goals`,
  );
  return rows.map(toGoal);
}

/**
 * Вид цели выводится из заполненных полей, а не спрашивается отдельно: есть
 * сумма и дата — цель с датой, есть только сумма — цель по сумме, нет ничего —
 * бессрочное накопление.
 */
export function goalKindFor(
  targetAmount: number | null,
  targetDate: string | null,
): SavingsGoalKind {
  if (targetAmount === null || targetAmount <= 0) return "open";
  return targetDate ? "target_date" : "target";
}

export async function upsertSavingsGoal(
  db: Db,
  categoryId: string,
  input: {
    targetAmount: number | null;
    targetDate: string | null;
    cadence: GoalCadence | null;
  },
): Promise<void> {
  const kind = goalKindFor(input.targetAmount, input.targetDate);
  // Дата и ритм взносов имеют смысл только у цели с датой: без них строка
  // хранила бы условия расчёта, который ни на что не влияет.
  const targetDate = kind === "target_date" ? input.targetDate : null;
  const cadence = kind === "target_date" ? (input.cadence ?? "monthly") : null;
  const targetAmount = kind === "open" ? null : input.targetAmount;
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO savings_goals
       (id, category_id, kind, target_amount, target_date, cadence, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(category_id) DO UPDATE SET
       kind = excluded.kind,
       target_amount = excluded.target_amount,
       target_date = excluded.target_date,
       cadence = excluded.cadence,
       updated_at = excluded.updated_at`,
    [
      generateId("sg"),
      categoryId,
      kind,
      nullable(targetAmount),
      nullable(targetDate),
      nullable(cadence),
      createdAt,
      updatedAt,
    ],
  );
}

/** Цель уходит вместе с типом категории: у обычной категории её быть не может. */
export async function deleteSavingsGoal(db: Db, categoryId: string): Promise<void> {
  await db.runAsync(`DELETE FROM savings_goals WHERE category_id = ?`, [categoryId]);
}

export async function touchSavingsGoal(db: Db, categoryId: string): Promise<void> {
  await db.runAsync(`UPDATE savings_goals SET updated_at = ? WHERE category_id = ?`, [
    nowIso(),
    categoryId,
  ]);
}
