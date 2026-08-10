import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from "react";

import type { IconName } from "../components/Icon";
import {
  DEMO_SAVINGS_EVENT_SEED,
  MOCK_GROUPS,
  MOCK_SUMMARY,
  MOCK_TRANSACTIONS,
  type CategoryKind,
  type MockCategory,
  type MockTransaction,
} from "./mock-data";
import { isMoneyAmountWithinLimit } from "./money";
import { currentMonthKey, nowIso } from "./dates";
import { generateId } from "./id";
import {
  buildSavingsHistory,
  savingsBalanceByCategory,
  savingsEventsForAssignment,
  type SavingsEvent,
  type SavingsMonthBalance,
} from "./savings-history";

/**
 * Временное хранилище в памяти.
 *
 * Настоящее локальное хранение (expo-sqlite/AsyncStorage) — это Stage 1 из
 * BUDGET_APP_SPEC.md. Здесь только то, что нужно, чтобы действия реально
 * меняли цифры на экранах: моки из mock-data служат стартовым срезом, а
 * правки сессии накладываются поверх. При перезапуске всё сбрасывается.
 */

export type TransactionType = "expense" | "income";

export interface NewTransaction {
  type: TransactionType;
  /** Всегда положительное число — знак проставляет стор. */
  amount: number;
  /** Категория для расхода или источник для дохода. */
  label: string;
  icon: IconName;
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
  /** План на месяц у fixed, цель накопления у savings. */
  amount: number;
  /** Существующая группа. */
  groupId: string;
  /** Непустое имя — создать группу с этим названием и положить категорию в неё. */
  newGroupName?: string;
}

/**
 * Поля записи, выведенные из заполненной формы. Одни и те же для новой
 * транзакции и для правки существующей — иначе созданная и отредактированная
 * запись начали бы по-разному называться в списке.
 */
function transactionFieldsFrom(input: NewTransaction) {
  return {
    // У дохода в строке показываем источник, у расхода — заметку,
    // а если её нет — название категории.
    payee: input.type === "income" ? input.label : input.note.trim() || input.label,
    category: input.type === "income" ? "Income" : input.label,
    icon: input.icon,
    // Расход уменьшает баланс, доход увеличивает.
    amount: input.type === "income" ? input.amount : -input.amount,
    date: input.date,
  };
}

/** Название группы в id: «Fun money» → «fun-money». */
function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "group"
  );
}

/**
 * Группа, в которую ляжет категория. Для «New group» её id выводится из
 * названия, а сама группа заодно добавляется в список — так создание группы
 * и категории остаётся одним действием пользователя.
 */
function resolveGroupId(
  draft: CategoryDraft,
  setExtraGroups: Dispatch<SetStateAction<{ id: string; name: string }[]>>,
): string {
  const newGroupName = draft.newGroupName?.trim();
  if (!newGroupName) return draft.groupId;

  const id = `g-new-${slugify(newGroupName)}`;
  setExtraGroups((current) =>
    current.some((group) => group.id === id)
      ? current
      : [...current, { id, name: newGroupName }],
  );
  return id;
}

/**
 * Категория с уже применёнными правками сессии. Экраны берут только её и не
 * складывают моки с дельтами у себя — иначе Home и Budget разъезжаются.
 */
export interface ResolvedCategory extends MockCategory {
  groupId: string;
  groupName: string;
  /**
   * Названия, под которыми на категорию ссылаются транзакции: текущее и, если
   * категорию переименовали, прежнее. Экраны фильтруют историю по этому списку,
   * а не по `name`, иначе переименование прячет все прошлые траты.
   */
  matchNames: string[];
}

export interface ResolvedGroup {
  id: string;
  name: string;
  categories: ResolvedCategory[];
}

/** Категория вместе с группой, в которой она лежит. */
type PlacedCategory = MockCategory & { groupId: string };

/** Она же с уже вычисленными именами для сопоставления с транзакциями. */
type NamedCategory = PlacedCategory & { matchNames: string[] };

interface Store {
  transactions: MockTransaction[];
  /** Фактические операции накопления, включая явно обозначенный demo seed. */
  savingsEvents: SavingsEvent[];
  /** Полная история баланса; период Insights только фильтрует эти точки. */
  savingsHistory: SavingsMonthBalance[];
  /** Группы с учётом добавленных трат и распределённых денег. */
  groups: ResolvedGroup[];
  /** Тот же список плоско — для поиска категории по id. */
  categories: ResolvedCategory[];
  totalBalance: number;
  readyToAssign: number;
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
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [added, setAdded] = useState<MockTransaction[]>([]);
  /** Правки транзакций: id → изменённые поля. Моковые правятся так же. */
  const [transactionEdits, setTransactionEdits] = useState<
    Record<string, Partial<MockTransaction>>
  >({});
  /** id удалённых транзакций — запись просто исчезает из всех списков. */
  const [deletedTransactionIds, setDeletedTransactionIds] = useState<string[]>([]);
  const [pendingUndo, setPendingUndo] = useState<string | null>(null);
  const [assignedByCategory, setAssignedByCategory] = useState<Record<string, number>>({});
  const [savingsEvents, setSavingsEvents] = useState<SavingsEvent[]>(
    DEMO_SAVINGS_EVENT_SEED,
  );
  /** Группы, созданные через «New group» в форме категории. */
  const [extraGroups, setExtraGroups] = useState<{ id: string; name: string }[]>([]);
  /** Категории, созданные в этой сессии. */
  const [extraCategories, setExtraCategories] = useState<PlacedCategory[]>([]);
  /** Правки существующих категорий: id → изменённые поля. */
  const [edits, setEdits] = useState<Record<string, Partial<PlacedCategory>>>({});

  const value = useMemo<Store>(() => {
    const deleted = new Set(deletedTransactionIds);
    /** Транзакция с уже применённой правкой сессии. */
    const withEdits = (transaction: MockTransaction): MockTransaction =>
      transactionEdits[transaction.id]
        ? { ...transaction, ...transactionEdits[transaction.id] }
        : transaction;

    const transactions = [...added, ...MOCK_TRANSACTIONS]
      .filter((transaction) => !deleted.has(transaction.id))
      .map(withEdits);

    /**
     * Вклад транзакций в итоги поверх моковых цифр.
     *
     * Добавленная в сессии запись считается целиком. Моковая уже учтена и в
     * MOCK_SUMMARY, и в `spent` категорий, поэтому попадает сюда только если
     * её правили или удалили: минусом — прежний вклад, плюсом — то, чем она
     * стала. Так правка расхода сама переносит трату между категориями.
     */
    const contributions: { transaction: MockTransaction; sign: 1 | -1 }[] = [];
    for (const transaction of added) {
      if (deleted.has(transaction.id)) continue;
      contributions.push({ transaction: withEdits(transaction), sign: 1 });
    }
    for (const transaction of MOCK_TRANSACTIONS) {
      const changed = transactionEdits[transaction.id] !== undefined;
      const removed = deleted.has(transaction.id);
      if (!changed && !removed) continue;
      contributions.push({ transaction, sign: -1 });
      if (!removed) contributions.push({ transaction: withEdits(transaction), sign: 1 });
    }

    // Расход уменьшает баланс, доход увеличивает.
    const balanceDelta = contributions.reduce(
      (sum, { transaction, sign }) => sum + sign * transaction.amount,
      0,
    );

    // Доход не привязан к категории: он пополняет пул нераспределённых денег.
    const incomeDelta = contributions
      .filter(({ transaction }) => transaction.amount > 0)
      .reduce((sum, { transaction, sign }) => sum + sign * transaction.amount, 0);

    const extraSpentByCategory: Record<string, number> = {};
    for (const { transaction, sign } of contributions) {
      if (transaction.amount >= 0) continue;
      const spent = Math.abs(transaction.amount);
      extraSpentByCategory[transaction.category] =
        (extraSpentByCategory[transaction.category] ?? 0) + sign * spent;
    }

    const assignedTotal = Object.values(assignedByCategory).reduce(
      (sum, amount) => sum + amount,
      0,
    );
    // Правки накладываются до раскладки по группам: смена группы — это тоже
    // правка, и категория должна уехать в новую группу, а не остаться в старой.
    const placed: NamedCategory[] = [
      ...MOCK_GROUPS.flatMap((group) =>
        group.categories.map((category) => ({ ...category, groupId: group.id })),
      ),
      ...extraCategories,
    ].map((category) => {
      const edited = { ...category, ...edits[category.id] };
      // Транзакция ссылается на категорию по названию, а Edit его меняет.
      // Старые траты записаны с прежним именем, новые — с текущим, поэтому
      // категории принадлежат оба.
      return {
        ...edited,
        matchNames:
          edited.name === category.name ? [category.name] : [category.name, edited.name],
      };
    });

    // История и текущие balances используют только категории, которые сейчас
    // являются savings. Это сохраняет общий итог при смене типа категории.
    const savingsCategoryIds = new Set(
      placed.filter((category) => category.kind === "savings").map(({ id }) => id),
    );
    const activeSavingsEvents = savingsEvents.filter((event) =>
      savingsCategoryIds.has(event.categoryId),
    );
    const savingsByCategory = savingsBalanceByCategory(activeSavingsEvents);
    const savingsHistory = buildSavingsHistory(activeSavingsEvents, currentMonthKey());

    const groups: ResolvedGroup[] = [
      ...MOCK_GROUPS.map(({ id, name }) => ({ id, name })),
      ...extraGroups,
    ].map((group) => ({
      id: group.id,
      name: group.name,
      categories: placed
        .filter((category) => category.groupId === group.id)
        .map((category) => ({
          ...category,
          groupName: group.name,
          // У savings единственный источник баланса — фактические события.
          // Обычные категории по-прежнему используют месячный план + Assign.
          assigned:
            category.kind === "savings"
              ? (savingsByCategory[category.id] ?? 0)
              : category.assigned + (assignedByCategory[category.id] ?? 0),
          spent:
            category.kind === "fixed"
              ? (category.spent ?? 0) +
                category.matchNames.reduce(
                  (sum, name) => sum + (extraSpentByCategory[name] ?? 0),
                  0,
                )
              : category.spent,
        })),
    }));

    return {
      transactions,
      savingsEvents,
      savingsHistory,
      groups,
      categories: groups.flatMap((group) => group.categories),
      totalBalance: MOCK_SUMMARY.totalBalance + balanceDelta,
      readyToAssign: MOCK_SUMMARY.readyToAssign + incomeDelta - assignedTotal,
      addTransaction: (input) => {
        if (!isMoneyAmountWithinLimit(input.amount) || input.amount <= 0) return;
        const timestamp = nowIso();
        setAdded((current) => [
          {
            // Стабильный id, не зависящий от порядка/даты/суммы записи —
            // переживёт перенос на SQLite (Checkpoint 1).
            id: generateId("t"),
            ...transactionFieldsFrom(input),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          ...current,
        ]);
      },
      updateTransaction: (id, input) => {
        if (!isMoneyAmountWithinLimit(input.amount) || input.amount <= 0) return;
        setTransactionEdits((current) => ({
          ...current,
          [id]: {
            ...current[id],
            ...transactionFieldsFrom(input),
            updatedAt: nowIso(),
          },
        }));
      },
      deleteTransaction: (id) => {
        if (!transactions.some((transaction) => transaction.id === id)) return;
        setDeletedTransactionIds((current) =>
          current.includes(id) ? current : [...current, id],
        );
        // Удаление обратимо, пока на экране висит Undo, поэтому правки записи
        // не стираем: вернуться она должна такой же, какой была.
        setPendingUndo(id);
      },
      pendingUndo,
      undoDelete: () => {
        if (!pendingUndo) return;
        setDeletedTransactionIds((current) =>
          current.filter((id) => id !== pendingUndo),
        );
        setPendingUndo(null);
      },
      dismissUndo: () => setPendingUndo(null),
      assign: (amountByCategoryId) => {
        const validAmounts = Object.fromEntries(
          Object.entries(amountByCategoryId).filter(
            ([, amount]) => isMoneyAmountWithinLimit(amount) && amount > 0,
          ),
        );

        setAssignedByCategory((current) => {
          const next = { ...current };
          for (const [categoryId, amount] of Object.entries(validAmounts)) {
            next[categoryId] = (next[categoryId] ?? 0) + amount;
          }
          return next;
        });
        setSavingsEvents((current) => [
          ...current,
          ...savingsEventsForAssignment(validAmounts, placed, current.length),
        ]);
      },
      addCategory: (draft) => {
        if (!isMoneyAmountWithinLimit(draft.amount)) return;
        const groupId = resolveGroupId(draft, setExtraGroups);
        setExtraCategories((current) => [
          ...current,
          {
            id: `c-new-${slugify(draft.name)}-${current.length + 1}`,
            groupId,
            name: draft.name.trim(),
            kind: draft.kind,
            icon: draft.icon,
            // У fixed сумма из формы — план на месяц; у savings это цель, а
            // накоплено пока ноль.
            assigned: draft.kind === "fixed" ? draft.amount : 0,
            spent: draft.kind === "fixed" ? 0 : undefined,
            target: draft.kind === "savings" ? draft.amount : undefined,
          },
        ]);
      },
      updateCategory: (id, draft) => {
        if (!isMoneyAmountWithinLimit(draft.amount)) return;
        const groupId = resolveGroupId(draft, setExtraGroups);
        setEdits((current) => ({
          ...current,
          [id]: {
            ...current[id],
            groupId,
            name: draft.name.trim(),
            kind: draft.kind,
            icon: draft.icon,
            ...(draft.kind === "fixed"
              ? // Сумма из формы — это уже итоговый план вместе с разложенным
                // на категорию. Хранить её как есть нельзя: раскладка
                // прибавится к ней второй раз. Обнулять раскладку тоже нельзя —
                // тогда те же деньги вернутся в Ready to assign и появятся
                // дважды. Поэтому храним план за вычетом раскладки.
                {
                  assigned: draft.amount - (assignedByCategory[id] ?? 0),
                  target: undefined,
                }
              : { target: draft.amount }),
          },
        }));
      },
    };
  }, [
    added,
    transactionEdits,
    deletedTransactionIds,
    pendingUndo,
    assignedByCategory,
    savingsEvents,
    extraGroups,
    extraCategories,
    edits,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
