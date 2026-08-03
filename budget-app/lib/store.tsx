import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";

import type { IconName } from "../components/Icon";
import { MOCK_SUMMARY, MOCK_TRANSACTIONS, type MockTransaction } from "./mock-data";

/**
 * Временное хранилище в памяти.
 *
 * Настоящее локальное хранение (expo-sqlite/AsyncStorage) — это Stage 1 из
 * BUDGET_APP_SPEC.md. Здесь только то, что нужно, чтобы Save реально менял
 * цифры на экранах: моки из mock-data служат стартовым срезом, а добавленные
 * транзакции накладываются поверх. При перезапуске всё сбрасывается.
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

interface Store {
  transactions: MockTransaction[];
  totalBalance: number;
  readyToAssign: number;
  savedThisMonth: number;
  /** Сколько ещё потрачено по категории сверх стартового среза. */
  extraSpentByCategory: Record<string, number>;
  addTransaction: (input: NewTransaction) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: PropsWithChildren) {
  const [added, setAdded] = useState<MockTransaction[]>([]);

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

    return {
      transactions: [...added, ...MOCK_TRANSACTIONS],
      totalBalance: MOCK_SUMMARY.totalBalance + balanceDelta,
      readyToAssign: MOCK_SUMMARY.readyToAssign + incomeDelta,
      savedThisMonth: MOCK_SUMMARY.savedThisMonth,
      extraSpentByCategory,
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
    };
  }, [added]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}
