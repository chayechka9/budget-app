import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { IconTile } from "../../components/IconTile";
import { ProgressBar } from "../../components/Progress";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { TransactionRow } from "../../components/TransactionRow";
import {
  HAIRLINE,
  colors,
  iconSize,
  progressHeight,
  radius,
  spacing,
  typography,
} from "../../constants/theme";
import {
  MOCK_GROUPS,
  MOCK_LAST_MONTH,
  MOCK_MONTH_LABEL,
  formatMoney,
} from "../../lib/mock-data";
import { useStore } from "../../lib/store";

const RECENT_COUNT = 3;

/** Сколько дней осталось до конца текущего месяца. */
function daysLeftInMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, totalBalance, readyToAssign, extraSpentByCategory } = useStore();

  const recent = transactions.slice(0, RECENT_COUNT);

  // Сводка по тратам считается из тех же категорий, что показывает Budget —
  // отдельной логики данных здесь нет.
  const fixed = MOCK_GROUPS.flatMap((group) =>
    group.categories.filter((category) => category.kind === "fixed"),
  );
  const planned = fixed.reduce((sum, category) => sum + category.assigned, 0);
  const spent = fixed.reduce(
    (sum, category) =>
      sum + (category.spent ?? 0) + (extraSpentByCategory[category.name] ?? 0),
    0,
  );
  const stillToSpend = Math.max(0, planned - spent);
  const daysLeft = daysLeftInMonth();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        // В макете 78px сверху при статус-баре ~59px.
        paddingTop: insets.top + 19,
        paddingHorizontal: spacing.xl,
        paddingBottom: spacing.xxxl,
      }}
    >
      {/* Месяц */}
      <Text style={[typography.overlineWide, { color: colors.textTertiary }]}>
        {MOCK_MONTH_LABEL}
      </Text>

      {/* Баланс */}
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xl }]}>
        Total balance
      </Text>
      <Text style={[typography.hero, { color: colors.text, marginTop: 2 }]}>
        {formatMoney(totalBalance)}
      </Text>

      {/* Ready to Assign — мягкая подсказка, не блокирует */}
      <View style={{ marginTop: spacing.lg, flexDirection: "row" }}>
        <ReadyToAssignPill
          amount={formatMoney(readyToAssign)}
          onPress={() => router.push("/budget")}
        />
      </View>

      {/* Итог прошлого месяца */}
      <Card
        style={{
          marginTop: 22,
          borderRadius: radius.card,
          paddingVertical: spacing.lg,
          paddingHorizontal: 18,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <IconTile name="calendarCheck" size={42} tone="positive" />
          <View style={{ flex: 1 }}>
            <Text style={[typography.headline, { color: colors.text }]}>
              {MOCK_LAST_MONTH.label} wrapped up
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>
              <Text style={[typography.amountCaption, { color: colors.positiveText }]}>
                {formatMoney(MOCK_LAST_MONTH.leftUnspent)}
              </Text>{" "}
              left unspent
            </Text>
          </View>
          <Icon name="chevronRight" size={iconSize.chevron} color={colors.textFaint} />
        </View>
      </Card>

      {/* Траты за месяц */}
      <Card style={{ marginTop: 22 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <Text style={[typography.headline, { color: colors.text }]}>Spending</Text>
          <Text style={[typography.caption, { color: colors.textTertiary }]}>
            {daysLeft} days left
          </Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: 6,
            marginTop: 14,
          }}
        >
          <Text style={[typography.amount, { color: colors.text }]}>{formatMoney(spent)}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            of {formatMoney(planned)} planned
          </Text>
        </View>

        <ProgressBar
          value={planned === 0 ? 0 : spent / planned}
          height={progressHeight.card}
          style={{ marginTop: 10 }}
        />

        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          <Text style={[typography.amountCaption, { color: colors.positiveText }]}>
            {formatMoney(stillToSpend)}
          </Text>{" "}
          still to spend
        </Text>
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
          {recent.map((transaction) => (
            <View
              key={transaction.id}
              style={{ borderTopWidth: HAIRLINE, borderTopColor: colors.separator }}
            >
              <TransactionRow
                compact
                icon={transaction.icon}
                title={transaction.payee}
                subtitle={`${transaction.category} · ${transaction.date}`}
                amount={transaction.amount}
              />
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
