import { View } from "react-native";

import { colors, iconSize, radius } from "../constants/theme";
import { Icon, type IconName } from "./Icon";

type IconTileProps = {
  name: IconName;
  size?: number;
  /** Зелёная плашка вместо нейтральной — для позитивных блоков. */
  tone?: "neutral" | "positive";
  /** Выбранный вариант в списке: тёмная плашка, как активный чипс. */
  selected?: boolean;
};

/**
 * Скруглённая плашка под иконкой строки — базовый элемент списков макета.
 * Радиус зависит от размера: 34px → 11, 36–38px → 12, 42px → 14.
 */
export function IconTile({
  name,
  size = 38,
  tone = "neutral",
  selected = false,
}: IconTileProps) {
  const positive = tone === "positive";
  const tileRadius =
    size >= 42 ? radius.tileLarge : size <= 34 ? radius.tileSmall : radius.tile;
  const glyphSize = size >= 42 ? 20 : iconSize.sm;

  const background = selected
    ? colors.surfaceInverse
    : positive
      ? colors.positiveSurface
      : colors.surfaceTile;
  const glyphColor = selected
    ? colors.textInverse
    : positive
      ? colors.positive
      : colors.iconStrong;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: tileRadius,
        backgroundColor: background,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={name} size={glyphSize} color={glyphColor} />
    </View>
  );
}
