import { useState } from "react";
import { Pressable, type ViewStyle } from "react-native";

import { colors, radius, shadows } from "../constants/theme";
import { Icon, type IconName } from "./Icon";

type CircleButtonProps = {
  icon: IconName;
  /** Подпись для screen reader — иконка сама по себе ничего не говорит. */
  label: string;
  onPress: () => void;
  size?: number;
  glyphSize?: number;
  style?: ViewStyle;
};

/**
 * Круглая кнопка 38px из макета: белая, тонкая тень, иконка по центру.
 * Одна и та же кнопка используется как «назад» на push-экранах и как
 * крестик на модальных — отличается только иконкой.
 */
export function CircleButton({
  icon,
  label,
  onPress,
  size = 38,
  glyphSize = 15,
  style,
}: CircleButtonProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radius.pill,
          backgroundColor: colors.surface,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
        shadows.pill,
        style,
      ]}
    >
      <Icon name={icon} size={glyphSize} color={colors.icon} />
    </Pressable>
  );
}
