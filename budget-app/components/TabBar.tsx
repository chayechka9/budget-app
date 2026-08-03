import { HAIRLINE, colors, iconSize, radius, shadows, typography } from "../constants/theme";
import { Platform, Pressable, View } from "react-native";

import { Icon } from "./Icon";

/**
 * Опции таб-бара и хедера из темы. Отдельной функцией, а не своим таб-баром:
 * навигация ещё будет меняться, и переписывать react-navigation целиком
 * ради оформления смысла нет.
 *
 * В макете панель полупрозрачная с backdrop-blur. Блюра здесь нет намеренно:
 * он требует expo-blur и абсолютного позиционирования панели, то есть правок
 * лейаута всех экранов. Цвет взят тот же, что в экспорте.
 */
export const navigationScreenOptions = {
  tabBarActiveTintColor: colors.text,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: typography.tabLabel,
  tabBarStyle: {
    backgroundColor: colors.backgroundTranslucent,
    borderTopColor: colors.separator,
    borderTopWidth: HAIRLINE,
    // Только для веба: там нет safe-area снизу, и подписи из темы обрезаются.
    // На нативе высоту не трогаем — даже height: undefined ломает расчёт.
    ...(Platform.OS === "web" ? { height: 68 } : null),
  },
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: typography.headline,
  headerTintColor: colors.text,
  headerShadowVisible: false,
} as const;

/** Кнопка [+] в макете — 54px. */
const BUTTON_SIZE = 54;

/**
 * Приподнятая центральная кнопка [+]. Это действие, а не вкладка — onPress
 * задаёт вызывающая сторона.
 *
 * Позиционируется абсолютно: иначе кнопка растягивает высоту строки таб-бара
 * и подписи остальных вкладок обрезаются.
 */
export function TabBarAddButton({ onPress }: { onPress: () => void }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add transaction"
        onPress={onPress}
        style={[
          {
            position: "absolute",
            top: -BUTTON_SIZE / 3,
            height: BUTTON_SIZE,
            width: BUTTON_SIZE,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radius.pill,
            backgroundColor: colors.surfaceInverse,
          },
          shadows.fab,
        ]}
      >
        <Icon name="add" size={iconSize.lg} color={colors.textInverse} />
      </Pressable>
    </View>
  );
}
