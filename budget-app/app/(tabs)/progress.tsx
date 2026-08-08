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
 * Меню периода у «Spending by month»: два пресета и произвольный диапазон.
 *
 * Недель тут нет намеренно — карточка про помесячный ритм трат, а недельная
 * разбивка за полгода превращает её в частокол. Полный набор остался у
 * накоплений, где длинный ряд точек читается.
 */
const SPENDING_PRESET_COUNTS = [3, 6];

const SPENDING_PERIOD_OPTIONS: PeriodOption[] = [
  ...MONTH_PRESETS.filter((preset) => SPENDING_PRESET_COUNTS.includes(preset.count)).map(
    (preset) => ({
      label: preset.label,
      selection: { kind: "preset", unit: "month", count: preset.count } as const,
    }),
  ),
  { label: "Custom range…", selection: null },
];

/** Какая из карточек открыла меню периода — у них независимые периоды. */
type PeriodTarget = "spending" | "overview";

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

  // У «Spending by month» свой период, у двух нижних карточек — общий.
  // Разные вопросы: «куда уходили деньги в последние месяцы» и «как идут
  // дела в целом» разглядывают на разной глубине, и один переключатель на
  // всех заставлял бы переставлять его туда-обратно.
  const [spendingPeriod, setSpendingPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [overviewPeriod, setOverviewPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);

  /** Какая карточка сейчас выбирает период; null — меню закрыто. */
  const [menuTarget, setMenuTarget] = useState<PeriodTarget | null>(null);
  const [customTarget, setCustomTarget] = useState<PeriodTarget | null>(null);
  // «Custom range…» выбран, но меню ещё закрывается — календарь ждёт своей
  // очереди, иначе iOS проглотит его показ.
  const [customPending, setCustomPending] = useState<PeriodTarget | null>(null);
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

  const spendBuckets = useMemo(
    () => bucketsFor(transactions, spendingPeriod),
    [transactions, spendingPeriod],
  );
  const spendUnit = useMemo(
    () => resolveWindow(transactions, spendingPeriod).unit,
    [transactions, spendingPeriod],
  );

  const overviewBuckets = useMemo(
    () => bucketsFor(transactions, overviewPeriod),
    [transactions, overviewPeriod],
  );
  const overviewUnit = useMemo(
    () => resolveWindow(transactions, overviewPeriod).unit,
    [transactions, overviewPeriod],
  );

  const totalSaved = categories
    .filter((category) => category.kind === "savings")
    .reduce((sum, category) => sum + category.assigned, 0);

  const savings = useMemo(
    () => savingsCurve(transactions, overviewUnit, overviewBuckets, totalSaved),
    [transactions, overviewUnit, overviewBuckets, totalSaved],
  );

  const spendingLabel = describeSelection(spendingPeriod, spendBuckets);
  const overviewLabel = describeSelection(overviewPeriod, overviewBuckets);
  const spendUnitWord = spendUnit === "week" ? "week" : "month";

  const totalSpent = spendBuckets.reduce((sum, bucket) => sum + bucket.spent, 0);
  const average = spendBuckets.length > 0 ? totalSpent / spendBuckets.length : 0;
  const netTotal = overviewBuckets.reduce((sum, bucket) => sum + bucket.net, 0);

  const findBucket = (list: Bucket[], key: string | null): Bucket | null =>
    key === null ? null : (list.find((bucket) => bucket.key === key) ?? null);

  const spendBucket = findBucket(spendBuckets, spendKey);
  const flowBucket = findBucket(overviewBuckets, flowKey);

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

  const applyPeriod = (target: PeriodTarget, next: PeriodSelection) => {
    if (target === "spending") {
      setSpendingPeriod(next);
      // Выделенный столбик сбрасываем: за новый период его корзины уже нет.
      setSpendKey(null);
    } else {
      setOverviewPeriod(next);
      setFlowKey(null);
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

  // Календарь открывается на том диапазоне, который у карточки сейчас.
  const customWindow = resolveWindow(
    transactions,
    customTarget === "spending" ? spendingPeriod : overviewPeriod,
  );

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
        {/* Подпись под заголовком относится к карточке прямо под ней —
            у накоплений период свой и подписан на самой карточке. */}
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}
        >
          {spendingLabel}
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
              Spending by {spendUnitWord}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              avg {formatMoneyShort(average)}
            </Text>
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
            <SpendingBars
              buckets={spendBuckets}
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
            {formatMoney(totalSpent)} over {spendBuckets.length}{" "}
            {spendBuckets.length === 1 ? spendUnitWord : `${spendUnitWord}s`}
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
                    Nothing spent in this {spendUnitWord}.
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
              buckets={overviewBuckets}
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
              label={overviewLabel}
              innerRef={savingsPeriodRow}
              onPress={() => openMenu("overview", savingsPeriodRow)}
            />
          </View>

          <Text style={[typography.amount, { color: colors.text, marginTop: 6 }]}>
            {formatMoney(savings[savActive] ?? totalSaved)}
          </Text>
          <Text style={[typography.captionSmall, { color: colors.textTertiary }]}>
            {overviewBuckets[savActive]?.label ?? ""}
          </Text>

          <View style={{ marginTop: 10 }}>
            <SavingsChart values={savings} index={savActive} onScrub={setSavIndex} />
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <ChartAxis buckets={overviewBuckets} activeIndex={savActive} />
          </View>
        </Card>
      </ScrollView>

      <PeriodMenu
        visible={menuTarget !== null}
        value={menuTarget === "spending" ? spendingPeriod : overviewPeriod}
        anchor={anchor}
        // У трат — короткий плоский список, у накоплений остаётся полный.
        options={menuTarget === "spending" ? SPENDING_PERIOD_OPTIONS : undefined}
        onSelect={(next) => applyPeriod(menuTarget ?? "overview", next)}
        onCustom={() => {
          setCustomPending(menuTarget);
          setMenuTarget(null);
        }}
        onClose={() => setMenuTarget(null)}
        onDismissed={() => {
          if (customPending === null) return;
          setCustomTarget(customPending);
          setCustomPending(null);
        }}
      />

      {customTarget !== null ? (
        <DateRangePicker
          from={customWindow.from}
          to={customWindow.to}
          onApply={(from, to) => {
            applyPeriod(customTarget, { kind: "custom", from, to });
            setCustomTarget(null);
          }}
          onClose={() => setCustomTarget(null)}
        />
      ) : null}
    </View>
  );
}
