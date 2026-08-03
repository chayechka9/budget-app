import { Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";

type InputProps = TextInputProps & {
  label?: string;
  /** Крупный жирный ввод — для сумм, с моноширинными цифрами. */
  emphasis?: boolean;
  containerStyle?: ViewStyle;
};

/** Поле ввода макета: заливка без рамки, скругление 12. */
export function Input({ label, emphasis = false, containerStyle, style, ...rest }: InputProps) {
  return (
    <View style={containerStyle}>
      {label ? (
        <Text
          style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[
          emphasis ? typography.amount : typography.body,
          {
            color: colors.text,
            backgroundColor: colors.surfaceField,
            borderRadius: radius.tile,
            paddingHorizontal: spacing.lg,
            paddingVertical: emphasis ? spacing.md : 12,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}
