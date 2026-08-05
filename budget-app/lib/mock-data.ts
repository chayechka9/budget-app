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

/** Плоский список категорий с иконками — для селектора в шите добавления. */
export const MOCK_CATEGORY_OPTIONS: { name: string; icon: IconName }[] =
  MOCK_GROUPS.flatMap((group) =>
    group.categories.map((category) => ({ name: category.name, icon: category.icon })),
  );

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
 * Итог прошлого месяца — карточка «July wrapped up» на Home.
 * Настоящий расчёт появится вместе с месячными срезами на Stage 1.
 */
export const MOCK_LAST_MONTH = {
  label: "July",
  leftUnspent: 113.4,
};

export const MOCK_SUMMARY = {
  /** Всего денег на счетах. */
  totalBalance: 8420.35,
  /** Ещё не распределено по категориям. */
  readyToAssign: 314.2,
  /** Позитивный хайлайт — сколько отложено в этом месяце. */
  savedThisMonth: 480,
};

export function formatMoney(amount: number): string {
  const formatted = Math.abs(amount).toLocaleString("en-IE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${amount < 0 ? "−" : ""}€${formatted}`;
}
