/**
 * Агрегация транзакций по месяцам — общий слой для всех виджетов Insights.
 *
 * Здесь нет ни одного числа из макета: всё считается из тех же транзакций,
 * что показывают Home, Budget и Activity. Виджеты обязаны звать эти функции,
 * а не складывать суммы у себя — иначе три карточки на одном экране начнут
 * показывать разные итоги за один и тот же период.
 *
 * Модуль намеренно не зависит от `mock-data`: тот файл временный и уедет
 * вместе с появлением настоящего хранилища, а агрегация останется. Работает
 * с любым объектом, у которого есть дата, сумма со знаком и категория.
 */

import {
  MONTHS_LONG,
  MONTHS_SHORT,
  monthKeyOf,
  parseIsoDate,
  startOfToday,
  toIsoDate,
  todayIso,
} from "./dates.ts";
import {
  savingsHistoryForMonths,
  type SavingsMonthBalance,
} from "./savings-history.ts";

/** Минимум, который нужен агрегации. `amount` со знаком: минус — трата. */
export interface AnalyticsTransaction {
  date: string;
  amount: number;
  category: string;
  /**
   * Стартовый баланс приходит с плюсом, но доходом месяца не является: это
   * деньги, которые уже были. В суммы периода он не попадает, хотя границу
   * «за всё время» отодвигает — история начинается именно с него.
   */
  type?: "expense" | "income" | "starting_balance";
}

/**
 * Что именно выбрано в меню периода. `count: 0` — «за всё время».
 *
 * Разбивка сейчас только помесячная: недельные и произвольные диапазоны из
 * интерфейса убраны, и поддержки для них здесь тоже нет.
 */
export type PeriodSelection = { kind: "preset"; count: number };

export const MONTH_PRESETS = [
  { id: "3M", short: "3M", label: "Last 3 months", count: 3 },
  { id: "6M", short: "6M", label: "Last 6 months", count: 6 },
  { id: "1Y", short: "1Y", label: "Last 12 months", count: 12 },
  { id: "All", short: "All", label: "All time", count: 0 },
] as const;

export const DEFAULT_PERIOD: PeriodSelection = { kind: "preset", count: 6 };

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1);
}

function addDays(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
}

/** Самая ранняя дата в данных — левая граница режима «за всё время». */
function earliestDate(transactions: AnalyticsTransaction[]): string | null {
  let earliest: string | null = null;
  for (const transaction of transactions) {
    if (earliest === null || transaction.date < earliest) earliest = transaction.date;
  }
  return earliest;
}

export interface PeriodWindow {
  /** Включительно, ISO. */
  from: string;
  to: string;
}

/** Выбор периода → конкретное окно дат. */
export function resolveWindow(
  transactions: AnalyticsTransaction[],
  selection: PeriodSelection,
): PeriodWindow {
  const today = startOfToday();
  const to = toIsoDate(today);

  if (selection.count <= 0) {
    // «За всё время»: от первой транзакции. Если данных нет — показываем
    // текущий месяц, чтобы график не остался вовсе без столбиков.
    const first = earliestDate(transactions);
    return { from: first ?? toIsoDate(startOfMonth(today)), to };
  }

  const from = addMonths(startOfMonth(today), -(selection.count - 1));
  return { from: toIsoDate(from), to };
}

interface BucketFrame {
  key: string;
  label: string;
  short: string;
  start: string;
  end: string;
}

/** Пустые корзины, покрывающие окно целиком — от старых к свежим. */
function framesFor(window: PeriodWindow): BucketFrame[] {
  const frames: BucketFrame[] = [];
  const from = parseIsoDate(window.from);
  const to = parseIsoDate(window.to);

  let cursor = startOfMonth(from);
  while (cursor <= to) {
    const next = addMonths(cursor, 1);
    const end = addDays(next, -1);
    frames.push({
      key: monthKeyOf(toIsoDate(cursor)),
      label: `${MONTHS_LONG[cursor.getMonth()]} ${cursor.getFullYear()}`,
      short: MONTHS_SHORT[cursor.getMonth()],
      start: toIsoDate(cursor),
      end: toIsoDate(end),
    });
    cursor = next;
  }
  return frames;
}

export interface Bucket extends BucketFrame {
  /** Сумма трат, положительная. */
  spent: number;
  income: number;
  /** Доход минус траты. */
  net: number;
  /** Корзина, в которую попадает сегодняшний день. */
  isCurrent: boolean;
}

/** Разложить транзакции по месяцам выбранного окна. */
export function bucketsFor(
  transactions: AnalyticsTransaction[],
  selection: PeriodSelection,
): Bucket[] {
  const window = resolveWindow(transactions, selection);
  const today = todayIso();

  const buckets: Bucket[] = framesFor(window).map((frame) => ({
    ...frame,
    spent: 0,
    income: 0,
    net: 0,
    isCurrent: today >= frame.start && today <= frame.end,
  }));

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const transaction of transactions) {
    if (transaction.type === "starting_balance") continue;
    if (transaction.date < window.from || transaction.date > window.to) continue;
    const bucket = byKey.get(monthKeyOf(transaction.date));
    if (!bucket) continue;
    if (transaction.amount < 0) bucket.spent += Math.abs(transaction.amount);
    else bucket.income += transaction.amount;
  }

  for (const bucket of buckets) bucket.net = bucket.income - bucket.spent;

  return buckets;
}

/** Транзакции, попавшие в корзину. */
export function transactionsIn<T extends AnalyticsTransaction>(
  transactions: T[],
  bucket: Bucket,
): T[] {
  return transactions.filter(
    (transaction) => transaction.date >= bucket.start && transaction.date <= bucket.end,
  );
}

/**
 * Непрерывный ряд месяцев от самой ранней транзакции до `lastKey`, от свежих
 * к старым — список для выбора месяца на Budget.
 *
 * Непрерывный, а не «только месяцы, где есть траты»: месяц без единой траты —
 * такой же ответ на вопрос «что было в этом месяце», и выбрать его должно быть
 * можно. Иначе пустое состояние недостижимо, а в списке появляются дыры.
 */
export function monthKeysTo(
  transactions: AnalyticsTransaction[],
  lastKey: string,
): string[] {
  const earliest = earliestDate(transactions);
  const last = parseIsoDate(`${lastKey}-01`);
  let cursor = parseIsoDate(`${earliest ? monthKeyOf(earliest) : lastKey}-01`);

  const keys: string[] = [];
  while (cursor <= last) {
    keys.push(monthKeyOf(toIsoDate(cursor)));
    cursor = addMonths(cursor, 1);
  }
  return keys.reverse();
}

/**
 * Траты месяца по названиям категорий. Суммы положительные, доходы не в счёт.
 *
 * Ключ — `category` транзакции, то есть название, а не id: связь транзакции с
 * категорией в текущей модели именно такая. Переименование категории учитывает
 * вызывающая сторона через `matchNames`.
 */
export function spentByCategoryIn(
  transactions: AnalyticsTransaction[],
  monthKey: string,
): Record<string, number> {
  const totals: Record<string, number> = {};

  for (const transaction of transactions) {
    if (transaction.amount >= 0) continue;
    if (monthKeyOf(transaction.date) !== monthKey) continue;
    totals[transaction.category] =
      (totals[transaction.category] ?? 0) + Math.abs(transaction.amount);
  }

  return totals;
}

export interface CategoryTotal {
  name: string;
  amount: number;
}

/** Крупнейшие траты периода по категориям — разбивка под столбиком. */
export function categoryBreakdown(
  transactions: AnalyticsTransaction[],
  bucket: Bucket,
  limit: number,
): CategoryTotal[] {
  const totals = new Map<string, number>();

  for (const transaction of transactionsIn(transactions, bucket)) {
    if (transaction.amount >= 0) continue;
    const current = totals.get(transaction.category) ?? 0;
    totals.set(transaction.category, current + Math.abs(transaction.amount));
  }

  return [...totals]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

/** Готовые точки истории для выбранных месячных корзин без перерасчёта значений. */
export function savingsHistoryForBuckets(
  history: SavingsMonthBalance[],
  visible: Bucket[],
): SavingsMonthBalance[] {
  return savingsHistoryForMonths(
    history,
    visible.map((bucket) => bucket.key),
  );
}

/** Подпись выбранного периода — она же кнопка, открывающая меню. */
export function describeSelection(
  selection: PeriodSelection,
  buckets: Bucket[],
): string {
  if (selection.count <= 0) {
    const first = buckets[0];
    return first ? `Since ${first.label}` : "All time";
  }

  const preset = MONTH_PRESETS.find((item) => item.count === selection.count);
  return preset ? preset.label : `Last ${selection.count} months`;
}

/**
 * Через сколько столбиков подписывать ось. Подписи ставим от свежего края:
 * текущий период подписан всегда, даже когда шаг больше единицы.
 */
export function labelStep(count: number): number {
  if (count <= 6) return 1;
  if (count <= 12) return 2;
  return 4;
}
