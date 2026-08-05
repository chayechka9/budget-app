import Svg, { Circle } from "react-native-svg";
import { View, type ViewStyle } from "react-native";

import { colors, progressHeight, radius, toneColor, type Tone } from "../constants/theme";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 1);
}

type ProgressBarProps = {
  /** 0..1, значения вне диапазона обрезаются. */
  value: number;
  /**
   * Доля полосы справа от заливки, показывающая перерасход (0..1). Рисуется
   * красным сразу за тёмной частью: тёмная — то, что уложилось в план,
   * красная — насколько план превышен.
   */
  overspend?: number;
  tone?: Tone;
  height?: number;
  style?: ViewStyle;
};

/** Полоса прогресса: тёмная заливка по плану, красный хвост при перерасходе. */
export function ProgressBar({
  value,
  overspend = 0,
  tone = "neutral",
  height = progressHeight.row,
  style,
}: ProgressBarProps) {
  const filled = clamp01(value);
  // Хвост не может вылезти за полосу, сколько бы ни был перерасход.
  const over = Math.min(clamp01(overspend), 1 - filled);

  return (
    <View
      style={[
        {
          height,
          flexDirection: "row",
          borderRadius: radius.pill,
          backgroundColor: colors.track,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${filled * 100}%`,
          height: "100%",
          borderRadius: radius.pill,
          // В макете заливка — тёмная, а не чёрный текстовый цвет.
          backgroundColor: tone === "positive" ? toneColor(tone) : colors.surfaceInverse,
        }}
      />
      {over > 0 ? (
        <View
          accessibilityLabel="Overspent"
          style={{
            width: `${over * 100}%`,
            height: "100%",
            borderRadius: radius.pill,
            backgroundColor: colors.overspend,
          }}
        />
      ) : null}
    </View>
  );
}

/**
 * Раскладка полосы для категории с планом.
 *
 * Пока укладываемся в план, полоса — это доля потраченного. Как только план
 * превышен, вся полоса становится «сколько потрачено»: тёмная часть — план,
 * красная — превышение.
 */
export function spendProgress(
  spent: number,
  planned: number,
): { value: number; overspend: number } {
  if (planned <= 0) return { value: spent > 0 ? 1 : 0, overspend: 0 };
  if (spent <= planned) return { value: spent / planned, overspend: 0 };
  return { value: planned / spent, overspend: (spent - planned) / spent };
}

type ProgressRingProps = {
  /** 0..1. */
  value: number;
  tone?: Tone;
  size?: number;
  thickness?: number;
  style?: ViewStyle;
};

/** Кольцо прогресса — для Savings-категорий и будущего экрана Progress. */
export function ProgressRing({
  value,
  tone = "positive",
  size = 34,
  thickness = 3.5,
  style,
}: ProgressRingProps) {
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const filled = circumference * clamp01(value);

  return (
    <View style={style}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.trackRing}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={toneColor(tone)}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          // Старт с 12 часов, а не с 3.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          fill="none"
        />
      </Svg>
    </View>
  );
}
