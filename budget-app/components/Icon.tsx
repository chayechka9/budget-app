import { Ionicons } from "@expo/vector-icons";
import type { ColorValue } from "react-native";

import { colors, iconSize } from "../constants/theme";

/**
 * Единственный набор иконок в приложении.
 *
 * Только outline-варианты Ionicons: одинаковая толщина линии, без заливок —
 * в духе SF Symbols и line-иконок макета. Новые иконки добавлять сюда,
 * а не звать Ionicons напрямую, иначе стили начнут смешиваться.
 */
export const ICONS = {
  // Навигация
  home: "home-outline",
  budget: "grid-outline",
  add: "add-outline",
  progress: "stats-chart-outline",
  settings: "options-outline",
  chevronRight: "chevron-forward-outline",

  // Категории и транзакции
  rent: "key-outline",
  groceries: "cart-outline",
  utilities: "flash-outline",
  transport: "bus-outline",
  eatingOut: "restaurant-outline",
  subscriptions: "musical-notes-outline",
  emergency: "shield-outline",
  trip: "airplane-outline",
  laptop: "laptop-outline",
  income: "arrow-down-outline",
  wallet: "wallet-outline",
} as const satisfies Record<string, React.ComponentProps<typeof Ionicons>["name"]>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = iconSize.md, color = colors.text }: IconProps) {
  return <Ionicons name={ICONS[name]} size={size} color={color} />;
}
