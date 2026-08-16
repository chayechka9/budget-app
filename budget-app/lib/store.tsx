import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import type { IconName } from "../components/Icon";
import {
  buildCategoryMonths,
  savingsEventsFrom,
  statesForMonth,
  type CategoryMonthState,
} from "./budget.ts";
import { currentMonthKey, monthName, todayIso } from "./dates.ts";
import { getDb } from "./db/open.ts";
import {
  addAssigned,
  listAllocations,
  setAssigned,
} from "./db/repositories/budget.ts";
import {
  archiveCategory as archiveCategoryRow,
  findGroupByName,
  insertCategory,
  insertGroup,
  listCategories,
  listGroups,
  restoreCategory as restoreCategoryRow,
  updateCategory as updateCategoryRow,
} from "./db/repositories/categories.ts";
import { recordEvent } from "./db/repositories/analytics-events.ts";
import { listIncomeSources } from "./db/repositories/income-sources.ts";
import { ensureProfile, markOnboarded } from "./db/repositories/profile.ts";
import {
  deleteSavingsGoal,
  listSavingsGoals,
  upsertSavingsGoal,
} from "./db/repositories/savings-goals.ts";
import {
  insertTransaction,
  listTransactions,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction as updateTransactionRow,
} from "./db/repositories/transactions.ts";
import type { Db } from "./db/types.ts";
import { seedStarterData } from "./db/seed.ts";
import { isMoneyAmountWithinLimit } from "./money.ts";
import { onboardingWrites, type OnboardingResult } from "./onboarding.ts";
import { buildSavingsHistory, type SavingsMonthBalance } from "./savings-history.ts";
import type {
  BudgetAllocation,
  Category,
  CategoryGroup,
  CategoryKind,
  GoalCadence,
  IncomeSource,
  Profile,
  SavingsGoal,
  Transaction,
  TransactionType,
} from "./types.ts";

/**
 * Хранилище приложения.
 *
 * Единственный источник истины — SQLite. React-состояние здесь только кеш
 * прочитанного: любое действие пишет в базу и перечитывает срез, поэтому
 * данные переживают перезапуск, а экраны продолжают читать те же поля, что и
 * раньше.
 *
 * Срез читается целиком, а не точечными запросами: личный бюджет — это тысячи
 * строк в худшем случае, зато любой экран гарантированно видит одни и те же
 * числа, а не свою версию баланса.
 */

export type { TransactionType };
export type { OnboardingResult };

export interface NewTransaction {
  type: TransactionType;
  /** Всегда положительное число — знак проставляет слой данных. */
  amount: number;
  /** Категория расхода. */
  categoryId: string | null;
  /** Источник дохода. */
  incomeSourceId: string | null;
  note: string;
  date: string;
}

/**
 * Заполненная форма категории — одна и та же для создания и редактирования.
 */
export interface CategoryDraft {
  name: string;
  kind: CategoryKind;
  icon: IconName;
  /**
   * План на месяц у обычной категории, цель у накопления. `null` — поле
   * оставили пустым: категория без лимита и накопление без конечной цели
   * одинаково допустимы.
   */
  amount: number | null;
  /** Существующая группа. */
  groupId: string;
  /** Непустое имя — создать группу с этим названием и положить категорию в неё. */
  newGroupName?: string;
  /** Дата цели накопления. */
  targetDate?: string | null;
  /** Считать взнос по неделям или по месяцам. */
  cadence?: GoalCadence | null;
}

/**
 * Категория, посчитанная на конкретный месяц. Экраны берут только её и не
 * складывают суммы у себя — иначе Home и Budget разъезжаются.
 */
export interface ResolvedCategory {
  id: string;
  name: string;
  kind: CategoryKind;
  icon: IconName;
  groupId: string;
  groupName: string;
  /**
   * Сколько денег в категории: у обычной — план месяца вместе с перенесённым
   * остатком, у накопления — всё накопленное.
   */
  assigned: number;
  /** Потрачено за месяц. У накоплений не используется. */
  spent?: number;
  /** Цель накопления, если она задана. */
  target?: number;
  /** Дата цели и ритм взносов — только у цели с датой. */
  targetDate?: string;
  cadence?: GoalCadence;
  /** Остаток, перенесённый из прошлого месяца. */
  carriedIn: number;
  archivedAt: string | null;
}

export interface ResolvedGroup {
  id: string;
  name: string;
  categories: ResolvedCategory[];
}

/** Итог месяца — то, из чего собраны карточка Wrapped up и сравнение трат. */
export interface MonthSummary {
  key: string;
  /** «July» — короткая подпись месяца. */
  label: string;
  /** Что осталось неистраченным и уехало в следующий месяц. */
  leftUnspent: number;
  /** Из чего сложился остаток, крупные первыми. */
  breakdown: { name: string; amount: number }[];
  /** Траты месяца по названиям категорий. */
  spentByCategory: Record<string, number>;
}

interface Store {
  /** База прочитана хотя бы раз. */
  ready: boolean;
  /** Онбординг уже пройден — показывать его второй раз нельзя. */
  onboarded: boolean;
  transactions: Transaction[];
  /** Полная история накоплений; период Insights только фильтрует эти точки. */
  savingsHistory: SavingsMonthBalance[];
  /** Группы текущего месяца без архивных категорий. */
  groups: ResolvedGroup[];
  /** Тот же список плоско — для поиска категории по id. */
  categories: ResolvedCategory[];
  /** Архивные категории — для восстановления. */
  archivedCategories: ResolvedCategory[];
  incomeSources: IncomeSource[];
  totalBalance: number;
  readyToAssign: number;
  /** Группы за любой месяц: в прошлом — только те, где что-то происходило. */
  groupsForMonth: (monthKey: string) => ResolvedGroup[];
  monthSummary: (monthKey: string) => MonthSummary;
  addTransaction: (input: NewTransaction) => void;
  /** Переписать существующую транзакцию значениями из формы. */
  updateTransaction: (id: string, input: NewTransaction) => void;
  deleteTransaction: (id: string) => void;
  /** id последней удалённой транзакции, пока Undo ещё на экране. */
  pendingUndo: string | null;
  /** Вернуть удалённую транзакцию. */
  undoDelete: () => void;
  /** Убрать предложение Undo, оставив удаление в силе. */
  dismissUndo: () => void;
  /** Разложить деньги из Ready to assign по категориям: id категории → сумма. */
  assign: (amountByCategoryId: Record<string, number>) => void;
  addCategory: (draft: CategoryDraft) => void;
  updateCategory: (id: string, draft: CategoryDraft) => void;
  /** Убрать категорию из новых операций, не трогая историю. */
  archiveCategory: (id: string) => void;
  restoreCategory: (id: string) => void;
  /** Закрыть онбординг: записать цель, стартовый баланс и отметить профиль. */
  completeOnboarding: (result: OnboardingResult) => void;
}

/** Всё, что читается из базы за один проход. */
interface Snapshot {
  profile: Profile | null;
  groups: CategoryGroup[];
  categories: Category[];
  incomeSources: IncomeSource[];
  transactions: Transaction[];
  allocations: BudgetAllocation[];
  goals: SavingsGoal[];
}

const EMPTY_SNAPSHOT: Snapshot = {
  profile: null,
  groups: [],
  categories: [],
  incomeSources: [],
  transactions: [],
  allocations: [],
  goals: [],
};

async function readSnapshot(db: Db): Promise<Snapshot> {
  const [profile, groups, categories, incomeSources, transactions, allocations, goals] =
    await Promise.all([
      ensureProfile(db),
      listGroups(db),
      listCategories(db),
      listIncomeSources(db),
      listTransactions(db),
      listAllocations(db),
      listSavingsGoals(db),
    ]);

  return { profile, groups, categories, incomeSources, transactions, allocations, goals };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<Snapshot>(EMPTY_SNAPSHOT);
  const [ready, setReady] = useState(false);
  const [pendingUndo, setPendingUndo] = useState<string | null>(null);

  /**
   * Прогоняет запись и сразу перечитывает срез.
   *
   * Оптимистичных правок в состоянии нет намеренно: экран должен показывать
   * то, что реально лежит в базе, иначе после перезапуска цифры «меняются
   * сами». Запись локальная и занимает миллисекунды.
   */
  const write = useCallback(async (action: (db: Db) => Promise<void>) => {
    const db = await getDb();
    await action(db);
    setSnapshot(await readSnapshot(db));
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const db = await getDb();
      await seedStarterData(db);
      const next = await readSnapshot(db);
      if (cancelled) return;
      setSnapshot(next);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<Store>(() => {
    const { categories, groups, transactions, allocations, goals } = snapshot;

    const thisMonth = currentMonthKey();
    const goalByCategory = new Map(goals.map((goal) => [goal.categoryId, goal]));
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const savingsIds = new Set(
      categories.filter((category) => category.kind === "savings").map(({ id }) => id),
    );

    // Один расчёт цепочки месяцев на все экраны: перенос остатка обязан быть
    // одинаковым и в Budget, и в карточке категории, и в Insights.
    const states = buildCategoryMonths(allocations, transactions, thisMonth);

    // Срез по месяцу считается один раз: иначе каждая категория пересчитывала
    // бы всю цепочку заново.
    const monthIndex = new Map<string, Map<string, CategoryMonthState>>();
    const monthState = (monthKey: string) => {
      let byCategory = monthIndex.get(monthKey);
      if (!byCategory) {
        byCategory = statesForMonth(states, monthKey);
        monthIndex.set(monthKey, byCategory);
      }
      return byCategory;
    };

    const resolveCategory = (
      category: Category,
      monthKey: string,
    ): ResolvedCategory => {
      const state = monthState(monthKey).get(category.id);
      const carriedIn = state?.carriedIn ?? 0;
      const assigned = state?.assigned ?? 0;
      const spent = state?.spent ?? 0;
      const available = state?.available ?? 0;
      const goal = goalByCategory.get(category.id);

      return {
        id: category.id,
        name: category.name,
        kind: category.kind,
        icon: category.icon,
        groupId: category.groupId,
        groupName: groupById.get(category.groupId)?.name ?? "",
        // У накопления показываем всё, что на нём лежит; у обычной категории —
        // деньги этого месяца вместе с перенесённым остатком.
        assigned: category.kind === "savings" ? available : carriedIn + assigned,
        spent: category.kind === "savings" ? undefined : spent,
        target: goal?.targetAmount ?? undefined,
        targetDate: goal?.targetDate ?? undefined,
        cadence: goal?.cadence ?? undefined,
        carriedIn,
        archivedAt: category.archivedAt,
      };
    };

    const buildGroups = (monthKey: string, includeIdle: boolean): ResolvedGroup[] => {
      const monthStates = monthState(monthKey);

      return groups
        .map((group) => ({
          id: group.id,
          name: group.name,
          categories: categories
            .filter((category) => category.groupId === group.id)
            .filter((category) => category.archivedAt === null)
            .filter((category) => {
              if (includeIdle) return true;
              // В закрытом месяце показываем только то, что в нём реально
              // происходило: категория, заведённая позже, к нему отношения
              // не имеет.
              const state = monthStates.get(category.id);
              if (!state) return false;
              return state.assigned !== 0 || state.spent !== 0 || state.carriedIn !== 0;
            })
            .map((category) => resolveCategory(category, monthKey)),
        }))
        .filter((group) => includeIdle || group.categories.length > 0);
    };

    const currentGroups = buildGroups(thisMonth, true);
    const currentCategories = currentGroups.flatMap((group) => group.categories);

    // Баланс — это всё, что пришло, минус всё, что потрачено. Отдельного
    // «начального» числа нет: стартовый баланс такая же запись, как остальные.
    const totalBalance = transactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    // В пул нераспределённых денег попадают доходы и стартовый баланс;
    // уходит из него всё, что разложено по категориям в любом месяце.
    const inflow = transactions
      .filter((transaction) => transaction.type !== "expense")
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const assignedTotal = allocations.reduce(
      (sum, allocation) => sum + allocation.assigned,
      0,
    );

    const savingsHistory = buildSavingsHistory(
      savingsEventsFrom(allocations, transactions, savingsIds),
      thisMonth,
    );

    const monthSummary = (monthKey: string): MonthSummary => {
      const monthStates = monthState(monthKey);
      const nameById = new Map(categories.map((category) => [category.id, category.name]));

      const breakdown: { name: string; amount: number }[] = [];
      const spentByCategory: Record<string, number> = {};
      let leftUnspent = 0;

      for (const category of categories) {
        if (category.kind !== "fixed") continue;
        const state = monthStates.get(category.id);
        if (!state) continue;

        leftUnspent += state.available;
        if (state.available > 0) {
          breakdown.push({
            name: nameById.get(category.id) ?? "",
            amount: state.available,
          });
        }
        if (state.spent > 0) {
          spentByCategory[nameById.get(category.id) ?? ""] = state.spent;
        }
      }

      return {
        key: monthKey,
        label: monthName(monthKey),
        leftUnspent,
        breakdown: breakdown.sort((first, second) => second.amount - first.amount),
        spentByCategory,
      };
    };

    /** Группа для категории: существующая или заведённая по имени из формы. */
    const resolveGroupId = async (db: Db, draft: CategoryDraft): Promise<string> => {
      const newGroupName = draft.newGroupName?.trim();
      if (!newGroupName) return draft.groupId;

      const existing = await findGroupByName(db, newGroupName);
      if (existing) return existing.id;
      return (await insertGroup(db, { name: newGroupName })).id;
    };

    /** Сумма из формы: план месяца у обычной категории, цель у накопления. */
    const applyDraftAmount = async (db: Db, id: string, draft: CategoryDraft) => {
      if (draft.kind === "savings") {
        await upsertSavingsGoal(db, id, {
          targetAmount: draft.amount,
          targetDate: draft.targetDate ?? null,
          cadence: draft.cadence ?? null,
        });
        return;
      }

      // Обычная категория цели не имеет: если тип поменяли, цель уходит.
      await deleteSavingsGoal(db, id);
      // Пустое поле — категория без лимита. Это не то же самое, что план на
      // ноль, поэтому раскладку не трогаем вовсе.
      if (draft.amount !== null) {
        await setAssigned(db, currentMonthKey(), id, draft.amount);
      }
    };

    const validAmount = (amount: number | null): boolean =>
      amount === null || (isMoneyAmountWithinLimit(amount) && amount >= 0);

    return {
      ready,
      // Пока профиль не прочитан, считаем онбординг непройденным — но экраны
      // всё равно ждут `ready`, так что показать его дважды это не даёт.
      onboarded: snapshot.profile?.onboardedAt != null,
      transactions,
      savingsHistory,
      groups: currentGroups,
      categories: currentCategories,
      archivedCategories: categories
        .filter((category) => category.archivedAt !== null)
        .map((category) => resolveCategory(category, thisMonth)),
      incomeSources: snapshot.incomeSources,
      totalBalance,
      readyToAssign: inflow - assignedTotal,
      groupsForMonth: (monthKey) => buildGroups(monthKey, monthKey === thisMonth),
      monthSummary,

      addTransaction: (input) => {
        if (!isMoneyAmountWithinLimit(input.amount) || input.amount <= 0) return;
        void write((db) =>
          insertTransaction(db, {
            type: input.type,
            amount: input.amount,
            categoryId: input.type === "expense" ? input.categoryId : null,
            incomeSourceId: input.type === "income" ? input.incomeSourceId : null,
            note: input.note,
            date: input.date,
          }).then(() => undefined),
        );
      },

      updateTransaction: (id, input) => {
        if (!isMoneyAmountWithinLimit(input.amount) || input.amount <= 0) return;
        void write((db) =>
          updateTransactionRow(db, id, {
            type: input.type,
            amount: input.amount,
            categoryId: input.type === "expense" ? input.categoryId : null,
            incomeSourceId: input.type === "income" ? input.incomeSourceId : null,
            note: input.note,
            date: input.date,
          }),
        );
      },

      deleteTransaction: (id) => {
        if (!transactions.some((transaction) => transaction.id === id)) return;
        // Запись остаётся в базе с меткой удаления: Undo должен вернуть её
        // ровно такой, какой она была.
        setPendingUndo(id);
        void write((db) => softDeleteTransaction(db, id));
      },

      pendingUndo,
      undoDelete: () => {
        if (!pendingUndo) return;
        const id = pendingUndo;
        setPendingUndo(null);
        void write((db) => restoreTransaction(db, id));
      },
      dismissUndo: () => setPendingUndo(null),

      assign: (amountByCategoryId) => {
        const valid = Object.entries(amountByCategoryId).filter(
          ([, amount]) => isMoneyAmountWithinLimit(amount) && amount > 0,
        );
        if (valid.length === 0) return;

        void write(async (db) => {
          for (const [categoryId, amount] of valid) {
            await addAssigned(db, currentMonthKey(), categoryId, amount);
          }
        });
      },

      addCategory: (draft) => {
        if (!validAmount(draft.amount)) return;
        const name = draft.name.trim();
        if (!name) return;

        void write(async (db) => {
          const groupId = await resolveGroupId(db, draft);
          const category = await insertCategory(db, {
            groupId,
            name,
            kind: draft.kind,
            icon: draft.icon,
          });
          await applyDraftAmount(db, category.id, draft);
        });
      },

      updateCategory: (id, draft) => {
        if (!validAmount(draft.amount)) return;
        const name = draft.name.trim();
        if (!name) return;

        void write(async (db) => {
          const groupId = await resolveGroupId(db, draft);
          await updateCategoryRow(db, id, {
            groupId,
            name,
            kind: draft.kind,
            icon: draft.icon,
          });
          await applyDraftAmount(db, id, draft);
        });
      },

      archiveCategory: (id) => {
        void write((db) => archiveCategoryRow(db, id));
      },
      restoreCategory: (id) => {
        void write((db) => restoreCategoryRow(db, id));
      },

      completeOnboarding: (result) => {
        const { event, startingBalance } = onboardingWrites(result);

        void write(async (db) => {
          if (event) await recordEvent(db, event.name, event.props);

          // Стартовый баланс — обычная транзакция своего типа, такая же, как
          // всё остальное в истории.
          if (startingBalance !== null) {
            await insertTransaction(db, {
              type: "starting_balance",
              amount: startingBalance,
              categoryId: null,
              incomeSourceId: null,
              note: "",
              date: todayIso(),
            });
          }

          // Отметка стоит последней: если что-то выше упадёт, онбординг
          // повторится, а не пропадёт вместе с ответами.
          const profile = snapshot.profile ?? (await ensureProfile(db));
          await markOnboarded(db, profile.id);
        });
      },
    };
  }, [snapshot, ready, pendingUndo, write]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
