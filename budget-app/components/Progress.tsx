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
  tone?: Tone;
  height?: number;
  style?: ViewStyle;
};

/**
 * Полоса прогресса. Красного варианта здесь нет намеренно: перерасход
 * показывается точкой-индикатором рядом со строкой, а не красной полосой.
 */
export function ProgressBar({
  value,
  tone = "neutral",
  height = progressHeight.row,
  style,
}: ProgressBarProps) {
  const width: `${number}%` = `${clamp01(value) * 100}%`;

  return (
    <View
      style={[
        {
          height,
          borderRadius: radius.pill,
          backgroundColor: colors.track,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <View
        style={{
          width,
          height: "100%",
          borderRadius: radius.pill,
          // В макете заливка — тёмная, а не чёрный текстовый цвет.
          backgroundColor: tone === "positive" ? toneColor(tone) : colors.surfaceInverse,
        }}
      />
    </View>
  );
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
