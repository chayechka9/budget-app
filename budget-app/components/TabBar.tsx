import { Platform, Pressable, View } from "react-native";

import {
  HAIRLINE,
  colors,
  iconSize,
  radius,
  shadows,
  tabBar,
  typography,
} from "../constants/theme";
import { Icon } from "./Icon";

/**
 * Опции таб-бара и хедера из темы. Отдельной функцией, а не своим таб-баром:
 * навигация ещё будет меняться, и переписывать react-navigation целиком
 * ради оформления смысла нет.
 *
 * Геометрия панели взята из макета: 94px высоты, отступы 10/30, иконка 23px,
 * подпись 10.5px, зазор 3px. Хедеры экранов скрыты — в макете их нет, контент
 * начинается сразу с оверлайна месяца.
 *
 * Полупрозрачность есть, блюра нет намеренно: backdrop-filter из макета
 * требует expo-blur и абсолютного позиционирования панели, то есть правок
 * лейаута всех экранов.
 */
export const navigationScreenOptions = {
  headerShown: false,
  tabBarActiveTintColor: colors.text,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarLabelStyle: { ...typography.tabLabel, marginTop: tabBar.labelGap },
  tabBarStyle: {
    backgroundColor: colors.backgroundTranslucent,
    borderTopColor: colors.separator,
    borderTopWidth: HAIRLINE,
    height: tabBar.height,
    paddingTop: tabBar.paddingTop,
    paddingBottom: tabBar.paddingBottom,
    paddingHorizontal: tabBar.paddingHorizontal,
    // На вебе safe-area снизу нет, поэтому 30px запаса там лишние.
    ...(Platform.OS === "web"
      ? { height: tabBar.height - tabBar.paddingBottom + 12, paddingBottom: 12 }
      : null),
  },
} as const;

/**
 * Центральная кнопка [+] — 54px, как в макете, целиком внутри панели.
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
            height: tabBar.addButtonSize,
            width: tabBar.addButtonSize,
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
