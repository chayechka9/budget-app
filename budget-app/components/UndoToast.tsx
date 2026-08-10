import { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing, typography } from "../constants/theme";
import { useStore } from "../lib/store";

/** Сколько времени удаление можно отменить. */
const UNDO_WINDOW_MS = 5000;

/**
 * Тост об удалении транзакции с возможностью его отменить.
 *
 * Живёт в корне навигации, а не на экране: удаление закрывает и шит правки, и
 * детали под ним, поэтому пережить это может только общий слой поверх стека.
 */
export function UndoToast() {
  const { pendingUndo, undoDelete, dismissUndo } = useStore();
  const insets = useSafeAreaInsets();
  const appearance = useRef(new Animated.Value(0)).current;

  // Стор пересобирается на любое изменение данных, и в зависимостях эффекта
  // `dismissUndo` перезапускал бы таймер каждый раз. Держим свежую ссылку
  // отдельно, а эффект оставляем привязанным только к самому удалению.
  const dismiss = useRef(dismissUndo);
  dismiss.current = dismissUndo;

  useEffect(() => {
    if (!pendingUndo) return;

    appearance.setValue(0);
    Animated.timing(appearance, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => dismiss.current(), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [pendingUndo, appearance]);

  if (!pendingUndo) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: insets.top + spacing.md,
        left: 0,
        right: 0,
        alignItems: "center",
        opacity: appearance,
        transform: [
          {
            translateY: appearance.interpolate({
              inputRange: [0, 1],
              outputRange: [-8, 0],
            }),
          },
        ],
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          backgroundColor: colors.surfaceInverse,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: 10,
          ...shadows.fab,
        }}
      >
        <Text style={[typography.toast, { color: colors.textInverseSecondary }]}>
          Transaction deleted
        </Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={undoDelete}>
          <Text style={[typography.toast, { color: colors.textInverse }]}>Undo</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}
