import { ScrollView, View } from "react-native";

import { Card, CardRow } from "../components/Card";
import { TransactionRow } from "../components/TransactionRow";
import { colors, spacing } from "../constants/theme";
import { MOCK_TRANSACTIONS } from "../lib/mock-data";

export default function TransactionsScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      <Card list>
        {MOCK_TRANSACTIONS.map((transaction, index) => (
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
