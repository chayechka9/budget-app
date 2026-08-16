import { useLocalSearchParams, useRouter } from "expo-router";
import { Text, View } from "react-native";

import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { IconTile } from "../../components/IconTile";
import { ModalScreen } from "../../components/ModalScreen";
import { HAIRLINE, colors, spacing, typography } from "../../constants/theme";
import { formatDayLabel, formatTimeOfDay } from "../../lib/dates";
import { formatSignedMoney } from "../../lib/money";
import { useCloseScreen } from "../../lib/navigation";
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
  const router = useRouter();
  const close = useCloseScreen();
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
        {formatSignedMoney(transaction.amount)}
      </Text>

      <Card style={{ marginTop: 18, paddingVertical: spacing.sm }}>
        <DetailRow first label="Date" value={formatDayLabel(transaction.date)} />
        {/* Время — момент, когда запись была создана в приложении. Способа
            оплаты в модели нет, и выдуманной строки «Method» здесь тоже нет. */}
        <DetailRow label="Added at" value={formatTimeOfDay(transaction.createdAt)} />
      </Card>

      {/* Кнопки во всю ширину: в макете они 46px внутри узкого диалога, здесь
          это целый модальный экран — высоту берём общую для всех CTA. */}
      <Button
        label="Edit"
        onPress={() => router.push(`/add-transaction?id=${transaction.id}`)}
        style={{ marginTop: 18 }}
      />
      <Button
        label="Close"
        variant="muted"
        onPress={close}
        style={{ marginTop: spacing.sm }}
      />
    </ModalScreen>
  );
}
