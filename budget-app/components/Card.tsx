import { useState, type PropsWithChildren } from "react";
import { Pressable, View, type ViewProps } from "react-native";

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

/**
 * Строка внутри Card list — с волосяным разделителем сверху, кроме первой.
 * С `onPress` становится кликабельной и подсвечивается при нажатии.
 */
export function CardRow({
  first = false,
  onPress,
  style,
  children,
  ...rest
}: PropsWithChildren<ViewProps & { first?: boolean; onPress?: () => void }>) {
  const [pressed, setPressed] = useState(false);

  const separator = {
    borderTopWidth: first ? 0 : HAIRLINE,
    borderTopColor: colors.separator,
  } as const;

  if (!onPress) {
    return (
      <View {...rest} style={[separator, style]}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        separator,
        pressed ? { backgroundColor: colors.surfacePressed } : null,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}
