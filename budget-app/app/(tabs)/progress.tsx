import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Card } from "../../components/Card";
import { DateRangePicker } from "../../components/DateRangePicker";
import { Icon } from "../../components/Icon";
import {
  ChartAxis,
  IncomeExpenseBars,
  LegendDot,
  SavingsChart,
  SpendingBars,
} from "../../components/InsightsCharts";
import { PeriodMenu, type MenuAnchor } from "../../components/PeriodMenu";
import { colors, radius, spacing, typography } from "../../constants/theme";
import {
  DEFAULT_PERIOD,
  MONTH_PRESETS,
  bucketsFor,
  categoryBreakdown,
  describeSelection,
  resolveWindow,
  savingsCurve,
  type Bucket,
  type PeriodSelection,
} from "../../lib/analytics";
import { formatMoney, formatMoneyShort, formatSignedMoney } from "../../lib/mock-data";
import { useStore } from "../../lib/store";

/** Сколько категорий показывать в разбивке по нажатому столбику. */
const BREAKDOWN_LIMIT = 3;

/**
 * Подпись периода — она же кнопка меню. Стоит на обеих карточках, где период
 * что-то значит, чтобы не заставлять уезжать к единственному переключателю
 * наверху экрана.
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

export default function InsightsScreen() {
  const insets = useSafeAreaInsets();
  const { transactions, categories } = useStore();

  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  // «Custom range…» выбран, но меню ещё закрывается — календарь ждёт своей
  // очереди, иначе iOS проглотит его показ.
  const [customPending, setCustomPending] = useState(false);
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
  const savingsPeriodRow = useRef<View>(null);

  const buckets = useMemo(
    () => bucketsFor(transactions, period),
    [transactions, period],
  );
  const unit = useMemo(
    () => resolveWindow(transactions, period).unit,
    [transactions, period],
  );

  const totalSaved = categories
    .filter((category) => category.kind === "savings")
    .reduce((sum, category) => sum + category.assigned, 0);

  const savings = useMemo(
    () => savingsCurve(transactions, unit, buckets, totalSaved),
    [transactions, unit, buckets, totalSaved],
  );

  const periodLabel = describeSelection(period, buckets);
  const unitWord = unit === "week" ? "week" : "month";

  const totalSpent = buckets.reduce((sum, bucket) => sum + bucket.spent, 0);
  const average = buckets.length > 0 ? totalSpent / buckets.length : 0;
  const netTotal = buckets.reduce((sum, bucket) => sum + bucket.net, 0);

  const findBucket = (key: string | null): Bucket | null =>
    key === null ? null : (buckets.find((bucket) => bucket.key === key) ?? null);

  const spendBucket = findBucket(spendKey);
  const flowBucket = findBucket(flowKey);

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
  const savedDelta =
    savings.length > 1 ? savings[savings.length - 1] - savings[0] : 0;

  const applyPeriod = (next: PeriodSelection) => {
    setPeriod(next);
    setSpendKey(null);
    setFlowKey(null);
    setSavIndex(null);
    setMenuOpen(false);
  };

  const openMenu = (row: React.RefObject<View | null>) => {
    row.current?.measureInWindow((x, y, _width, height) => {
      setAnchor({ top: y + height + 6, triggerTop: y, left: x });
      setMenuOpen(true);
    });
  };

  const toggle = (
    key: string,
    current: string | null,
    set: (value: string | null) => void,
  ) => set(current === key ? null : key);

  const spendDiff = spendBucket ? spendBucket.spent - average : 0;
  const customWindow = resolveWindow(transactions, period);

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
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}
        >
          {periodLabel}
        </Text>

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
              Spending by {unitWord}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              avg {formatMoneyShort(average)}
            </Text>
          </View>

          <View style={{ marginTop: 2 }}>
            <PeriodButton
              label={periodLabel}
              innerRef={spendPeriodRow}
              onPress={() => openMenu(spendPeriodRow)}
            />
          </View>

          {/* Пресеты по месяцам под рукой: это самый частый выбор, ради него
              не стоит каждый раз открывать меню. Остальное — в меню выше. */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: spacing.md }}>
            {MONTH_PRESETS.map((preset) => {
              const active =
                period.kind === "preset" &&
                period.unit === "month" &&
                period.count === preset.count;
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() =>
                    applyPeriod({ kind: "preset", unit: "month", count: preset.count })
                  }
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: radius.pill,
                    backgroundColor: active ? colors.surfaceInverse : colors.surfaceField,
                  }}
                >
                  <Text
                    style={[
                      typography.segmentLabel,
                      {
                        fontSize: 12,
                        color: active ? colors.textInverse : colors.textSecondary,
                      },
                    ]}
                  >
                    {preset.short}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: spacing.lg }}>
            <SpendingBars
              buckets={buckets}
              selectedKey={spendKey}
              onSelect={(key) => toggle(key, spendKey, setSpendKey)}
            />
          </View>

          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: spacing.md },
            ]}
          >
            {formatMoney(totalSpent)} over {buckets.length}{" "}
            {buckets.length === 1 ? unitWord : `${unitWord}s`}
          </Text>

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
                {formatSignedMoney(spendDiff)} vs average
              </Text>

              <View style={{ marginTop: 10, gap: 6 }}>
                {breakdown.length === 0 ? (
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>
                    Nothing spent in this {unitWord}.
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
              {formatSignedMoney(netTotal)} net
            </Text>
          </View>

          <View style={{ marginTop: 18 }}>
            <IncomeExpenseBars
              buckets={buckets}
              selectedKey={flowKey}
              onSelect={(key) => toggle(key, flowKey, setFlowKey)}
            />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
            <LegendDot color={colors.positive} label="Income" />
            <LegendDot color={colors.surfaceInverse} label="Spending" />
          </View>

          {flowBucket ? (
            <DetailPanel>
              <Text style={[typography.rowTitle, { color: colors.text }]}>
                {flowBucket.label}
              </Text>
              <View style={{ marginTop: 10, gap: 6 }}>
                <DetailRow name="Income" amount={formatMoney(flowBucket.income)} />
                <DetailRow name="Expenses" amount={formatMoney(flowBucket.spent)} />
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
            <Text
              style={[
                typography.amountCaption,
                { color: savedDelta >= 0 ? colors.positiveText : colors.text },
              ]}
            >
              {formatSignedMoney(savedDelta)}
            </Text>
          </View>

          <View style={{ marginTop: 2 }}>
            <PeriodButton
              label={periodLabel}
              innerRef={savingsPeriodRow}
              onPress={() => openMenu(savingsPeriodRow)}
            />
          </View>

          <Text style={[typography.amount, { color: colors.text, marginTop: 6 }]}>
            {formatMoney(savings[savActive] ?? totalSaved)}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
            {buckets[savActive]?.label ?? ""}
          </Text>

          <View style={{ marginTop: 10 }}>
            <SavingsChart values={savings} index={savActive} onScrub={setSavIndex} />
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <ChartAxis buckets={buckets} activeIndex={savActive} />
          </View>
        </Card>
      </ScrollView>

      <PeriodMenu
        visible={menuOpen}
        value={period}
        anchor={anchor}
        onSelect={applyPeriod}
        onCustom={() => {
          setCustomPending(true);
          setMenuOpen(false);
        }}
        onClose={() => setMenuOpen(false)}
        onDismissed={() => {
          if (!customPending) return;
          setCustomPending(false);
          setCustomOpen(true);
        }}
      />

      {customOpen ? (
        <DateRangePicker
          from={customWindow.from}
          to={customWindow.to}
          onApply={(from, to) => {
            applyPeriod({ kind: "custom", from, to });
            setCustomOpen(false);
          }}
          onClose={() => setCustomOpen(false)}
        />
      ) : null}
    </View>
  );
}
