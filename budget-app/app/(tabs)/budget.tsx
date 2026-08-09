import { useRouter } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card, CardRow } from "../../components/Card";
import { CategoryCard } from "../../components/CategoryCard";
import { CircleButton } from "../../components/CircleButton";
import { Icon } from "../../components/Icon";
import { MonthPicker } from "../../components/MonthPicker";
import { ProgressRing, spendProgress } from "../../components/Progress";
import { ReadyToAssignPill } from "../../components/ReadyToAssignPill";
import { colors, radius, spacing, typography } from "../../constants/theme";
import {
  currentMonthKey,
  monthKeyOfDate,
  monthKeysTo,
  spentByCategoryIn,
} from "../../lib/analytics";
import { MOCK_LAST_MONTH, formatMoney, formatMonthKey } from "../../lib/mock-data";
import { useStore, type ResolvedCategory } from "../../lib/store";

/**
 * Категория в разрезе выбранного месяца: та же модель, но `spent` относится
 * к месяцу, который сейчас выбран, а не «вообще».
 */
type MonthCategory = ResolvedCategory & { spent: number };

type MonthGroup = { id: string; name: string; categories: MonthCategory[] };

/**
 * Fixed-категория: слева потрачено из плана, справа остаток. Перерасход
 * виден красным хвостом полосы — сумма остаётся нейтральной.
 */
function FixedRow({ category }: { category: MonthCategory }) {
  const remaining = category.assigned - category.spent;
  const bar = spendProgress(category.spent, category.assigned);

  return (
    <CategoryCard
      name={category.name}
      icon={category.icon}
      value={formatMoney(remaining)}
      progress={bar.value}
      overspend={bar.overspend}
      caption={`${formatMoney(category.spent)} of ${formatMoney(category.assigned)}`}
    />
  );
}

/** Savings-категория: накопленное с кольцом прогресса справа. */
function SavingsRow({ category }: { category: MonthCategory }) {
  const hasTarget = typeof category.target === "number" && category.target > 0;
  const ratio = hasTarget ? category.assigned / (category.target as number) : 0;

  return (
    <CategoryCard
      name={category.name}
      icon={category.icon}
      value={hasTarget ? `${Math.round(ratio * 100)}%` : "No goal"}
      caption={
        hasTarget
          ? `${formatMoney(category.assigned)} of ${formatMoney(category.target as number)}`
          : `${formatMoney(category.assigned)} saved`
      }
      accessory={hasTarget ? <ProgressRing value={ratio} /> : undefined}
    />
  );
}

/**
 * Месяц, в котором не было ни одной траты. В макете такой месяц просто
 * схлопывает все группы и оставляет пустоту — вместо неё показываем спокойную
 * заметку на подложке, тем же тоном, что и остальные пустые состояния.
 */
function EmptyMonth({ monthKey }: { monthKey: string }) {
  return (
    <Card style={{ marginTop: 22, marginHorizontal: spacing.lg }}>
      <Text style={[typography.headline, { color: colors.text }]}>
        Nothing recorded
      </Text>
      <Text
        style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}
      >
        There are no transactions in {formatMonthKey(monthKey)}.
      </Text>
    </Card>
  );
}

export default function BudgetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groups, readyToAssign, transactions } = useStore();

  const thisMonth = currentMonthKey();

  // null — «месяц ещё не выбирали»: открыт текущий, как в макете.
  const [month, setMonth] = useState<string | null>(null);
  const selected = month ?? thisMonth;
  const isCurrent = selected === thisMonth;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number }>({
    top: 0,
    left: spacing.xl,
  });
  const monthRow = useRef<View>(null);

  const months = useMemo(
    () => monthKeysTo(transactions, thisMonth),
    [transactions, thisMonth],
  );
  const monthsWithData = useMemo(
    () => [...new Set(transactions.map((transaction) => monthKeyOfDate(transaction.date)))],
    [transactions],
  );

  // Позицию меряем в окне: экран скроллится, и фиксированный отступ сверху
  // уехал бы вместе с содержимым.
  const openPicker = () => {
    monthRow.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ top: y + height + 6, left: x });
      setPickerOpen(true);
    });
  };

  const spentByCategory = useMemo(
    () => spentByCategoryIn(transactions, selected),
    [transactions, selected],
  );

  /**
   * Группы за выбранный месяц.
   *
   * Текущий месяц отдаётся как есть: `spent` у категории уже про него, и
   * пересчитывать его через транзакции значит развести Budget с Home.
   *
   * У прошлого месяца плана и накоплений в данных нет — они существуют только
   * «на сейчас». Поэтому показываем ровно то, что известно: фактические траты
   * из транзакций этого месяца, и только по тем категориям, где траты были.
   * Придумывать историю плана или накоплений нельзя — это были бы числа
   * из ниоткуда.
   */
  const monthGroups = useMemo<MonthGroup[]>(() => {
    if (isCurrent) {
      return groups.map((group) => ({
        id: group.id,
        name: group.name,
        categories: group.categories.map((category) => ({
          ...category,
          spent: category.spent ?? 0,
        })),
      }));
    }

    return groups
      .map((group) => ({
        id: group.id,
        name: group.name,
        categories: group.categories
          .filter((category) => category.kind === "fixed")
          .map((category) => ({
            ...category,
            spent: category.matchNames.reduce(
              (sum, name) => sum + (spentByCategory[name] ?? 0),
              0,
            ),
          }))
          .filter((category) => category.spent > 0),
      }))
      .filter((group) => group.categories.length > 0);
  }, [groups, isCurrent, spentByCategory]);

  const fixed = monthGroups.flatMap((group) =>
    group.categories.filter((category) => category.kind === "fixed"),
  );

  // Общий план — сумма планов месяца, а не число из макета.
  const plannedTotal = fixed.reduce((sum, category) => sum + category.assigned, 0);
  const leftOver = fixed.reduce(
    (sum, category) => sum + Math.max(0, category.assigned - category.spent),
    0,
  );

  // Прошлый месяц уже подведён на Home и на экране Wrapped up — Budget обязан
  // называть тот же остаток, иначе один и тот же июль показывает два числа.
  const isWrappedUp = months[1] !== undefined && selected === months[1];
  const closedLine = isWrappedUp
    ? `${formatMoney(MOCK_LAST_MONTH.leftUnspent)} rolled forward`
    : `${formatMoney(leftOver)} left over`;

  // В месяце без единой записи остаток считать не из чего: «€0 left over»
  // читалось бы как «бюджет был, и всё потрачено под ноль».
  const subLine = isCurrent
    ? `${formatMoney(plannedTotal)} planned`
    : monthGroups.length === 0
      ? "Closed"
      : `Closed · ${closedLine}`;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 19, paddingBottom: spacing.xxxl }}
      >
        <View style={{ paddingHorizontal: spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[typography.screenTitle, { color: colors.text }]}>Budget</Text>
            {/* Заводить категорию можно только в открытом месяце: в закрытом
                ей неоткуда взять ни плана, ни трат. Так же и в макете. */}
            {isCurrent ? (
              <CircleButton
                icon="add"
                label="New category"
                size={36}
                glyphSize={17}
                onPress={() => router.push("/category-form")}
              />
            ) : null}
          </View>

          <View ref={monthRow} style={{ alignSelf: "flex-start" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose month"
              onPress={openPicker}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
                paddingVertical: 2,
              }}
            >
              <Text style={[typography.rowTitle, { color: colors.text }]}>
                {formatMonthKey(selected)}
              </Text>
              <View style={{ transform: [{ rotate: pickerOpen ? "180deg" : "0deg" }] }}>
                <Icon name="chevronDown" size={11} color={colors.textSecondary} />
              </View>
            </Pressable>
          </View>

          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {subLine}
          </Text>

          {/* Ready to assign относится к деньгам, которые можно разложить
              сейчас, поэтому в закрытом месяце его нет. */}
          {isCurrent ? (
            <View style={{ marginTop: 14, flexDirection: "row" }}>
              <ReadyToAssignPill
                amount={formatMoney(readyToAssign)}
                onPress={() => router.push("/assign")}
              />
            </View>
          ) : null}
        </View>

        {monthGroups.length === 0 ? (
          <EmptyMonth monthKey={selected} />
        ) : (
          monthGroups.map((group) => (
            <View key={group.id} style={{ marginTop: 22 }}>
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
                {group.name}
              </Text>
              <Card list style={{ marginHorizontal: spacing.lg }}>
                {group.categories.map((category, index) => (
                  <CardRow
                    key={category.id}
                    first={index === 0}
                    // В закрытом месяце строка не открывается: детали категории
                    // показывают её сегодняшнее состояние, а не тогдашнее.
                    onPress={
                      isCurrent
                        ? () => router.push(`/category/${category.id}`)
                        : undefined
                    }
                  >
                    {category.kind === "savings" ? (
                      <SavingsRow category={category} />
                    ) : (
                      <FixedRow category={category} />
                    )}
                  </CardRow>
                ))}
              </Card>
            </View>
          ))
        )}
      </ScrollView>

      <MonthPicker
        visible={pickerOpen}
        months={months}
        monthsWithData={monthsWithData}
        value={selected}
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
