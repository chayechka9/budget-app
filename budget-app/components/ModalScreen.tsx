import type { PropsWithChildren } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useCloseScreen } from "../lib/navigation";
import { colors, spacing } from "../constants/theme";
import { CircleButton } from "./CircleButton";

/**
 * Оболочка модального экрана: единственный способ закрыться — крестик сверху
 * справа, и он всегда возвращает на предыдущий экран в стеке, а не на Home.
 *
 * Паттерн вынесен в компонент намеренно: экранов таких пять (Wrapped up,
 * Assign, Spending, детали категории и транзакции), и если складывать шапку
 * руками на каждом, они рано или поздно разъедутся.
 */
export function ModalScreen({ children }: PropsWithChildren) {
  const close = useCloseScreen();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.backgroundModal }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, spacing.lg) + spacing.md,
        paddingHorizontal: spacing.xl,
        paddingBottom: insets.bottom + spacing.xxxl,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
        <CircleButton icon="close" label="Close" glyphSize={13} onPress={close} />
      </View>

      {children}
    </ScrollView>
  );
}
