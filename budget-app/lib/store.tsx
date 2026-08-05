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
  MOCK_GROUPS,
  MOCK_SUMMARY,
  MOCK_TRANSACTIONS,
  type CategoryKind,
  type MockCategory,
  type MockTransaction,
} from "./mock-data";

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
  /** Группы с учётом добавленных трат и распределённых денег. */
  groups: ResolvedGroup[];
  /** Тот же список плоско — для поиска категории по id. */
  categories: ResolvedCategory[];
  totalBalance: number;
  readyToAssign: number;
  addTransaction: (input: NewTransaction) => void;
  /** Разложить деньги из Ready to assign по категориям: id категории → сумма. */
  assign: (amountByCategoryId: Record<string, number>) => void;
  addCategory: (draft: CategoryDraft) => void;
  updateCategory: (id: string, draft: CategoryDraft) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [added, setAdded] = useState<MockTransaction[]>([]);
  const [assignedByCategory, setAssignedByCategory] = useState<Record<string, number>>({});
  /** Группы, созданные через «New group» в форме категории. */
  const [extraGroups, setExtraGroups] = useState<{ id: string; name: string }[]>([]);
  /** Категории, созданные в этой сессии. */
  const [extraCategories, setExtraCategories] = useState<PlacedCategory[]>([]);
  /** Правки существующих категорий: id → изменённые поля. */
  const [edits, setEdits] = useState<Record<string, Partial<PlacedCategory>>>({});

  const value = useMemo<Store>(() => {
    // Расход уменьшает баланс, доход увеличивает.
    const balanceDelta = added.reduce((sum, transaction) => sum + transaction.amount, 0);

    // Доход не привязан к категории: он пополняет пул нераспределённых денег.
    const incomeDelta = added
      .filter((transaction) => transaction.amount > 0)
      .reduce((sum, transaction) => sum + transaction.amount, 0);

    const extraSpentByCategory: Record<string, number> = {};
    for (const transaction of added) {
      if (transaction.amount >= 0) continue;
      const spent = Math.abs(transaction.amount);
      extraSpentByCategory[transaction.category] =
        (extraSpentByCategory[transaction.category] ?? 0) + spent;
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
          // У fixed это план на месяц, у savings — уже накопленное. Assign
          // пополняет и то, и другое.
          assigned: category.assigned + (assignedByCategory[category.id] ?? 0),
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
      transactions: [...added, ...MOCK_TRANSACTIONS],
      groups,
      categories: groups.flatMap((group) => group.categories),
      totalBalance: MOCK_SUMMARY.totalBalance + balanceDelta,
      readyToAssign: MOCK_SUMMARY.readyToAssign + incomeDelta - assignedTotal,
      addTransaction: (input) => {
        const signedAmount = input.type === "income" ? input.amount : -input.amount;
        setAdded((current) => [
          {
            id: `t-new-${current.length + 1}-${input.date}-${signedAmount}`,
            // У дохода в строке показываем источник, у расхода — заметку,
            // а если её нет — название категории.
            payee:
              input.type === "income" ? input.label : input.note.trim() || input.label,
            category: input.type === "income" ? "Income" : input.label,
            icon: input.icon,
            amount: signedAmount,
            date: input.date,
          },
          ...current,
        ]);
      },
      assign: (amountByCategoryId) => {
        setAssignedByCategory((current) => {
          const next = { ...current };
          for (const [categoryId, amount] of Object.entries(amountByCategoryId)) {
            if (!amount) continue;
            next[categoryId] = (next[categoryId] ?? 0) + amount;
          }
          return next;
        });
      },
      addCategory: (draft) => {
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
  }, [added, assignedByCategory, extraGroups, extraCategories, edits]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
