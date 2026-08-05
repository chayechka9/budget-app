import type { ReactNode } from "react";
import { Text, View, type ViewStyle } from "react-native";

import {
  OVERSPEND_DOT_SIZE,
  colors,
  radius,
  spacing,
  typography,
} from "../constants/theme";
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
  /**
   * Перерасход. Сигналит точкой рядом со значением — но только когда полосы
   * нет: при полосе перерасход уже виден красным хвостом. Сумма в любом
   * случае остаётся нейтральной по цвету.
   */
  overspent?: boolean;
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
  overspent = false,
  accessory,
  style,
}: CategoryCardProps) {
  const hasBar = typeof progress === "number";
  // Точка — запасной сигнал для строк без полосы (например savings с кольцом).
  const showDot = overspent && !hasBar;
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

          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            {showDot ? (
              <View
                accessibilityLabel="Overspent"
                style={{
                  width: OVERSPEND_DOT_SIZE,
                  height: OVERSPEND_DOT_SIZE,
                  borderRadius: radius.pill,
                  backgroundColor: colors.overspend,
                }}
              />
            ) : null}
            <Text style={[typography.amountCaption, { color: colors.textSecondary }]}>
              {value}
            </Text>
          </View>
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
