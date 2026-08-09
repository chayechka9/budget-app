import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import { colors, spacing, typography } from "../constants/theme";
import { IconTile } from "./IconTile";
import { ProgressBar } from "./Progress";
import type { IconName } from "./Icon";

type CategoryCardProps = {
  name: string;
  icon?: IconName;
  /** Правая величина: остаток по плану или процент накопления. */
  value: string;
  /** Подпись под названием: «€383.40 of €500.00». */
  caption?: string;
  /** 0..1. Не передавать — полосы не будет. */
  progress?: number;
  /** 0..1 — красный хвост полосы на величину перерасхода. См. spendProgress. */
  overspend?: number;
  /** Слот справа — например кольцо прогресса у Savings. */
  accessory?: ReactNode;
  style?: ViewStyle;
};

/**
 * Строка категории в макете: плашка с иконкой, название, значение справа,
 * подпись и тонкая полоса прогресса.
 *
 * Намеренно презентационная: принимает уже готовые строки, а не модель
 * категории — модель данных ещё будет меняться.
 */
export function CategoryCard({
  name,
  icon,
  value,
  caption,
  progress,
  overspend = 0,
  accessory,
  style,
}: CategoryCardProps) {
  const hasBar = typeof progress === "number";
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingHorizontal: spacing.lg,
          paddingVertical: 13,
        },
        style,
      ]}
    >
      {icon ? <IconTile name={icon} size={38} /> : null}

      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "space-between",
          }}
        >
          <Text style={[typography.headline, { color: colors.text }]}>{name}</Text>

          <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
            {value}
          </Text>
        </View>

        {caption ? (
          <Text
            style={[typography.amountCaption, { color: colors.textTertiary, marginTop: 3 }]}
          >
            {caption}
          </Text>
        ) : null}

        {hasBar ? (
          <ProgressBar value={progress} overspend={overspend} style={{ marginTop: 7 }} />
        ) : null}
      </View>

      {accessory}
    </View>
  );
}
