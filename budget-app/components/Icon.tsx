import { Ionicons, MaterialCommunityIcons, Octicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { colors, iconSize } from "../constants/theme";

/**
 * Единственный набор иконок в приложении.
 *
 * Базовый набор — outline-варианты Ionicons. Несколько иконок взяты из
 * Octicons и MaterialCommunityIcons: в Ionicons нет вариантов с нужным числом
 * элементов (домик без двери, 3 столбика, 2 линии-слайдера). Толщина линий и
 * скругления у этих трёх наборов совпадают, стиль не выбивается.
 *
 * Новые иконки добавлять сюда, а не звать наборы напрямую.
 */
type IconSpec =
  | { set: "ionicons"; name: ComponentProps<typeof Ionicons>["name"]; scale?: number }
  | { set: "octicons"; name: ComponentProps<typeof Octicons>["name"]; scale?: number }
  | {
      set: "material";
      name: ComponentProps<typeof MaterialCommunityIcons>["name"];
      scale?: number;
    };

/** Глифы разных наборов рисуются с разным полем внутри кегля — выравниваем. */
export const ICONS = {
  // Навигация
  home: { set: "octicons", name: "home", scale: 0.92 },
  budget: { set: "material", name: "view-grid-outline", scale: 1.04 },
  add: { set: "ionicons", name: "add-outline" },
  progress: { set: "material", name: "chart-bar", scale: 1.04 },
  settings: { set: "material", name: "tune-variant", scale: 1.04 },

  chevronRight: { set: "ionicons", name: "chevron-forward-outline" },
  close: { set: "ionicons", name: "close-outline" },
  calendar: { set: "ionicons", name: "calendar-outline" },
  backspace: { set: "ionicons", name: "backspace-outline" },

  // Категории и транзакции
  rent: { set: "ionicons", name: "key-outline" },
  groceries: { set: "ionicons", name: "cart-outline" },
  utilities: { set: "ionicons", name: "flash-outline" },
  transport: { set: "ionicons", name: "bus-outline" },
  eatingOut: { set: "ionicons", name: "restaurant-outline" },
  subscriptions: { set: "ionicons", name: "musical-notes-outline" },
  emergency: { set: "ionicons", name: "shield-outline" },
  trip: { set: "ionicons", name: "airplane-outline" },
  laptop: { set: "ionicons", name: "laptop-outline" },
  income: { set: "ionicons", name: "arrow-down-outline" },
  wallet: { set: "ionicons", name: "wallet-outline" },
} as const satisfies Record<string, IconSpec>;

export type IconName = keyof typeof ICONS;

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = iconSize.md, color = colors.text }: IconProps) {
  const spec: IconSpec = ICONS[name];
  const resolved = Math.round(size * (spec.scale ?? 1));

  if (spec.set === "octicons") {
    return <Octicons name={spec.name} size={resolved} color={color} />;
  }
  if (spec.set === "material") {
    return <MaterialCommunityIcons name={spec.name} size={resolved} color={color} />;
  }
  return <Ionicons name={spec.name} size={resolved} color={color} />;
}
