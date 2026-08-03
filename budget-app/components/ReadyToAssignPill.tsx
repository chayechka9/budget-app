import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, iconSize, radius, shadows, spacing, typography } from "../constants/theme";
import { Icon } from "./Icon";

type ReadyToAssignPillProps = {
  amount: string;
  onPress?: () => void;
};

/**
 * Зелёная пилюля «€314.20 ready to assign» из макета: точка-акцент, текст,
 * шеврон. Мягкая подсказка — не блокирует и ничего не требует.
 */
export function ReadyToAssignPill({ amount, onPress }: ReadyToAssignPillProps) {
  const [pressed, setPressed] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        {
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingLeft: 14,
          paddingRight: spacing.md,
          paddingVertical: 9,
          borderRadius: radius.pill,
          backgroundColor: pressed
            ? colors.positiveSurfacePressed
            : colors.positiveSurface,
        },
        shadows.pill,
      ]}
    >
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: radius.pill,
          backgroundColor: colors.positive,
        }}
      />
      <Text style={[typography.rowTitle, { color: colors.positiveTextStrong }]}>
        {amount} ready to assign
      </Text>
      <Icon name="chevronRight" size={iconSize.xs} color={colors.positiveIcon} />
    </Pressable>
  );
}
