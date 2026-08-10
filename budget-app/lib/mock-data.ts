/**
 * Временные данные для скелета UI.
 *
 * Настоящий слой данных (Account / Category / Transaction / Month + локальное
 * хранение) — это Stage 1 из BUDGET_APP_SPEC.md, он ещё не реализован.
 * Весь этот файл удаляется целиком, когда появится реальное хранилище.
 */

import type { IconName } from "../components/Icon";
import { startOfToday } from "./dates";
import type { SavingsEvent } from "./savings-history";

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

/**
 * Явный demo seed истории накоплений для in-memory прототипа.
 *
 * Это не пользовательские данные и не реконструкция из доходов/расходов.
 * Суммы — отдельные детерминированные операции Assign, которые в сумме дают
 * текущие demo-балансы savings-категорий: €3,200 + €740 + €410.
 */
export const DEMO_SAVINGS_EVENT_SEED: SavingsEvent[] = [
  { id: "s-demo-2025-06-emergency", categoryId: "c-emergency", amount: 250, date: "2025-06-15" },
  { id: "s-demo-2025-07-emergency", categoryId: "c-emergency", amount: 250, date: "2025-07-15" },
  { id: "s-demo-2025-08-emergency", categoryId: "c-emergency", amount: 250, date: "2025-08-15" },
  { id: "s-demo-2025-09-emergency", categoryId: "c-emergency", amount: 250, date: "2025-09-15" },
  { id: "s-demo-2025-09-trip", categoryId: "c-trip", amount: 100, date: "2025-09-15" },
  { id: "s-demo-2025-10-emergency", categoryId: "c-emergency", amount: 250, date: "2025-10-15" },
  { id: "s-demo-2025-11-emergency", categoryId: "c-emergency", amount: 250, date: "2025-11-15" },
  { id: "s-demo-2025-11-trip", categoryId: "c-trip", amount: 100, date: "2025-11-15" },
  { id: "s-demo-2025-12-emergency", categoryId: "c-emergency", amount: 250, date: "2025-12-15" },
  { id: "s-demo-2025-12-laptop", categoryId: "c-laptop", amount: 100, date: "2025-12-15" },
  { id: "s-demo-2026-01-emergency", categoryId: "c-emergency", amount: 250, date: "2026-01-15" },
  { id: "s-demo-2026-01-trip", categoryId: "c-trip", amount: 100, date: "2026-01-15" },
  { id: "s-demo-2026-02-emergency", categoryId: "c-emergency", amount: 250, date: "2026-02-15" },
  { id: "s-demo-2026-02-laptop", categoryId: "c-laptop", amount: 100, date: "2026-02-15" },
  { id: "s-demo-2026-03-emergency", categoryId: "c-emergency", amount: 250, date: "2026-03-15" },
  { id: "s-demo-2026-03-trip", categoryId: "c-trip", amount: 100, date: "2026-03-15" },
  { id: "s-demo-2026-04-emergency", categoryId: "c-emergency", amount: 250, date: "2026-04-15" },
  { id: "s-demo-2026-04-trip", categoryId: "c-trip", amount: 90, date: "2026-04-15" },
  { id: "s-demo-2026-04-laptop", categoryId: "c-laptop", amount: 100, date: "2026-04-15" },
  { id: "s-demo-2026-05-emergency", categoryId: "c-emergency", amount: 200, date: "2026-05-15" },
  { id: "s-demo-2026-05-trip", categoryId: "c-trip", amount: 80, date: "2026-05-15" },
  { id: "s-demo-2026-06-emergency", categoryId: "c-emergency", amount: 150, date: "2026-06-15" },
  { id: "s-demo-2026-06-trip", categoryId: "c-trip", amount: 70, date: "2026-06-15" },
  { id: "s-demo-2026-06-laptop", categoryId: "c-laptop", amount: 50, date: "2026-06-15" },
  { id: "s-demo-2026-07-emergency", categoryId: "c-emergency", amount: 50, date: "2026-07-15" },
  { id: "s-demo-2026-07-trip", categoryId: "c-trip", amount: 50, date: "2026-07-15" },
  { id: "s-demo-2026-07-laptop", categoryId: "c-laptop", amount: 30, date: "2026-07-15" },
  { id: "s-demo-2026-08-emergency", categoryId: "c-emergency", amount: 50, date: "2026-08-01" },
  { id: "s-demo-2026-08-trip", categoryId: "c-trip", amount: 50, date: "2026-08-01" },
  { id: "s-demo-2026-08-laptop", categoryId: "c-laptop", amount: 30, date: "2026-08-01" },
];

/** Свежие траты — то, что видно на Home в «Recent» и вверху Activity. */
const RECENT_TRANSACTIONS: MockTransaction[] = [
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

/**
 * Регулярные траты месяца: из них собирается история за прошлые месяцы.
 *
 * Без истории графики Insights нечего показывать — свежих транзакций всего
 * на две недели, а период там выбирается вплоть до года. Это те же моки, что
 * и остальной файл, просто разложенные по месяцам, а не выписанные руками:
 * агрегация в `analytics` считает по ним ровно так же, как считала бы по
 * настоящим данным из хранилища.
 */
const HISTORY_PATTERN: {
  payee: string;
  category: string;
  icon: IconName;
  amount: number;
  /** Дни месяца, в которые случается трата. */
  days: number[];
}[] = [
  { payee: "Landlord", category: "Rent", icon: "rent", amount: 1450, days: [1] },
  { payee: "Spotify", category: "Subscriptions", icon: "subscriptions", amount: 10.99, days: [5] },
  { payee: "iCloud", category: "Subscriptions", icon: "subscriptions", amount: 34.01, days: [5] },
  { payee: "Electric Ireland", category: "Utilities", icon: "utilities", amount: 62.4, days: [12] },
  { payee: "Virgin Media", category: "Utilities", icon: "utilities", amount: 62.4, days: [18] },
  { payee: "Tesco", category: "Groceries", icon: "groceries", amount: 62, days: [4, 11, 18, 25] },
  { payee: "Lidl", category: "Groceries", icon: "groceries", amount: 44, days: [8, 22] },
  { payee: "Brother Hubbard", category: "Eating out", icon: "eatingOut", amount: 34, days: [8, 16, 23] },
  { payee: "Dublin Bus", category: "Transport", icon: "transport", amount: 12, days: [2, 10, 20] },
  { payee: "Luas", category: "Transport", icon: "transport", amount: 15, days: [6, 14, 27] },
];

/** Сколько полных месяцев истории лежит до июля 2026. */
const HISTORY_MONTHS = 13;

/** Зарплата — единственный доход в истории, приходит первого числа. */
const HISTORY_SALARY = 3200;

/**
 * Разброс суммы вокруг базовой: ±18%, но детерминированный. Случайные числа
 * тут не годятся — при каждом рендере графики бы дёргались, а снимки экрана
 * перестали бы совпадать между запусками.
 */
function wobble(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return 0.82 + (hash % 37) / 100;
}

function buildHistory(): MockTransaction[] {
  const history: MockTransaction[] = [];
  // Последний месяц истории — июнь 2026: июль и август уже покрыты свежими
  // транзакциями выше, дублировать их нельзя.
  const lastMonth = new Date(2026, 5, 1);

  for (let back = 0; back < HISTORY_MONTHS; back++) {
    const month = new Date(lastMonth.getFullYear(), lastMonth.getMonth() - back, 1);
    const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`;

    history.push({
      id: `t-hist-${monthKey}-salary`,
      payee: "Salary",
      category: "Income",
      icon: "income",
      amount: HISTORY_SALARY,
      date: `${monthKey}-01`,
    });

    for (const entry of HISTORY_PATTERN) {
      for (const day of entry.days) {
        const seed = `${monthKey}-${entry.payee}-${day}`;
        const amount = Math.round(entry.amount * wobble(seed) * 100) / 100;
        history.push({
          id: `t-hist-${seed}`,
          payee: entry.payee,
          category: entry.category,
          icon: entry.icon,
          amount: -amount,
          date: `${monthKey}-${String(day).padStart(2, "0")}`,
        });
      }
    }
  }

  return history;
}

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

/**
 * Кто «продавец» в дописанной трате — чтобы строка в Activity читалась так же,
 * как остальные, а не «Groceries — Groceries».
 */
const RECONCILE_PAYEE: Record<string, string> = {
  Rent: "Landlord",
  Groceries: "Tesco",
  Utilities: "Electric Ireland",
  Transport: "Luas",
  "Eating out": "Brother Hubbard",
  Subscriptions: "iCloud",
};

/**
 * Дни месяца, по которым размазывается дописанная трата.
 *
 * Расписание берём то же, что у истории: если свалить весь остаток месяца в
 * один день, месячный график этого не заметит, а недельный покажет одну
 * гору и несколько пустых недель — то есть соврёт про ритм трат.
 */
function reconcileDays(category: string, dayLimit: number): number[] {
  const scheduled = [
    ...new Set(
      HISTORY_PATTERN.filter((entry) => entry.category === category).flatMap(
        (entry) => entry.days,
      ),
    ),
  ].sort((first, second) => first - second);

  const allowed = scheduled.filter((day) => day <= dayLimit);
  if (allowed.length > 0) return allowed;

  // Расписания нет или оно целиком позже сегодняшнего дня — одна запись
  // ближе к началу месяца.
  return [Math.min(scheduled[0] ?? 3, dayLimit)];
}

/**
 * Дописывает июлю и августу траты, которых нет в списке транзакций.
 *
 * Расхождение — в самой модели моков: `spent` у категории и `spentByCategory`
 * у прошлого месяца заданы отдельными числами, а не выведены из транзакций.
 * Home и Budget читают первые, Insights считает по вторым — и без сведения
 * один и тот же август показывался бы как €2,235.90 на Home и как €45 на
 * графике. Дописываем разницу транзакциями, чтобы источник был один.
 *
 * Правки сессии сюда не попадают и не должны: добавленную пользователем трату
 * стор прибавляет и к `spent` категории, и к списку транзакций — обе стороны
 * растут одинаково, и сведение остаётся верным.
 */
function buildReconciliation(): MockTransaction[] {
  const iconByCategory = new Map<string, IconName>();
  const augustBaseline: Record<string, number> = {};

  for (const group of MOCK_GROUPS) {
    for (const category of group.categories) {
      iconByCategory.set(category.name, category.icon);
      if (category.kind === "fixed" && category.spent) {
        augustBaseline[category.name] = category.spent;
      }
    }
  }

  const today = startOfToday();
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const months = [
    { key: "2026-07", baseline: MOCK_LAST_MONTH.spentByCategory },
    { key: "2026-08", baseline: augustBaseline },
  ];

  const filler: MockTransaction[] = [];

  for (const month of months) {
    const inMonth = RECENT_TRANSACTIONS.filter((transaction) =>
      transaction.date.startsWith(month.key),
    );

    // Зарплата: в августе она уже есть в списке, в июле её не было.
    if (!inMonth.some((transaction) => transaction.amount > 0)) {
      filler.push({
        id: `t-fill-${month.key}-salary`,
        payee: "Salary",
        category: "Income",
        icon: "income",
        amount: HISTORY_SALARY,
        date: `${month.key}-01`,
      });
    }

    for (const [name, planned] of Object.entries(month.baseline)) {
      const covered = inMonth
        .filter((transaction) => transaction.amount < 0 && transaction.category === name)
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

      const missing = Math.round((planned - covered) * 100) / 100;
      if (missing <= 0.005) continue;

      // Дописанная трата не может быть в будущем: в текущем месяце
      // расписание обрезаем по сегодняшнему дню.
      const dayLimit = month.key === currentMonthKey ? today.getDate() : 31;
      const days = reconcileDays(name, dayLimit);

      const share = Math.round((missing / days.length) * 100) / 100;

      days.forEach((day, index) => {
        // Последняя доля добирает копейки округления, чтобы сумма
        // дописанного сошлась с остатком до цента.
        const amount =
          index === days.length - 1
            ? Math.round((missing - share * (days.length - 1)) * 100) / 100
            : share;
        if (amount <= 0.005) return;

        filler.push({
          id: `t-fill-${month.key}-${name}-${day}`,
          payee: RECONCILE_PAYEE[name] ?? name,
          category: name,
          icon: iconByCategory.get(name) ?? "wallet",
          amount: -amount,
          date: `${month.key}-${String(day).padStart(2, "0")}`,
        });
      });
    }
  }

  return filler;
}

/**
 * Свежие транзакции идут первыми: Home показывает «Recent» как первые три
 * элемента списка, и история, вклинившись в начало, вытеснила бы их.
 */
export const MOCK_TRANSACTIONS: MockTransaction[] = [
  ...RECENT_TRANSACTIONS,
  ...buildReconciliation(),
  ...buildHistory(),
];

export const MOCK_SUMMARY = {
  /** Всего денег на счетах. */
  totalBalance: 8420.35,
  /** Ещё не распределено по категориям. */
  readyToAssign: 314.2,
};

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
export function transactionTime(id: unknown): string {
  if (typeof id !== "string" || id.length === 0) return "—";

  const hash = hashId(id);
  const hours = 8 + (hash % 13);
  // `hash` — беззнаковое 32-битное число. Знаковый сдвиг `>>` превращал
  // значения с установленным старшим битом в отрицательные минуты.
  const minutes = (hash >>> 3) % 60;
  if (!Number.isInteger(hours) || hours < 0 || hours > 23) return "—";
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 59) return "—";

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function transactionMethod(id: string, isIncome: boolean): string {
  if (isIncome) return "Transfer";
  return hashId(id) % 3 === 0 ? "Cash" : "Card";
}
