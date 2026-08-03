import { ScrollView, View } from "react-native";

import { Card, CardRow } from "../components/Card";
import { TransactionRow } from "../components/TransactionRow";
import { colors, spacing } from "../constants/theme";
import { useStore } from "../lib/store";

export default function TransactionsScreen() {
  const { transactions } = useStore();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <Card list>
        {transactions.map((transaction, index) => (
          <CardRow key={transaction.id} first={index === 0}>
            <TransactionRow
              icon={transaction.icon}
              title={transaction.payee}
              subtitle={`${transaction.category} · ${transaction.date}`}
              amount={transaction.amount}
            />
          </CardRow>
        ))}
      </Card>
      <View />
    </ScrollView>
  );
}
