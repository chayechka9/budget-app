import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

import type { IconName } from "../components/Icon";
import {
  MOCK_GROUPS,
  MOCK_SUMMARY,
  MOCK_TRANSACTIONS,
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
 * Категория с уже применёнными правками сессии. Экраны берут только её и не
 * складывают моки с дельтами у себя — иначе Home и Budget разъезжаются.
 */
export interface ResolvedCategory extends MockCategory {
  groupId: string;
  groupName: string;
}

export interface ResolvedGroup {
  id: string;
  name: string;
  categories: ResolvedCategory[];
}

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
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [added, setAdded] = useState<MockTransaction[]>([]);
  const [assignedByCategory, setAssignedByCategory] = useState<Record<string, number>>({});

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

    const groups: ResolvedGroup[] = MOCK_GROUPS.map((group) => ({
      id: group.id,
      name: group.name,
      categories: group.categories.map((category) => ({
        ...category,
        groupId: group.id,
        groupName: group.name,
        // У fixed это план на месяц, у savings — уже накопленное. Assign
        // пополняет и то, и другое.
        assigned: category.assigned + (assignedByCategory[category.id] ?? 0),
        spent:
          category.kind === "fixed"
            ? (category.spent ?? 0) + (extraSpentByCategory[category.name] ?? 0)
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
    };
  }, [added, assignedByCategory]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
