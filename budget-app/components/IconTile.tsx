import { View } from "react-native";

import { colors, iconSize, radius } from "../constants/theme";
import { Icon, type IconName } from "./Icon";

type IconTileProps = {
  name: IconName;
  size?: number;
  /** Зелёная плашка вместо нейтральной — для позитивных блоков. */
  tone?: "neutral" | "positive";
};

/** Скруглённая плашка под иконкой строки — базовый элемент списков макета. */
export function IconTile({ name, size = 38, tone = "neutral" }: IconTileProps) {
  const positive = tone === "positive";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size >= 42 ? radius.tileLarge : radius.tile,
        backgroundColor: positive ? colors.positiveSurface : colors.surfaceTile,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon
        name={name}
        size={iconSize.sm}
        color={positive ? colors.positive : colors.icon}
      />
    </View>
  );
}
