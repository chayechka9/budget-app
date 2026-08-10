/** Фактическое пополнение или уменьшение savings-категории. */
export interface SavingsEvent {
  id: string;
  categoryId: string;
  /** Положительное значение пополняет накопления, отрицательное уменьшает. */
  amount: number;
  /** ISO-дата операции: YYYY-MM-DD. */
  date: string;
}

export interface SavingsMonthTotal {
  key: string;
  amount: number;
}

export interface SavingsMonthBalance {
  key: string;
  balance: number;
  /** Разница с балансом предыдущего календарного месяца. */
  change: number;
}

interface SavingsCategoryRef {
  id: string;
  kind: "fixed" | "savings";
}

const MONTH_KEY = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-\d{2}$/;

function monthKeyOfEvent(event: SavingsEvent): string | null {
  if (!ISO_DATE.test(event.date)) return null;
  return event.date.slice(0, 7);
}

function nextMonth(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function localTodayIso(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

/** Сумма фактических savings-операций в каждом месяце, от старых к новым. */
export function aggregateSavingsEvents(events: SavingsEvent[]): SavingsMonthTotal[] {
  const totals = new Map<string, number>();

  for (const event of events) {
    const key = monthKeyOfEvent(event);
    if (!key || !Number.isFinite(event.amount)) continue;
    totals.set(key, (totals.get(key) ?? 0) + event.amount);
  }

  return [...totals]
    .map(([key, amount]) => ({ key, amount }))
    .sort((first, second) => first.key.localeCompare(second.key));
}

/**
 * Полная помесячная история баланса. Она рассчитывается один раз по всем
 * операциям; выбранный период потом только отбирает готовые точки.
 */
export function buildSavingsHistory(
  events: SavingsEvent[],
  throughMonth?: string,
): SavingsMonthBalance[] {
  const monthly = aggregateSavingsEvents(events);
  if (monthly.length === 0) return [];

  const amountByMonth = new Map(monthly.map((month) => [month.key, month.amount]));
  const lastEventMonth = monthly[monthly.length - 1].key;
  const lastMonth =
    throughMonth && MONTH_KEY.test(throughMonth) && throughMonth > lastEventMonth
      ? throughMonth
      : lastEventMonth;

  const history: SavingsMonthBalance[] = [];
  let balance = 0;
  let key = monthly[0].key;

  while (key <= lastMonth) {
    const change = amountByMonth.get(key) ?? 0;
    balance += change;
    history.push({ key, balance, change });
    key = nextMonth(key);
  }

  return history;
}

/** Баланс по каждой savings-категории из тех же фактических операций. */
export function savingsBalanceByCategory(
  events: SavingsEvent[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const event of events) {
    if (!Number.isFinite(event.amount)) continue;
    balances[event.categoryId] = (balances[event.categoryId] ?? 0) + event.amount;
  }
  return balances;
}

export function totalSavingsBalance(events: SavingsEvent[]): number {
  return events.reduce(
    (total, event) => total + (Number.isFinite(event.amount) ? event.amount : 0),
    0,
  );
}

/**
 * Выбирает месяцы для графика, не пересчитывая balance/change внутри окна.
 * До первой операции баланс равен нулю; после последней переносится вперёд.
 */
export function savingsHistoryForMonths(
  history: SavingsMonthBalance[],
  monthKeys: string[],
): SavingsMonthBalance[] {
  if (history.length === 0) return [];

  const byKey = new Map(history.map((point) => [point.key, point]));
  const firstKey = history[0].key;
  let latest: SavingsMonthBalance | null = null;
  let historyIndex = 0;

  return monthKeys.map((key) => {
    const exact = byKey.get(key);
    if (exact) return exact;

    while (historyIndex < history.length && history[historyIndex].key < key) {
      latest = history[historyIndex];
      historyIndex += 1;
    }

    return {
      key,
      balance: key < firstKey ? 0 : (latest?.balance ?? 0),
      change: 0,
    };
  });
}

/**
 * Создаёт savings-события из одного действия Assign. Дата по умолчанию —
 * сегодняшний день, поэтому операция всегда попадает в текущий месяц.
 */
export function savingsEventsForAssignment(
  amountByCategoryId: Record<string, number>,
  categories: SavingsCategoryRef[],
  startingIndex = 0,
  date = localTodayIso(),
): SavingsEvent[] {
  const savingsIds = new Set(
    categories.filter((category) => category.kind === "savings").map(({ id }) => id),
  );

  return Object.entries(amountByCategoryId).flatMap(([categoryId, amount], index) => {
    if (!savingsIds.has(categoryId) || !Number.isFinite(amount) || amount <= 0) return [];
    return [
      {
        id: `s-assign-${date}-${startingIndex + index + 1}-${categoryId}`,
        categoryId,
        amount,
        date,
      },
    ];
  });
}
