import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

import { Card, CardRow } from "../../components/Card";
import { IconTile } from "../../components/IconTile";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { TransactionRow } from "../../components/TransactionRow";
import { colors, spacing, typography } from "../../constants/theme";
import { MOCK_MONTH_LABEL, formatMoney } from "../../lib/mock-data";
import { useStore } from "../../lib/store";

const RECENT_COUNT = 3;

export default function HomeScreen() {
  const router = useRouter();
  const { transactions, totalBalance, readyToAssign, savedThisMonth } = useStore();
  const recent = transactions.slice(0, RECENT_COUNT);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}
    >
      {/* Hero-баланс: на голом фоне, без карточки — как в макете */}
      <Text style={[typography.overlineWide, { color: colors.textTertiary }]}>
        {MOCK_MONTH_LABEL}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Total balance
      </Text>
      <Text style={[typography.hero, { color: colors.text, marginTop: 2 }]}>
        {formatMoney(totalBalance)}
      </Text>

      {/* Ready to Assign — мягкая подсказка, не блокирует */}
      <View style={{ marginTop: spacing.lg }}>
        <ReadyToAssignPill
          amount={formatMoney(readyToAssign)}
          onPress={() => router.push("/budget")}
        />
      </View>

      {/* Позитивный хайлайт */}
      <Card style={{ marginTop: 22 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <IconTile name="wallet" size={42} tone="positive" />
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.text }]}>Saved this month</Text>
            <Text
              style={[typography.amount, { color: colors.positiveText, marginTop: spacing.xs }]}
            >
              {formatMoney(savedThisMonth)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Последние транзакции */}
      <Card style={{ marginTop: spacing.lg }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Text style={[typography.headline, { color: colors.text }]}>Recent</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/transactions")}>
            <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
              See all
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 6 }}>
          {recent.map((transaction, index) => (
            <CardRow key={transaction.id} first={index === 0}>
              <TransactionRow
                compact
                icon={transaction.icon}
                title={transaction.payee}
                subtitle={`${transaction.category} · ${transaction.date}`}
                amount={transaction.amount}
              />
            </CardRow>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
