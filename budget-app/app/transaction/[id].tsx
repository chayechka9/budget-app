import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

import { Card } from "../../components/Card";
import { IconTile } from "../../components/IconTile";
import { ModalScreen } from "../../components/ModalScreen";
import { HAIRLINE, colors, spacing, typography } from "../../constants/theme";
import {
  formatDayLabel,
  formatMoney,
  transactionMethod,
  transactionTime,
} from "../../lib/mock-data";
import { useStore } from "../../lib/store";

/** Строка «ключ — значение» в списке деталей. */
function DetailRow({ label, value, first }: { label: string; value: string; first?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderTopWidth: first ? 0 : HAIRLINE,
        borderTopColor: colors.separator,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 13.5 }]}>
        {label}
      </Text>
      <Text style={[typography.amountCaption, { color: colors.text, fontSize: 13.5 }]}>
        {value}
      </Text>
    </View>
  );
}

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { transactions } = useStore();

  const transaction = transactions.find((item) => item.id === id);

  if (!transaction) {
    return (
      <ModalScreen>
        <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.lg }]}>
          Transaction not found
        </Text>
      </ModalScreen>
    );
  }

  const income = transaction.amount > 0;

  return (
    <ModalScreen>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          marginTop: spacing.lg,
        }}
      >
        <IconTile name={transaction.icon} size={44} tone={income ? "positive" : "neutral"} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={[typography.button, { color: colors.text }]}
          >
            {transaction.payee}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]}>
            {transaction.category}
          </Text>
        </View>
      </View>

      <Text
        style={[
          typography.screenTitle,
          {
            marginTop: 14,
            color: income ? colors.positiveText : colors.text,
            fontVariant: ["tabular-nums"],
          },
        ]}
      >
        {income ? `+${formatMoney(transaction.amount)}` : formatMoney(transaction.amount)}
      </Text>

      <Card style={{ marginTop: 18, paddingVertical: spacing.sm }}>
        <DetailRow first label="Date" value={formatDayLabel(transaction.date)} />
        <DetailRow label="Time" value={transactionTime(transaction.id)} />
        <DetailRow label="Method" value={transactionMethod(transaction.id, income)} />
      </Card>
    </ModalScreen>
  );
}
