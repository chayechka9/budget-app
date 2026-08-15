/**
 * Расчёты бюджета: перенос остатка между месяцами и цели накопления.
 *
 * Модуль намеренно ничего не знает ни про SQLite, ни про React: на вход —
 * раскладка по месяцам и транзакции, на выход — числа. Так эти правила можно
 * проверить тестами целиком, а не через экран.
 */

import { monthKeyOf } from "./dates.ts";
import type { SavingsEvent } from "./savings-history.ts";

export interface AllocationLike {
  monthKey: string;
  categoryId: string;
  assigned: number;
}

export interface SpendingLike {
  date: string;
  amount: number;
  categoryId: string | null;
}

/** Состояние одной категории в одном месяце. */
export interface CategoryMonthState {
  monthKey: string;
  categoryId: string;
  /** Остаток, перенесённый из прошлого месяца. Может быть отрицательным. */
  carriedIn: number;
  /** Разложено в этом месяце. */
  assigned: number;
  /** Потрачено в этом месяце, положительное число. */
  spent: number;
  /** Сколько осталось: `carriedIn + assigned - spent`. */
  available: number;
}

function nextMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Непрерывный ряд месяцев от самого раннего события до `throughMonth`.
 *
 * Непрерывный — принципиально: перенос остатка идёт по цепочке, и месяц, в
 * котором ничего не происходило, всё равно обязан передать остаток дальше.
 */
export function monthKeysSpanning(keys: string[], throughMonth: string): string[] {
  const known = keys.filter((key) => key.length === 7).sort();
  const first = known[0] ?? throughMonth;
  const last = known[known.length - 1] ?? throughMonth;
  const end = last > throughMonth ? last : throughMonth;

  const months: string[] = [];
  let cursor = first < end ? first : end;
  while (cursor <= end) {
    months.push(cursor);
    cursor = nextMonthKey(cursor);
  }
  return months;
}

/**
 * Раскладывает историю по месяцам и категориям, протягивая остаток вперёд.
 *
 * Переносится и минус: если в категории потратили больше, чем разложили,
 * следующий месяц начинается с долга. Это осознанное решение по продукту —
 * иначе перерасход растворялся бы, а сумма категорий переставала сходиться с
 * общим балансом.
 */
export function buildCategoryMonths(
  allocations: AllocationLike[],
  transactions: SpendingLike[],
  throughMonth: string,
): CategoryMonthState[] {
  const assignedBy = new Map<string, number>();
  const spentBy = new Map<string, number>();
  const categoryIds = new Set<string>();
  const monthKeys: string[] = [];

  const cell = (monthKey: string, categoryId: string) => `${monthKey}|${categoryId}`;

  for (const allocation of allocations) {
    const key = cell(allocation.monthKey, allocation.categoryId);
    assignedBy.set(key, (assignedBy.get(key) ?? 0) + allocation.assigned);
    categoryIds.add(allocation.categoryId);
    monthKeys.push(allocation.monthKey);
  }

  for (const transaction of transactions) {
    // Доход и стартовый баланс не принадлежат категории: они пополняют пул
    // нераспределённых денег, а не чью-то месячную сумму.
    if (!transaction.categoryId || transaction.amount >= 0) continue;
    const monthKey = monthKeyOf(transaction.date);
    const key = cell(monthKey, transaction.categoryId);
    spentBy.set(key, (spentBy.get(key) ?? 0) + Math.abs(transaction.amount));
    categoryIds.add(transaction.categoryId);
    monthKeys.push(monthKey);
  }

  const months = monthKeysSpanning(monthKeys, throughMonth);
  const states: CategoryMonthState[] = [];

  for (const categoryId of categoryIds) {
    let carriedIn = 0;
    for (const monthKey of months) {
      const key = cell(monthKey, categoryId);
      const assigned = assignedBy.get(key) ?? 0;
      const spent = spentBy.get(key) ?? 0;
      const available = carriedIn + assigned - spent;

      states.push({ monthKey, categoryId, carriedIn, assigned, spent, available });
      carriedIn = available;
    }
  }

  return states;
}

/** Срез одного месяца: категория → её состояние. */
export function statesForMonth(
  states: CategoryMonthState[],
  monthKey: string,
): Map<string, CategoryMonthState> {
  const byCategory = new Map<string, CategoryMonthState>();
  for (const state of states) {
    if (state.monthKey === monthKey) byCategory.set(state.categoryId, state);
  }
  return byCategory;
}

/**
 * Помесячные операции накопления, выведенные из раскладки и трат.
 *
 * Отдельной таблицы событий нет намеренно: деньги попадают в savings-категорию
 * тем же способом, что и в обычную, и вторая копия тех же сумм неизбежно
 * разошлась бы с первой. Формат совпадает с тем, что ждёт `savings-history`,
 * поэтому графики Insights считаются ровно как раньше.
 */
export function savingsEventsFrom(
  allocations: AllocationLike[],
  transactions: SpendingLike[],
  savingsCategoryIds: Set<string>,
): SavingsEvent[] {
  const events: SavingsEvent[] = [];

  for (const allocation of allocations) {
    if (!savingsCategoryIds.has(allocation.categoryId) || allocation.assigned === 0) continue;
    events.push({
      id: `assigned-${allocation.monthKey}-${allocation.categoryId}`,
      categoryId: allocation.categoryId,
      amount: allocation.assigned,
      date: `${allocation.monthKey}-01`,
    });
  }

  // Трата из накопления уменьшает его — иначе история копила бы деньги,
  // которых на категории уже нет.
  for (const transaction of transactions) {
    if (!transaction.categoryId || transaction.amount >= 0) continue;
    if (!savingsCategoryIds.has(transaction.categoryId)) continue;
    events.push({
      id: `spent-${transaction.date}-${transaction.categoryId}-${events.length}`,
      categoryId: transaction.categoryId,
      amount: transaction.amount,
      date: transaction.date,
    });
  }

  return events;
}

/** Сколько недель или месяцев осталось до даты цели, минимум один период. */
export function periodsUntil(
  from: string,
  until: string,
  cadence: "weekly" | "monthly",
): number {
  if (cadence === "monthly") {
    const [fromYear, fromMonth] = from.split("-").map(Number);
    const [untilYear, untilMonth] = until.split("-").map(Number);
    const months = (untilYear - fromYear) * 12 + (untilMonth - fromMonth);
    return Math.max(1, months);
  }

  const start = new Date(from);
  const end = new Date(until);
  const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, Math.ceil(days / 7));
}

/**
 * Сколько нужно откладывать, чтобы успеть к дате.
 *
 * Приложение только считает: денег оно не переводит, бюджет не меняет и не
 * рассуждает, на чём сэкономить. Цель уже достигнута или у неё нет даты —
 * возвращаем null, и экран ничего не обещает.
 */
export function contributionPerPeriod(
  goal: { targetAmount: number | null; targetDate: string | null; cadence: "weekly" | "monthly" | null },
  saved: number,
  today: string,
): number | null {
  if (!goal.targetAmount || !goal.targetDate) return null;

  const remaining = goal.targetAmount - saved;
  if (remaining <= 0) return null;

  const periods = periodsUntil(today, goal.targetDate, goal.cadence ?? "monthly");
  return Math.ceil((remaining / periods) * 100) / 100;
}
