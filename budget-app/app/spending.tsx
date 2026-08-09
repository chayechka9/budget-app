import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { Card, CardRow } from "../components/Card";
import { IconTile } from "../components/IconTile";
import { ModalScreen } from "../components/ModalScreen";
import { SegmentedControl } from "../components/SegmentedControl";
import { TransactionRow } from "../components/TransactionRow";
import { colors, radius, spacing, typography } from "../constants/theme";
import { dayOfMonth, formatDayLabel, recentDays } from "../lib/dates";
import { MOCK_LAST_MONTH, type MockTransaction } from "../lib/mock-data";
import { formatMoney, formatSignedMoney } from "../lib/money";
import { useStore, type ResolvedCategory } from "../lib/store";

type SpendingView = "trend" | "day" | "top";

/** Окна, за которые считаются вкладки. Каждая карточка подписывает своё. */
const CHART_DAYS = 10;
const AVERAGE_DAYS = 7;
const TOP_WINDOW_DAYS = 30;
const TOP_COUNT = 6;

const MAX_BAR_HEIGHT = 84;

function isExpense(transaction: MockTransaction): boolean {
  return transaction.amount < 0;
}

/** Вкладка Trend: как месяц идёт относительно прошлого, по категориям. */
function TrendView({ categories }: { categories: ResolvedCategory[] }) {
  const router = useRouter();
  const lastMonth = MOCK_LAST_MONTH.spentByCategory;

  const spending = categories
    .filter((category) => category.kind === "fixed")
    .slice()
    .sort((a, b) => (b.spent ?? 0) - (a.spent ?? 0));

  const thisMonthTotal = spending.reduce((sum, category) => sum + (category.spent ?? 0), 0);
  const lastMonthTotal = spending.reduce(
    (sum, category) => sum + (lastMonth[category.name] ?? 0),
    0,
  );
  const delta = thisMonthTotal - lastMonthTotal;

  const note =
    delta > 0.005
      ? `more than ${MOCK_LAST_MONTH.label}`
      : delta < -0.005
        ? `less than ${MOCK_LAST_MONTH.label}`
        : `even with ${MOCK_LAST_MONTH.label}`;

  return (
    <>
      <Card style={{ marginTop: 18 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Compared with {MOCK_LAST_MONTH.label}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: spacing.sm,
            marginTop: 4,
          }}
        >
          <Text
            style={[
              typography.amount,
              { color: delta < -0.005 ? colors.positiveText : colors.text },
            ]}
          >
            {formatSignedMoney(delta)}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{note}</Text>
        </View>
      </Card>

      <Card list style={{ marginTop: spacing.md }}>
        {spending.map((category, index) => {
          const previous = lastMonth[category.name];
          const categoryDelta =
            previous === undefined ? undefined : (category.spent ?? 0) - previous;

          return (
            <CardRow
              key={category.id}
              first={index === 0}
              onPress={() => router.push(`/category/${category.id}`)}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingVertical: 13,
                }}
              >
                <IconTile name={category.icon} size={38} />

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[typography.headline, { color: colors.text }]}>
                    {category.name}
                  </Text>
                  <Text
                    style={[
                      typography.amountCaption,
                      { color: colors.textTertiary, marginTop: 2 },
                    ]}
                  >
                    {formatMoney(category.spent ?? 0)} this month
                  </Text>
                </View>

                {categoryDelta === undefined ? null : (
                  <Text
                    style={[
                      typography.amountCaption,
                      {
                        color:
                          categoryDelta < -0.005 ? colors.positiveText : colors.textSecondary,
                      },
                    ]}
                  >
                    {Math.abs(categoryDelta) < 0.005
                      ? `Same as ${MOCK_LAST_MONTH.label}`
                      : `${formatSignedMoney(categoryDelta)} vs ${MOCK_LAST_MONTH.label}`}
                  </Text>
                )}
              </View>
            </CardRow>
          );
        })}
      </Card>
    </>
  );
}

/** Вкладка By day: столбики трат по дням и средний темп. */
function ByDayView({
  transactions,
  plannedTotal,
}: {
  transactions: MockTransaction[];
  plannedTotal: number;
}) {
  const days = recentDays(CHART_DAYS);
  const today = days[days.length - 1];

  const totalFor = (day: string) =>
    transactions
      .filter((transaction) => isExpense(transaction) && transaction.date === day)
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const totals = days.map(totalFor);
  const max = Math.max(1, ...totals);

  const lastSeven = recentDays(AVERAGE_DAYS).map(totalFor);
  const average = lastSeven.reduce((sum, value) => sum + value, 0) / AVERAGE_DAYS;
  const onPace = average <= plannedTotal / 30;

  return (
    <>
      <Card style={{ marginTop: 18 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Last {CHART_DAYS} days
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-end",
            gap: 6,
            height: 120,
            marginTop: 14,
          }}
        >
          {days.map((day, index) => {
            const current = day === today;
            return (
              <View
                key={day}
                style={{
                  flex: 1,
                  height: "100%",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 6,
                }}
              >
                <View
                  style={{
                    width: "100%",
                    height: Math.max(4, (totals[index] / max) * MAX_BAR_HEIGHT),
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    borderBottomLeftRadius: 3,
                    borderBottomRightRadius: 3,
                    backgroundColor: current ? colors.surfaceInverse : colors.border,
                  }}
                />
                <Text
                  style={[
                    typography.tabLabel,
                    { color: current ? colors.text : colors.textTertiary },
                  ]}
                >
                  {dayOfMonth(day)}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <Card style={{ marginTop: spacing.md, paddingVertical: 18 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Daily average, last {AVERAGE_DAYS} days
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            gap: spacing.sm,
            marginTop: 4,
          }}
        >
          <Text style={[typography.amountMedium, { color: colors.text }]}>
            {formatMoney(average)}
          </Text>
          <Text
            style={[
              typography.amountCaption,
              { color: onPace ? colors.positiveText : colors.textSecondary },
            ]}
          >
            {onPace ? "On pace for the month" : "A little above your daily pace"}
          </Text>
        </View>
      </Card>
    </>
  );
}

/** Вкладка Top expenses: самые крупные траты за последние 30 дней. */
function TopExpensesView({ transactions }: { transactions: MockTransaction[] }) {
  const router = useRouter();
  const window = new Set(recentDays(TOP_WINDOW_DAYS));

  const expenses = transactions.filter(
    (transaction) => isExpense(transaction) && window.has(transaction.date),
  );
  const top = expenses
    .slice()
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))
    .slice(0, TOP_COUNT);

  const windowTotal = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const topTotal = top.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const share = windowTotal > 0 ? Math.round((topTotal / windowTotal) * 100) : 0;

  if (top.length === 0) {
    return (
      <Card style={{ marginTop: 18 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Nothing spent in the last {TOP_WINDOW_DAYS} days.
        </Text>
      </Card>
    );
  }

  return (
    <>
      <Card list style={{ marginTop: 18 }}>
        {top.map((transaction, index) => (
          <CardRow
            key={transaction.id}
            first={index === 0}
            onPress={() => router.push(`/transaction/${transaction.id}`)}
          >
            <TransactionRow
              icon={transaction.icon}
              title={transaction.payee}
              subtitle={`${transaction.category} · ${formatDayLabel(transaction.date)}`}
              amount={transaction.amount}
            />
          </CardRow>
        ))}
      </Card>

      {/* Спокойная заметка на подложке, без тени — это не карточка-объект. */}
      <View
        style={{
          marginTop: spacing.md,
          backgroundColor: colors.surfaceNote,
          borderRadius: radius.dropdown,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          These {top.length} transactions add up to{" "}
          <Text style={[typography.amountCaption, { color: colors.text }]}>
            {formatMoney(topTotal)}
          </Text>{" "}
          — {share}% of the last {TOP_WINDOW_DAYS} days.
        </Text>
      </View>
    </>
  );
}

export default function SpendingScreen() {
  const { transactions, categories } = useStore();
  const [view, setView] = useState<SpendingView>("trend");

  const plannedTotal = categories
    .filter((category) => category.kind === "fixed")
    .reduce((sum, category) => sum + category.assigned, 0);

  return (
    <ModalScreen>
      {/* Сумму и месяц не повторяем: они уже видны на Home, откуда сюда пришли. */}
      <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.lg }]}>
        Spending
      </Text>

      <View style={{ marginTop: spacing.lg }}>
        <SegmentedControl
          compact
          value={view}
          onChange={setView}
          segments={[
            { value: "trend", label: "Trend" },
            { value: "day", label: "By day" },
            { value: "top", label: "Top expenses" },
          ]}
        />
      </View>

      {view === "trend" ? <TrendView categories={categories} /> : null}
      {view === "day" ? (
        <ByDayView transactions={transactions} plannedTotal={plannedTotal} />
      ) : null}
      {view === "top" ? <TopExpensesView transactions={transactions} /> : null}
    </ModalScreen>
  );
}
