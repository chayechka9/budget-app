/**
 * Агрегация транзакций по периодам — общий слой для всех виджетов Insights.
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

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Даты везде — строки «2026-08-02». Разбираем вручную, а не через
 * `new Date(iso)`: тот трактует такую строку как UTC-полночь и в минусовых
 * таймзонах отдаёт предыдущий день.
 */
export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function todayIso(): string {
  return toIsoDate(startOfToday());
}

/** Минимум, который нужен агрегации. `amount` со знаком: минус — трата. */
export interface AnalyticsTransaction {
  date: string;
  amount: number;
  category: string;
}

export type PeriodUnit = "month" | "week";

/**
 * Что именно выбрано в меню периода. `count: 0` у пресета — «за всё время».
 * Custom хранит только границы: единицу разбивки выводим из длины диапазона,
 * чтобы пользователю не приходилось выбирать её вторым действием.
 */
export type PeriodSelection =
  | { kind: "preset"; unit: PeriodUnit; count: number }
  | { kind: "custom"; from: string; to: string };

export const MONTH_PRESETS = [
  { id: "3M", short: "3M", label: "Last 3 months", count: 3 },
  { id: "6M", short: "6M", label: "Last 6 months", count: 6 },
  { id: "1Y", short: "1Y", label: "Last 12 months", count: 12 },
  { id: "All", short: "All", label: "All time", count: 0 },
] as const;

export const WEEK_PRESETS = [
  { id: "4W", label: "Last 4 weeks", count: 4 },
  { id: "8W", label: "Last 8 weeks", count: 8 },
  { id: "12W", label: "Last 12 weeks", count: 12 },
  { id: "26W", label: "Last 26 weeks", count: 26 },
] as const;

export const DEFAULT_PERIOD: PeriodSelection = { kind: "preset", unit: "month", count: 6 };

/**
 * Длина custom-диапазона, до которой разбиваем по неделям. Дальше недельных
 * столбиков становится больше двадцати и график перестаёт читаться.
 */
const CUSTOM_WEEK_LIMIT_DAYS = 84;

/** Понедельник недели, в которую попадает дата. */
function startOfWeek(date: Date): Date {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay(): 0 — воскресенье. Неделя начинается с понедельника.
  const weekday = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - weekday);
  return result;
}

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
  unit: PeriodUnit;
  /** Включительно, ISO. */
  from: string;
  to: string;
}

/** Выбор периода → конкретное окно дат и единица разбивки. */
export function resolveWindow(
  transactions: AnalyticsTransaction[],
  selection: PeriodSelection,
): PeriodWindow {
  if (selection.kind === "custom") {
    const [from, to] =
      selection.from <= selection.to
        ? [selection.from, selection.to]
        : [selection.to, selection.from];
    const spanDays = Math.round(
      (parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS,
    );
    return { unit: spanDays <= CUSTOM_WEEK_LIMIT_DAYS ? "week" : "month", from, to };
  }

  const today = startOfToday();
  const to = toIsoDate(today);

  if (selection.count <= 0) {
    // «За всё время»: от первой транзакции. Если данных нет — показываем
    // текущий период, чтобы график не остался вовсе без столбиков.
    const first = earliestDate(transactions);
    const fallback =
      selection.unit === "month" ? startOfMonth(today) : startOfWeek(today);
    return { unit: selection.unit, from: first ?? toIsoDate(fallback), to };
  }

  const from =
    selection.unit === "month"
      ? addMonths(startOfMonth(today), -(selection.count - 1))
      : addDays(startOfWeek(today), -7 * (selection.count - 1));

  return { unit: selection.unit, from: toIsoDate(from), to };
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

  if (window.unit === "month") {
    let cursor = startOfMonth(from);
    while (cursor <= to) {
      const next = addMonths(cursor, 1);
      const end = addDays(next, -1);
      frames.push({
        key: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
        label: `${MONTHS_LONG[cursor.getMonth()]} ${cursor.getFullYear()}`,
        short: MONTHS_SHORT[cursor.getMonth()],
        start: toIsoDate(cursor),
        end: toIsoDate(end),
      });
      cursor = next;
    }
    return frames;
  }

  let cursor = startOfWeek(from);
  while (cursor <= to) {
    const end = addDays(cursor, 6);
    frames.push({
      key: `W${toIsoDate(cursor)}`,
      label: `${cursor.getDate()} ${MONTHS_SHORT[cursor.getMonth()]} – ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`,
      // Под столбиком помещается только число: месяц читается из соседних
      // подписей и из полной подписи в карточке деталей.
      short: String(cursor.getDate()),
      start: toIsoDate(cursor),
      end: toIsoDate(end),
    });
    cursor = addDays(cursor, 7);
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

/**
 * Разложить транзакции по периодам. Границы окна режут и корзины по краям:
 * у custom-диапазона первая и последняя неделя считаются только по дням,
 * которые в диапазон попали.
 */
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
    if (transaction.date < window.from || transaction.date > window.to) continue;
    const bucket = byKey.get(bucketKeyOf(transaction.date, window.unit));
    if (!bucket) continue;
    if (transaction.amount < 0) bucket.spent += Math.abs(transaction.amount);
    else bucket.income += transaction.amount;
  }

  for (const bucket of buckets) bucket.net = bucket.income - bucket.spent;

  return buckets;
}

/** Ключ корзины, в которую попадает дата. */
export function bucketKeyOf(iso: string, unit: PeriodUnit): string {
  if (unit === "month") return iso.slice(0, 7);
  return `W${toIsoDate(startOfWeek(parseIsoDate(iso)))}`;
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

/**
 * Кривая накоплений по периодам.
 *
 * Истории накоплений в данных нет — есть только текущий итог по savings-
 * категориям. Поэтому итог раскладывается назад по всей истории транзакций
 * пропорционально тому, сколько в каждом периоде осталось неистраченным
 * (доход минус траты). Свойства, которые это даёт: кривая не уходит в минус,
 * не убывает и в последней точке равна ровно текущему накопленному.
 *
 * Считается всегда по всей истории, а не по выбранному окну — иначе смена
 * периода двигала бы значения в точках, которые от периода зависеть не должны.
 */
export function savingsCurve(
  transactions: AnalyticsTransaction[],
  unit: PeriodUnit,
  visible: Bucket[],
  totalSaved: number,
): number[] {
  const history = bucketsFor(transactions, { kind: "preset", unit, count: 0 });

  let running = 0;
  const cumulativeByKey = new Map<string, number>();
  for (const bucket of history) {
    running += Math.max(0, bucket.net);
    cumulativeByKey.set(bucket.key, running);
  }

  // Ни одного периода с положительным остатком — раскладывать нечего,
  // показываем текущий итог ровной линией.
  if (running <= 0) return visible.map(() => totalSaved);

  return visible.map((bucket) => {
    const cumulative = cumulativeByKey.get(bucket.key);
    // Корзины вне истории (custom-диапазон в будущем) наследуют итог.
    if (cumulative === undefined) return totalSaved;
    return (totalSaved * cumulative) / running;
  });
}

/** Подпись выбранного периода — она же кнопка, открывающая меню. */
export function describeSelection(
  selection: PeriodSelection,
  buckets: Bucket[],
): string {
  if (selection.kind === "custom") {
    const from = parseIsoDate(selection.from);
    const to = parseIsoDate(selection.to);
    const fromLabel = `${from.getDate()} ${MONTHS_SHORT[from.getMonth()]}`;
    const toLabel = `${to.getDate()} ${MONTHS_SHORT[to.getMonth()]}`;
    return `${fromLabel} – ${toLabel}`;
  }

  if (selection.count <= 0) {
    const first = buckets[0];
    return first ? `Since ${first.label}` : "All time";
  }

  const presets = selection.unit === "month" ? MONTH_PRESETS : WEEK_PRESETS;
  const preset = presets.find((item) => item.count === selection.count);
  if (preset) return preset.label;
  return `Last ${selection.count} ${selection.unit === "month" ? "months" : "weeks"}`;
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
