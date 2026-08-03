import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { Icon } from "./Icon";

export type KeypadKey = string;

const KEYS: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"];

function Key({ value, onPress }: { value: KeypadKey; onPress: (key: KeypadKey) => void }) {
  const [pressed, setPressed] = useState(false);
  const isBackspace = value === "backspace";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isBackspace ? "Delete" : value}
      onPress={() => onPress(value)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        width: "33.333%",
        height: 52,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radius.key,
        backgroundColor: pressed ? colors.pressedOverlay : "transparent",
      }}
    >
      {isBackspace ? (
        <Icon name="backspace" size={iconSize.md} color={colors.text} />
      ) : (
        <Text style={[typography.key, { color: colors.text }]}>{value}</Text>
      )}
    </Pressable>
  );
}

/** Встроенная цифровая клавиатура 3×4: 1–9, точка, 0, backspace. */
export function NumericKeypad({ onKey }: { onKey: (key: KeypadKey) => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        marginTop: spacing.md,
      }}
    >
      {KEYS.map((key) => (
        <Key key={key} value={key} onPress={onKey} />
      ))}
    </View>
  );
}
