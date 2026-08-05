import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, CardRow } from "../components/Card";
import { CircleButton } from "../components/CircleButton";
import { Icon } from "../components/Icon";
import { MonthPicker } from "../components/MonthPicker";
import { TransactionRow } from "../components/TransactionRow";
import { colors, spacing, typography } from "../constants/theme";
import {
  formatDayLabel,
  formatMonthKey,
  monthKeyOf,
  type MockTransaction,
} from "../lib/mock-data";
import { useStore } from "../lib/store";

type Day = { key: string; label: string; items: MockTransaction[] };

/** Транзакции месяца, сгруппированные по дню, от свежих к старым. */
function groupByDay(transactions: MockTransaction[]): Day[] {
  const days: Day[] = [];

  for (const transaction of [...transactions].sort((a, b) => b.date.localeCompare(a.date))) {
    let day = days.find((item) => item.key === transaction.date);
    if (!day) {
      day = { key: transaction.date, label: formatDayLabel(transaction.date), items: [] };
      days.push(day);
    }
    day.items.push(transaction);
  }

  return days;
}

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { transactions } = useStore();

  const months = useMemo(
    () =>
      [...new Set(transactions.map((transaction) => monthKeyOf(transaction.date)))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [transactions],
  );

  // null — «ещё не выбирали»: показываем самый свежий месяц из данных.
  const [month, setMonth] = useState<string | null>(null);
  const selectedMonth = month ?? months[0] ?? "";

  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number }>({
    top: 0,
    left: spacing.xl,
  });
  const monthRow = useRef<View>(null);

  // Позицию списка меряем в окне: экран скроллится, и фиксированный отступ
  // сверху уехал бы вместе с содержимым.
  const openPicker = () => {
    monthRow.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ top: y + height + 6, left: x });
      setPickerOpen(true);
    });
  };

  const days = useMemo(
    () => groupByDay(transactions.filter((t) => monthKeyOf(t.date) === selectedMonth)),
    [transactions, selectedMonth],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 11,
          paddingBottom: spacing.xxxl,
        }}
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          <View style={{ flexDirection: "row" }}>
            <CircleButton
              icon="chevronLeft"
              label="Back"
              glyphSize={17}
              onPress={() => router.back()}
            />
          </View>

          <Text style={[typography.screenTitle, { color: colors.text, marginTop: 14 }]}>
            Activity
          </Text>

          <View ref={monthRow} style={{ alignSelf: "flex-start" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose month"
              onPress={openPicker}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 3,
                paddingVertical: 2,
              }}
            >
              <Text style={[typography.rowTitle, { color: colors.textSecondary }]}>
                {formatMonthKey(selectedMonth)}
              </Text>
              <Icon name="chevronDown" size={11} color={colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {days.map((day) => (
          <View key={day.key} style={{ marginTop: spacing.xl }}>
            <Text
              style={[
                typography.overline,
                {
                  color: colors.textTertiary,
                  paddingHorizontal: 34,
                  paddingBottom: spacing.sm,
                },
              ]}
            >
              {day.label}
            </Text>
            <Card list style={{ marginHorizontal: spacing.lg }}>
              {day.items.map((transaction, index) => (
                <CardRow
                  key={transaction.id}
                  first={index === 0}
                  onPress={() => router.push(`/transaction/${transaction.id}`)}
                >
                  <TransactionRow
                    icon={transaction.icon}
                    title={transaction.payee}
                    subtitle={transaction.category}
                    amount={transaction.amount}
                  />
                </CardRow>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>

      <MonthPicker
        visible={pickerOpen}
        months={months}
        value={selectedMonth}
        anchor={anchor}
        onSelect={(next) => {
          setMonth(next);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
    </View>
  );
}
