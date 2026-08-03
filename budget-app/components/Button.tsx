import { useState } from "react";
import { Pressable, Text, type PressableProps, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

export type ButtonVariant = "primary" | "secondary" | "positive";

type ButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  variant?: ButtonVariant;
  /** Растянуть на всю ширину контейнера. */
  block?: boolean;
  style?: ViewStyle;
};

function palette(variant: ButtonVariant) {
  if (variant === "secondary") {
    return { background: colors.surface, label: colors.text, border: colors.border };
  }
  if (variant === "positive") {
    return { background: colors.positive, label: colors.textInverse, border: "transparent" };
  }
  return { background: colors.surfaceInverse, label: colors.textInverse, border: "transparent" };
}

/**
 * Кнопка макета: высота 52, полностью круглая, тёмная заливка.
 * Неактивное состояние показывается прозрачностью, а не серой заливкой —
 * так в экспорте (`opacity: saveOp`).
 */
export function Button({
  label,
  variant = "primary",
  block = true,
  disabled = false,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  // Нажатие через состояние, а не через style-как-функцию: с включённым
  // jsxImportSource: "nativewind" функциональный style на Pressable
  // не доезжает до нативного рендера.
  const [pressed, setPressed] = useState(false);
  const isDisabled = disabled === true;
  const skin = palette(variant);

  const opacity = isDisabled ? 0.35 : pressed ? 0.85 : 1;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        {
          alignSelf: block ? "stretch" : "flex-start",
          alignItems: "center",
          justifyContent: "center",
          height: 52,
          paddingHorizontal: spacing.xl,
          borderRadius: radius.pill,
          backgroundColor: skin.background,
          borderWidth: variant === "secondary" ? 1 : 0,
          borderColor: skin.border,
          opacity,
        },
        style,
      ]}
      {...rest}
    >
      <Text style={[typography.button, { color: skin.label }]}>{label}</Text>
    </Pressable>
  );
}
