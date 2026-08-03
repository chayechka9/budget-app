import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { HAIRLINE, colors, radius, shadows, spacing } from "../constants/theme";

type CardProps = PropsWithChildren<
  ViewProps & {
    /** Список строк: меньший радиус, без внутренних отступов, обрезка углов. */
    list?: boolean;
  }
>;

/** Белая карточка с мягкой тенью — базовая поверхность макета. */
export function Card({ list = false, style, children, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: list ? radius.card : radius.cardLarge,
          padding: list ? 0 : spacing.xl,
          overflow: list ? "hidden" : "visible",
        },
        shadows.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Строка внутри Card list — с волосяным разделителем сверху, кроме первой. */
export function CardRow({
  first = false,
  style,
  children,
  ...rest
}: PropsWithChildren<ViewProps & { first?: boolean }>) {
  return (
    <View
      {...rest}
      style={[
        {
          borderTopWidth: first ? 0 : HAIRLINE,
          borderTopColor: colors.separator,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
