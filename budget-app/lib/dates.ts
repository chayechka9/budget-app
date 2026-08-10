/**
 * Работа с датами: разбор, сборка и пользовательские подписи.
 *
 * Даты в приложении везде — строки «2026-08-02». Модуль ни от чего не зависит
 * и переживёт замену моков на настоящее хранилище: и агрегация (`analytics`),
 * и экраны берут отсюда, чтобы «вчера» и «August 2026» считались одинаково.
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
 * Разбираем вручную, а не через `new Date(iso)`: тот трактует такую строку
 * как UTC-полночь и в минусовых таймзонах отдаёт предыдущий день.
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

/** Полная метка времени создания/изменения записи — не для отображения. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** Ключ месяца для группировки и фильтров: «2026-08». */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Ключ текущего месяца. */
export function currentMonthKey(): string {
  return monthKeyOf(todayIso());
}

/** Ключ месяца в подпись: «2026-08» → «August 2026». */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
}

/** Заголовок группы дня в Activity: «Today» / «Yesterday» / «2 Aug». */
export function formatDayLabel(iso: string): string {
  const date = parseIsoDate(iso);
  const daysAgo = Math.round((startOfToday().getTime() - date.getTime()) / DAY_MS);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** Сколько дней осталось до конца текущего месяца. */
export function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

/** Последние `count` дней, включая сегодня, в виде ISO-строк. */
export function recentDays(count: number): string[] {
  const today = startOfToday();
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    days.push(toIsoDate(new Date(today.getTime() - offset * DAY_MS)));
  }
  return days;
}

/** Номер дня для подписи под столбиком графика. */
export function dayOfMonth(iso: string): number {
  return parseIsoDate(iso).getDate();
}
