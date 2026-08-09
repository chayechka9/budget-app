import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../components/Card";
import { Icon } from "../../components/Icon";
import {
  ChartAxis,
  IncomeExpenseBars,
  LegendDot,
  SPEND_CHART_HEIGHT,
  SavingsChart,
  SpendingBars,
} from "../../components/InsightsCharts";
import {
  PeriodMenu,
  type MenuAnchor,
  type PeriodOption,
} from "../../components/PeriodMenu";
import { colors, radius, spacing, typography } from "../../constants/theme";
import {
  DEFAULT_PERIOD,
  MONTH_PRESETS,
  bucketsFor,
  categoryBreakdown,
  describeSelection,
  savingsCurve,
  type Bucket,
  type PeriodSelection,
} from "../../lib/analytics";
import { formatMoney, formatSignedMoney } from "../../lib/money";
import { useStore } from "../../lib/store";

/** Сколько категорий показывать в разбивке по нажатому столбику. */
const BREAKDOWN_LIMIT = 3;

/**
 * Во всех трёх карточках один короткий набор помесячных периодов. Состояние
 * выбора у каждой карточки своё.
 */
const INSIGHTS_PRESET_COUNTS = [3, 6, 12];

const INSIGHTS_PERIOD_OPTIONS: PeriodOption[] = MONTH_PRESETS.filter((preset) =>
  INSIGHTS_PRESET_COUNTS.includes(preset.count),
).map((preset) => ({
  label: preset.label,
  selection: { kind: "preset", count: preset.count } as const,
}));

/** Какая из карточек открыла меню периода — у них независимые периоды. */
type PeriodTarget = "spending" | "flow" | "savings";

/**
 * Подпись периода — она же кнопка меню внутри соответствующей карточки.
 */
function PeriodButton({
  label,
  onPress,
  innerRef,
}: {
  label: string;
  onPress: () => void;
  innerRef: React.RefObject<View | null>;
}) {
  return (
    <View ref={innerRef} style={{ alignSelf: "flex-start" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose period"
        onPress={onPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 5,
          paddingVertical: 2,
        }}
      >
        <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Icon name="chevronDown" size={11} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/** Спокойная заметка внутри карточки — подложка без тени, не отдельный объект. */
function DetailPanel({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        marginTop: spacing.md,
        paddingVertical: 14,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.dropdown,
        backgroundColor: colors.surfaceNote,
      }}
    >
      {children}
    </View>
  );
}

function DetailRow({
  name,
  amount,
  strong = false,
  topBorder = false,
}: {
  name: string;
  amount: string;
  strong?: boolean;
  topBorder?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingTop: topBorder ? 5 : 0,
        borderTopWidth: topBorder ? 0.5 : 0,
        borderTopColor: colors.separator,
      }}
    >
      <Text style={[typography.caption, { color: colors.textSecondary }]}>{name}</Text>
      <Text
        style={[
          typography.amountCaption,
          { color: colors.text, fontSize: 13, fontWeight: strong ? "700" : "600" },
        ]}
      >
        {amount}
      </Text>
    </View>
  );
}

/** Пустой график сохраняет высоту карточки и не добавляет визуального шума. */
function EmptyState({ label, height }: { label: string; height: number }) {
  return (
    <View style={{ height, alignItems: "center", justifyContent: "center" }}>
      <Text style={[typography.caption, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, categories } = useStore();

  const [spendingPeriod, setSpendingPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [flowPeriod, setFlowPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [savingsPeriod, setSavingsPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);

  /** Какая карточка сейчас выбирает период; null — меню закрыто. */
  const [menuTarget, setMenuTarget] = useState<PeriodTarget | null>(null);
  const [anchor, setAnchor] = useState<MenuAnchor>({
    top: 0,
    triggerTop: 0,
    left: spacing.xl,
  });

  // Выбранный столбик хранится ключом корзины, а не индексом: при смене
  // периода индексы разъезжаются и выделение перескакивало бы на чужой месяц.
  const [spendKey, setSpendKey] = useState<string | null>(null);
  const [flowKey, setFlowKey] = useState<string | null>(null);
  const [savIndex, setSavIndex] = useState<number | null>(null);

  const spendPeriodRow = useRef<View>(null);
  const flowPeriodRow = useRef<View>(null);
  const savingsPeriodRow = useRef<View>(null);

  const spendBuckets = useMemo(
    () => bucketsFor(transactions, spendingPeriod),
    [transactions, spendingPeriod],
  );
  const flowBuckets = useMemo(
    () => bucketsFor(transactions, flowPeriod),
    [transactions, flowPeriod],
  );
  const savingsBuckets = useMemo(
    () => bucketsFor(transactions, savingsPeriod),
    [transactions, savingsPeriod],
  );

  const totalSaved = categories
    .filter((category) => category.kind === "savings")
    .reduce((sum, category) => sum + category.assigned, 0);

  const savings = useMemo(
    () => savingsCurve(transactions, savingsBuckets, totalSaved),
    [transactions, savingsBuckets, totalSaved],
  );

  const spendingLabel = describeSelection(spendingPeriod, spendBuckets);
  const flowLabel = describeSelection(flowPeriod, flowBuckets);
  const savingsLabel = describeSelection(savingsPeriod, savingsBuckets);

  const totalSpent = spendBuckets.reduce((sum, bucket) => sum + bucket.spent, 0);
  const average = spendBuckets.length > 0 ? totalSpent / spendBuckets.length : 0;
  const netTotal = flowBuckets.reduce((sum, bucket) => sum + bucket.net, 0);
  const hasSpending = spendBuckets.some((bucket) => bucket.spent > 0);
  const hasFlow = flowBuckets.some(
    (bucket) => bucket.income > 0 || bucket.spent > 0,
  );
  const hasSavings = totalSaved > 0 && savings.length > 0;

  const findBucket = (list: Bucket[], key: string | null): Bucket | null =>
    key === null ? null : (list.find((bucket) => bucket.key === key) ?? null);

  const spendBucket = findBucket(spendBuckets, spendKey);
  const flowBucket = findBucket(flowBuckets, flowKey);

  const breakdown = useMemo(
    () =>
      spendBucket ? categoryBreakdown(transactions, spendBucket, BREAKDOWN_LIMIT) : [],
    [transactions, spendBucket],
  );

  // Пока по линии не водили — показываем свежую точку. Индекс мог остаться от
  // более длинного периода, поэтому подрезаем его по текущей длине.
  const savActive =
    savings.length === 0
      ? 0
      : Math.min(savIndex ?? savings.length - 1, savings.length - 1);
  const savedChange =
    savActive > 0 ? savings[savActive] - savings[savActive - 1] : 0;

  const applyPeriod = (target: PeriodTarget, next: PeriodSelection) => {
    if (target === "spending") {
      setSpendingPeriod(next);
      setSpendKey(null);
    } else if (target === "flow") {
      setFlowPeriod(next);
      setFlowKey(null);
    } else {
      setSavingsPeriod(next);
      setSavIndex(null);
    }
    setMenuTarget(null);
  };

  const openMenu = (target: PeriodTarget, row: React.RefObject<View | null>) => {
    row.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ top: y + height + 6, triggerTop: y, left: x });
      setMenuTarget(target);
    });
  };

  const toggle = (
    key: string,
    current: string | null,
    set: (value: string | null) => void,
  ) => set(current === key ? null : key);

  const spendDiff = spendBucket ? spendBucket.spent - average : 0;

  const menuValue =
    menuTarget === "flow"
      ? flowPeriod
      : menuTarget === "savings"
        ? savingsPeriod
        : spendingPeriod;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 19,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xxxl,
        }}
      >
        <Text style={[typography.screenTitle, { color: colors.text }]}>Insights</Text>

        {/* ── Траты по периодам ── */}
        <Card style={{ marginTop: spacing.xl }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text style={[typography.headline, { color: colors.text }]}>
              Spending by month
            </Text>
            {hasSpending ? (
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                avg {formatMoney(average)}
              </Text>
            ) : null}
          </View>

          {/* Период выбирается только отсюда: ряд пресетов рядом с этой же
              подписью дублировал бы один и тот же выбор двумя контролами. */}
          <View style={{ marginTop: 2 }}>
            <PeriodButton
              label={spendingLabel}
              innerRef={spendPeriodRow}
              onPress={() => openMenu("spending", spendPeriodRow)}
            />
          </View>

          <View style={{ marginTop: spacing.lg }}>
            {hasSpending ? (
              <SpendingBars
                buckets={spendBuckets}
                selectedKey={spendKey}
                onSelect={(key) => toggle(key, spendKey, setSpendKey)}
              />
            ) : (
              <EmptyState label="No spending" height={SPEND_CHART_HEIGHT} />
            )}
          </View>

          {spendBucket ? (
            <DetailPanel>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Text style={[typography.rowTitle, { color: colors.text }]}>
                  {spendBucket.label}
                </Text>
                <Text style={[typography.amountRow, { color: colors.text }]}>
                  {formatMoney(spendBucket.spent)}
                </Text>
              </View>
              <Text
                style={[
                  typography.amountCaption,
                  {
                    marginTop: 2,
                    color:
                      spendDiff > 0.5
                        ? colors.overspend
                        : spendDiff < -0.5
                          ? colors.positiveText
                          : colors.textSecondary,
                  },
                ]}
              >
                {formatSignedMoney(spendDiff)} vs avg
              </Text>

              <View style={{ marginTop: 10, gap: 6 }}>
                {breakdown.length === 0 ? (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    No spending
                  </Text>
                ) : (
                  breakdown.map((item) => (
                    <DetailRow
                      key={item.name}
                      name={item.name}
                      amount={formatMoney(item.amount)}
                    />
                  ))
                )}
              </View>
            </DetailPanel>
          ) : null}
        </Card>

        {/* ── Доход против трат ── */}
        <Card style={{ marginTop: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text style={[typography.headline, { color: colors.text }]}>
              Income vs Expenses
            </Text>
            <Text
              style={[
                typography.amountCaption,
                { color: netTotal >= 0 ? colors.positiveText : colors.text },
              ]}
            >
              {hasFlow ? `${formatSignedMoney(netTotal)} net` : ""}
            </Text>
          </View>

          <View style={{ marginTop: 2 }}>
            <PeriodButton
              label={flowLabel}
              innerRef={flowPeriodRow}
              onPress={() => openMenu("flow", flowPeriodRow)}
            />
          </View>

          <View style={{ marginTop: 18 }}>
            {hasFlow ? (
              <IncomeExpenseBars
                buckets={flowBuckets}
                selectedKey={flowKey}
                onSelect={(key) => toggle(key, flowKey, setFlowKey)}
              />
            ) : (
              <EmptyState label="No transactions" height={112} />
            )}
          </View>

          {hasFlow ? (
            <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
              <LegendDot color={colors.positive} label="Income" />
              <LegendDot color={colors.surfaceInverse} label="Spending" />
            </View>
          ) : null}

          {flowBucket ? (
            <DetailPanel>
              <Text style={[typography.rowTitle, { color: colors.text }]}>
                {flowBucket.label}
              </Text>
              <View style={{ marginTop: 10, gap: 6 }}>
                <DetailRow name="Income" amount={formatMoney(flowBucket.income)} />
                <DetailRow name="Spending" amount={formatMoney(flowBucket.spent)} />
                <DetailRow
                  topBorder
                  strong
                  name="Net"
                  amount={formatSignedMoney(flowBucket.net)}
                />
              </View>
            </DetailPanel>
          ) : null}
        </Card>

        {/* ── Накопления ── */}
        <Card style={{ marginTop: spacing.lg }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Text style={[typography.headline, { color: colors.text }]}>
              Savings growth
            </Text>
          </View>

          <View style={{ marginTop: 2 }}>
            <PeriodButton
              label={savingsLabel}
              innerRef={savingsPeriodRow}
              onPress={() => openMenu("savings", savingsPeriodRow)}
            />
          </View>

          {hasSavings ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginTop: 6,
                }}
              >
                <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
                  {savingsBuckets[savActive]?.label ?? ""}
                </Text>
                <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
                  Change {formatSignedMoney(savedChange)}
                </Text>
              </View>
              <Text style={[typography.amount, { color: colors.text }]}>
                {formatMoney(savings[savActive])}
              </Text>

              <View style={{ marginTop: 10 }}>
                <SavingsChart values={savings} index={savActive} onScrub={setSavIndex} />
              </View>

              <View style={{ marginTop: spacing.sm }}>
                <ChartAxis buckets={savingsBuckets} activeIndex={savActive} />
              </View>
            </>
          ) : (
            <EmptyState label="No savings data" height={158} />
          )}
        </Card>
      </ScrollView>

      <PeriodMenu
        visible={menuTarget !== null}
        value={menuValue}
        anchor={anchor}
        options={INSIGHTS_PERIOD_OPTIONS}
        onSelect={(next) => applyPeriod(menuTarget ?? "spending", next)}
        onClose={() => setMenuTarget(null)}
      />
    </View>
  );
}
