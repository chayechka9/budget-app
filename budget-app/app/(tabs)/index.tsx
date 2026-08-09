import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, CardRow } from "../../components/Card";
import { Icon } from "../../components/Icon";
import { IconTile } from "../../components/IconTile";
import { ProgressBar, spendProgress } from "../../components/Progress";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { TransactionRow } from "../../components/TransactionRow";
import {
  colors,
  iconSize,
  progressHeight,
  radius,
  spacing,
  typography,
} from "../../constants/theme";
import { daysLeftInMonth } from "../../lib/dates";
import { MOCK_LAST_MONTH, MOCK_MONTH_LABEL } from "../../lib/mock-data";
import { formatMoney } from "../../lib/money";
import { useStore } from "../../lib/store";

const RECENT_COUNT = 3;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions, totalBalance, readyToAssign, categories } = useStore();

  // Сортируем по дате, а не берём первые из списка: добавленная транзакция
  // попадает в начало массива независимо от того, каким числом её записали,
  // и старая трата оказывалась выше свежей.
  const recent = transactions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_COUNT);

  // Сводка по тратам считается из тех же категорий, что показывает Budget —
  // отдельной логики данных здесь нет.
  const fixed = categories.filter((category) => category.kind === "fixed");
  const planned = fixed.reduce((sum, category) => sum + category.assigned, 0);
  const spent = fixed.reduce((sum, category) => sum + (category.spent ?? 0), 0);
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
          onPress={() => router.push("/assign")}
        />
      </View>

      {/* Итог прошлого месяца */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/wrapped-up")}
        style={{ marginTop: 22 }}
      >
        <Card
          style={{
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
      </Pressable>

      {/* Траты за месяц */}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.push("/spending")}
        style={{ marginTop: 22 }}
      >
        <Card>
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
            {...spendProgress(spent, planned)}
            height={progressHeight.card}
            style={{ marginTop: 10 }}
          />

          <Text
            style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}
          >
            <Text style={[typography.amountCaption, { color: colors.positiveText }]}>
              {formatMoney(stillToSpend)}
            </Text>{" "}
            still to spend
          </Text>
        </Card>
      </Pressable>

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
          {/* Текст сам по себе — цель ~50×17, для пальца мало. Добираем hitSlop,
              а не отступами: они сдвинули бы «See all» относительно заголовка. */}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push("/transactions")}
            hitSlop={{ top: 14, bottom: 14, left: 16, right: 16 }}
          >
            <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
              See all
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 6 }}>
          {recent.map((transaction) => (
            <CardRow
              key={transaction.id}
              onPress={() => router.push(`/transaction/${transaction.id}`)}
            >
              {/* Без даты: свежие транзакции и так сверху, а дата уводит взгляд
                  с того, куда ушли деньги. Полные даты — на Activity. */}
              <TransactionRow
                compact
                icon={transaction.icon}
                title={transaction.payee}
                subtitle={transaction.category}
                amount={transaction.amount}
              />
            </CardRow>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}
