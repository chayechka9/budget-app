/**
 * Временные данные для скелета UI.
 *
 * Настоящий слой данных (Account / Category / Transaction / Month + локальное
 * хранение) — это Stage 1 из BUDGET_APP_SPEC.md, он ещё не реализован.
 * Весь этот файл удаляется целиком, когда появится реальное хранилище.
 */

import type { IconName } from "../components/Icon";

export type CategoryKind = "fixed" | "savings";

export interface MockCategory {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: IconName;
  /** План на месяц (fixed) или уже накоплено (savings). */
  assigned: number;
  /** Потрачено за месяц (fixed). Для savings не используется. */
  spent?: number;
  /** Цель накопления (savings, опционально). */
  target?: number;
}

export interface MockGroup {
  id: string;
  name: string;
  categories: MockCategory[];
}

export interface MockTransaction {
  id: string;
  payee: string;
  category: string;
  icon: IconName;
  /** Отрицательное — трата, положительное — доход. */
  amount: number;
  date: string;
}

export const MOCK_GROUPS: MockGroup[] = [
  {
    id: "g-essentials",
    name: "Essentials",
    categories: [
      { id: "c-rent", name: "Rent", kind: "fixed", icon: "rent", assigned: 1450, spent: 1450 },
      { id: "c-groceries", name: "Groceries", kind: "fixed", icon: "groceries", assigned: 500, spent: 383.4 },
      { id: "c-utilities", name: "Utilities", kind: "fixed", icon: "utilities", assigned: 180, spent: 96.2 },
      { id: "c-transport", name: "Transport", kind: "fixed", icon: "transport", assigned: 120, spent: 148.5 },
    ],
  },
  {
    id: "g-lifestyle",
    name: "Lifestyle",
    categories: [
      { id: "c-eating-out", name: "Eating out", kind: "fixed", icon: "eatingOut", assigned: 200, spent: 112.8 },
      { id: "c-subscriptions", name: "Subscriptions", kind: "fixed", icon: "subscriptions", assigned: 45, spent: 45 },
    ],
  },
  {
    id: "g-savings",
    name: "Savings",
    categories: [
      { id: "c-emergency", name: "Emergency fund", kind: "savings", icon: "emergency", assigned: 3200, target: 6000 },
      { id: "c-trip", name: "Summer trip", kind: "savings", icon: "trip", assigned: 740, target: 2000 },
      { id: "c-laptop", name: "New laptop", kind: "savings", icon: "laptop", assigned: 410 },
    ],
  },
];

export const MOCK_TRANSACTIONS: MockTransaction[] = [
  { id: "t-1", payee: "Tesco", category: "Groceries", icon: "groceries", amount: -42.18, date: "2026-08-02" },
  { id: "t-2", payee: "Dublin Bus", category: "Transport", icon: "transport", amount: -2.6, date: "2026-08-02" },
  { id: "t-3", payee: "Salary", category: "Income", icon: "income", amount: 3200, date: "2026-08-01" },
  { id: "t-4", payee: "Spotify", category: "Subscriptions", icon: "subscriptions", amount: -10.99, date: "2026-07-31" },
  { id: "t-5", payee: "Brother Hubbard", category: "Eating out", icon: "eatingOut", amount: -24.5, date: "2026-07-30" },
  { id: "t-6", payee: "Electric Ireland", category: "Utilities", icon: "utilities", amount: -96.2, date: "2026-07-29" },
  { id: "t-7", payee: "Lidl", category: "Groceries", icon: "groceries", amount: -31.05, date: "2026-07-28" },
  { id: "t-8", payee: "Landlord", category: "Rent", icon: "rent", amount: -1450, date: "2026-07-28" },
  { id: "t-9", payee: "Tesco", category: "Groceries", icon: "groceries", amount: -18.4, date: "2026-07-27" },
  { id: "t-10", payee: "Luas", category: "Transport", icon: "transport", amount: -2.6, date: "2026-07-27" },
];

/** Источники дохода — для режима Income в шите добавления. */
export const MOCK_INCOME_SOURCES: { name: string; icon: IconName }[] = [
  { name: "Salary", icon: "income" },
  { name: "Freelance", icon: "laptop" },
  { name: "Gift", icon: "wallet" },
  { name: "Other", icon: "wallet" },
];

/** Текущий период — используется как оверлайн на Home. */
export const MOCK_MONTH_LABEL = "August";

/**
 * Итог прошлого месяца — карточка «July wrapped up» на Home и экран Wrapped up.
 * Настоящий расчёт появится вместе с месячными срезами на Stage 1.
 */
export const MOCK_LAST_MONTH = {
  label: "July",
  leftUnspent: 113.4,
  /** Из чего сложился остаток — разбивка на экране Wrapped up. */
  breakdown: [
    { name: "Groceries", amount: 41.2 },
    { name: "Utilities", amount: 28.6 },
    { name: "Eating out", amount: 43.6 },
  ],
  /**
   * Факт трат по категориям за прошлый месяц — база для вкладки Trend.
   * Ключ — название категории, как в `MockTransaction.category`.
   */
  spentByCategory: {
    Rent: 1450,
    Groceries: 424.6,
    Utilities: 124.8,
    Transport: 96.4,
    "Eating out": 168.2,
    Subscriptions: 45,
  } as Record<string, number>,
};

export const MOCK_SUMMARY = {
  /** Всего денег на счетах. */
  totalBalance: 8420.35,
  /** Ещё не распределено по категориям. */
  readyToAssign: 314.2,
};

export function formatMoney(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "−" : ""}€${formatted}`;
}

/** Сумма со знаком: «+€52.10» / «−€41.20» / «€0.00». */
export function formatSignedMoney(amount: number): string {
  if (amount > 0.005) return `+${formatMoney(amount)}`;
  return formatMoney(amount);
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Даты в моках — строки «2026-08-02». Разбираем их вручную, а не через
 * `new Date(iso)`: тот трактует такую строку как UTC-полночь и в минусовых
 * таймзонах отдаёт предыдущий день.
 */
function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Заголовок группы дня в Activity: «Today» / «Yesterday» / «2 Aug». */
export function formatDayLabel(iso: string): string {
  const date = parseIsoDate(iso);
  const daysAgo = Math.round((startOfToday().getTime() - date.getTime()) / DAY_MS);
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
}

/** Ключ месяца для группировки и фильтров: «2026-08». */
export function monthKeyOf(iso: string): string {
  return iso.slice(0, 7);
}

/** Ключ месяца в подпись: «2026-08» → «August 2026». */
export function formatMonthKey(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return `${MONTHS_LONG[month - 1]} ${year}`;
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
    const date = new Date(today.getTime() - offset * DAY_MS);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    days.push(`${date.getFullYear()}-${month}-${day}`);
  }
  return days;
}

/** Номер дня для подписи под столбиком графика. */
export function dayOfMonth(iso: string): number {
  return parseIsoDate(iso).getDate();
}

function hashId(id: string): number {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return hash;
}

/**
 * Время и способ оплаты транзакции. В моках их нет, а карточка детали их
 * показывает — выводим из id, чтобы значение было стабильным между рендерами
 * и не «прыгало». Настоящие поля появятся вместе с хранилищем на Stage 1.
 */
export function transactionTime(id: string): string {
  const hash = hashId(id);
  const hours = 8 + (hash % 13);
  const minutes = (hash >> 3) % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function transactionMethod(id: string, isIncome: boolean): string {
  if (isIncome) return "Transfer";
  return hashId(id) % 3 === 0 ? "Cash" : "Card";
}
