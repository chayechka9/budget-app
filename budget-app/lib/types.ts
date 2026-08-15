/**
 * Типы предметной области — то, чем оперируют экраны.
 *
 * Это не строки таблиц: репозитории переводят snake_case из SQLite в эти
 * объекты, а обратно — в параметры запросов. Экранам не нужно знать ни про
 * `deleted_at`, ни про то, что план на месяц лежит в отдельной таблице.
 */

import type { IconName } from "../components/Icon";

export type CategoryKind = "fixed" | "savings";

/**
 * Стартовый баланс — отдельный тип, а не доход: деньги он приносит и
 * распределять его можно, но доходом месяца он не является и в Insights как
 * доход не показывается.
 */
export type TransactionType = "expense" | "income" | "starting_balance";

export type SavingsGoalKind = "target" | "target_date" | "open";

export type GoalCadence = "weekly" | "monthly";

export interface Profile {
  id: string;
  currency: string;
  /** День месяца, с которого начинается бюджетный месяц. */
  monthStartDay: number;
  onboardedAt: string | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  sortOrder: number;
  archivedAt: string | null;
}

export interface Category {
  id: string;
  groupId: string;
  name: string;
  kind: CategoryKind;
  icon: IconName;
  sortOrder: number;
  archivedAt: string | null;
}

export interface IncomeSource {
  id: string;
  name: string;
  icon: IconName;
  sortOrder: number;
  archivedAt: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  /** Отрицательное — трата, положительное — приход. */
  amount: number;
  categoryId: string | null;
  incomeSourceId: string | null;
  /** Кому или за что — то, что видно первой строкой в списке. */
  payee: string;
  /** Название категории, дохода или стартового баланса — вторая строка. */
  category: string;
  icon: IconName;
  note: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/** Сколько денег разложено на категорию в конкретном месяце. */
export interface BudgetAllocation {
  id: string;
  monthKey: string;
  categoryId: string;
  assigned: number;
}

export interface BudgetMonth {
  id: string;
  monthKey: string;
  startsOn: string;
  closedAt: string | null;
}

export interface SavingsGoal {
  id: string;
  categoryId: string;
  kind: SavingsGoalKind;
  /** Нет у бессрочного накопления. */
  targetAmount: number | null;
  /** Есть только у цели с датой. */
  targetDate: string | null;
  cadence: GoalCadence | null;
}
