import { Pressable, Text, View } from "react-native";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";

type Segment<T extends string> = {
  value: T;
  label: string;
};

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Мелкая подпись 12.5 — когда сегментов три и длинные названия. */
  compact?: boolean;
};

/** Сегмент-контрол: активная пилюля на белом, неактивная — приглушённая. */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  compact = false,
}: SegmentedControlProps<T>) {
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.surfaceField,
        borderRadius: radius.tile,
        padding: 3,
        gap: 3,
      }}
    >
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
            style={[
              {
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: compact ? 9 : spacing.sm,
                paddingHorizontal: 4,
                borderRadius: radius.tile - 2,
                backgroundColor: active ? colors.surface : "transparent",
              },
              active ? shadows.pill : null,
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                compact ? typography.segmentLabel : typography.headline,
                { color: active ? colors.text : colors.textSecondary },
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
