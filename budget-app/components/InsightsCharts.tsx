import { useRef, useState, type PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

import { colors, radius, typography } from "../constants/theme";
import { labelStep, type Bucket } from "../lib/analytics";
import { formatMoney } from "../lib/mock-data";

/** Больше этого числа столбиков в ширину экрана уже не помещается. */
const FIT_LIMIT = 6;

const BAR_GAP = 6;

/**
 * Столбики трат заметно выше, чем в компактном Income vs Expenses: это
 * главный график экрана, и разница между месяцами по нему должна читаться
 * без вглядывания. Высота области — столбик плюс две строки подписей.
 */
const SPEND_BAR_MAX_HEIGHT = 150;
const SPEND_CHART_HEIGHT = 196;

/** Ширина столбика в режиме прокрутки — на год колонки ужимаются. */
function columnWidth(count: number): number {
  return count <= 12 ? 46 : 30;
}

/**
 * Подписывать ли ось под этим столбиком. Считаем от свежего края, чтобы
 * текущий период был подписан всегда — по нему читается вся шкала.
 */
function isLabelled(index: number, count: number): boolean {
  return (count - 1 - index) % labelStep(count) === 0;
}

/**
 * Обёртка над рядом столбиков: пока они помещаются — растягиваются на ширину
 * карточки, дальше едут в горизонтальный скролл, промотанный в конец.
 *
 * Промотка именно к концу, а не к началу: свежий период — то, ради чего
 * экран открывают, и искать его прокруткой пользователь не должен.
 */
function ChartScroller({
  scroll,
  height,
  children,
}: PropsWithChildren<{ scroll: boolean; height: number }>) {
  const scroller = useRef<ScrollView>(null);

  if (!scroll) {
    return (
      <View style={{ flexDirection: "row", alignItems: "flex-end", gap: BAR_GAP, height }}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      ref={scroller}
      horizontal
      showsHorizontalScrollIndicator={false}
      // Смена периода меняет размер содержимого — тот же обработчик
      // возвращает скролл к свежему краю, отдельного эффекта не нужно.
      onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}
      contentContainerStyle={{ alignItems: "flex-end", gap: BAR_GAP, height }}
    >
      {children}
    </ScrollView>
  );
}

function Column({
  width,
  onPress,
  children,
}: PropsWithChildren<{ width: number | null; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{
        flex: width === null ? 1 : undefined,
        width: width ?? undefined,
        height: "100%",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: BAR_GAP,
      }}
    >
      {children}
    </Pressable>
  );
}

function barColor(bucket: Bucket, selected: boolean): string {
  if (bucket.isCurrent) return colors.surfaceInverse;
  if (selected) return colors.textFaint;
  return colors.border;
}

type BarsProps = {
  buckets: Bucket[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
};

/** Столбики трат по периодам. */
export function SpendingBars({ buckets, selectedKey, onSelect }: BarsProps) {
  const scroll = buckets.length > FIT_LIMIT;
  const width = scroll ? columnWidth(buckets.length) : null;
  const max = Math.max(1, ...buckets.map((bucket) => bucket.spent));
  // Сумму над каждым столбиком показываем, только пока она читается; на
  // длинных периодах остаётся сумма выбранного.
  const showValues = buckets.length <= FIT_LIMIT;

  return (
    <ChartScroller scroll={scroll} height={SPEND_CHART_HEIGHT}>
      {buckets.map((bucket, index) => {
        const selected = bucket.key === selectedKey;
        return (
          <Column key={bucket.key} width={width} onPress={() => onSelect(bucket.key)}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              style={[
                typography.tabLabel,
                {
                  width: "100%",
                  textAlign: "center",
                  color: selected || bucket.isCurrent ? colors.text : colors.textMuted,
                },
              ]}
            >
              {showValues || selected ? formatMoney(bucket.spent) : ""}
            </Text>
            <View
              style={{
                width: "100%",
                height: Math.max(4, (bucket.spent / max) * SPEND_BAR_MAX_HEIGHT),
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                borderBottomLeftRadius: 4,
                borderBottomRightRadius: 4,
                backgroundColor: barColor(bucket, selected),
              }}
            />
            <Text
              style={[
                typography.tabLabel,
                {
                  color:
                    selected || bucket.isCurrent ? colors.text : colors.textSecondary,
                },
              ]}
            >
              {isLabelled(index, buckets.length) ? bucket.short : ""}
            </Text>
          </Column>
        );
      })}
    </ChartScroller>
  );
}

/** Парные столбики: доход рядом с тратами. */
export function IncomeExpenseBars({ buckets, selectedKey, onSelect }: BarsProps) {
  const scroll = buckets.length > FIT_LIMIT;
  const width = scroll ? columnWidth(buckets.length) : null;
  const max = Math.max(
    1,
    ...buckets.map((bucket) => Math.max(bucket.income, bucket.spent)),
  );
  const barWidth = buckets.length <= FIT_LIMIT ? 11 : buckets.length <= 12 ? 7 : 4;

  return (
    <ChartScroller scroll={scroll} height={112}>
      {buckets.map((bucket, index) => {
        const selected = bucket.key === selectedKey;
        return (
          <Column key={bucket.key} width={width} onPress={() => onSelect(bucket.key)}>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
              <View
                style={{
                  width: barWidth,
                  height: Math.max(4, (bucket.income / max) * 88),
                  borderTopLeftRadius: 5,
                  borderTopRightRadius: 5,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: colors.positive,
                  opacity: selectedKey === null || selected ? 1 : 0.45,
                }}
              />
              <View
                style={{
                  width: barWidth,
                  height: Math.max(4, (bucket.spent / max) * 88),
                  borderTopLeftRadius: 5,
                  borderTopRightRadius: 5,
                  borderBottomLeftRadius: 2,
                  borderBottomRightRadius: 2,
                  backgroundColor: colors.surfaceInverse,
                  opacity: selectedKey === null || selected ? 1 : 0.45,
                }}
              />
            </View>
            <Text
              style={[
                typography.tabLabel,
                {
                  color:
                    selected || bucket.isCurrent ? colors.text : colors.textSecondary,
                },
              ]}
            >
              {isLabelled(index, buckets.length) ? bucket.short : ""}
            </Text>
          </Column>
        );
      })}
    </ChartScroller>
  );
}

const CHART_HEIGHT = 100;
const CHART_PADDING = 8;

type SavingsChartProps = {
  values: number[];
  /** Точка, на которой стоит палец (или последняя, пока не трогали). */
  index: number;
  onScrub: (index: number) => void;
};

/**
 * Линия накоплений с проводкой пальцем.
 *
 * Точки считаются в реальных пикселях по измеренной ширине, а не через
 * `viewBox` с растяжением: та же ширина нужна, чтобы перевести координату
 * касания в номер точки, и держать два разных масштаба — верный способ
 * промахиваться мимо значения под пальцем.
 */
export function SavingsChart({ values, index, onScrub }: SavingsChartProps) {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const scrub = (event: GestureResponderEvent) => {
    if (width <= 0 || values.length < 2) return;
    const x = event.nativeEvent.locationX;
    const fraction = Math.min(1, Math.max(0, x / width));
    onScrub(Math.round(fraction * (values.length - 1)));
  };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const inner = Math.max(1, width - CHART_PADDING * 2);
  const step = values.length > 1 ? inner / (values.length - 1) : 0;

  const points = values.map((value, position) => ({
    x: CHART_PADDING + position * step,
    y:
      CHART_HEIGHT -
      CHART_PADDING -
      ((value - min) / span) * (CHART_HEIGHT - CHART_PADDING * 2),
  }));

  const line = points
    .map((point, position) => `${position === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
  const area = `${line} L${points[points.length - 1]?.x ?? 0} ${CHART_HEIGHT} L${points[0]?.x ?? 0} ${CHART_HEIGHT} Z`;

  const active = points[Math.min(index, points.length - 1)];

  return (
    <View
      onLayout={onLayout}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={scrub}
      onResponderMove={scrub}
      style={{ height: CHART_HEIGHT }}
    >
      {width > 0 ? (
        <Svg width={width} height={CHART_HEIGHT}>
          <Path d={area} fill={colors.positive} opacity={0.08} />
          <Path
            d={line}
            stroke={colors.positive}
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {active ? (
            <>
              <Line
                x1={active.x}
                y1={0}
                x2={active.x}
                y2={CHART_HEIGHT}
                stroke={colors.text}
                strokeWidth={1}
                opacity={0.12}
              />
              <Circle
                cx={active.x}
                cy={active.y}
                r={5}
                fill={colors.surface}
                stroke={colors.positive}
                strokeWidth={2.5}
              />
            </>
          ) : null}
        </Svg>
      ) : null}
    </View>
  );
}

/** Подписи под линией накоплений — та же разрядка, что у столбиков. */
export function ChartAxis({
  buckets,
  activeIndex,
}: {
  buckets: Bucket[];
  activeIndex: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {buckets.map((bucket, index) => (
        <Text
          key={bucket.key}
          style={[
            typography.tabLabel,
            {
              flex: 1,
              textAlign: "center",
              color: index === activeIndex ? colors.text : colors.textMuted,
            },
          ]}
        >
          {isLabelled(index, buckets.length) ? bucket.short : ""}
        </Text>
      ))}
    </View>
  );
}

/** Точка легенды: цветной квадратик и подпись. */
export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: radius.tileSmall / 4,
          backgroundColor: color,
        }}
      />
      <Text style={[typography.captionSmall, { color: colors.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}
