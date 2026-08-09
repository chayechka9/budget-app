import { Dimensions, Modal, Pressable, Text, View } from "react-native";

import { colors, radius, typography } from "../constants/theme";
import type { PeriodSelection } from "../lib/analytics";

/** Куда меню становится относительно подписи, которая его открыла. */
export type MenuAnchor = {
  /** Y нижнего края подписи — отсюда меню растёт вниз. */
  top: number;
  /** Y верхнего края подписи — сюда меню упирается, когда растёт вверх. */
  triggerTop: number;
  left: number;
};

/** Пункт меню периода. */
export type PeriodOption = {
  label: string;
  selection: PeriodSelection;
};

type PeriodMenuProps = {
  visible: boolean;
  value: PeriodSelection;
  anchor: MenuAnchor;
  options: PeriodOption[];
  onSelect: (selection: PeriodSelection) => void;
  onClose: () => void;
};

/**
 * Во что примерно разворачивается список. Точную высоту знать неоткуда:
 * решение «вниз или вверх» принимается до того, как меню отрисовано и его
 * можно измерить, поэтому складываем её из размеров строк.
 */
const ROW_HEIGHT = 40;
const LIST_PADDING = 12;

/** Зазор до края экрана, чтобы меню не липло к нему вплотную. */
const SCREEN_MARGIN = 16;

function Row({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10 }}
    >
      <Text
        style={[
          typography.body,
          { color: colors.text, fontSize: 14, fontWeight: active ? "700" : "500" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Меню периода: короткий плоский список помесячных пресетов.
 *
 * Через `Modal`, как и `MonthPicker`: меню лежит поверх скролла экрана и
 * закрывается тапом мимо, а вложенное в `ScrollView` уезжало бы вместе с
 * содержимым.
 */
export function PeriodMenu({
  visible,
  value,
  anchor,
  options,
  onSelect,
  onClose,
}: PeriodMenuProps) {
  const screenHeight = Dimensions.get("window").height;

  const estimatedHeight = options.length * ROW_HEIGHT + LIST_PADDING;

  // Подпись периода есть и на нижней карточке: там места под ней не хватает,
  // и меню разворачивается вверх, а не уезжает за край экрана.
  const flip = anchor.top + estimatedHeight > screenHeight - SCREEN_MARGIN;

  const placement = flip
    ? {
        bottom: screenHeight - anchor.triggerTop + 6,
        maxHeight: anchor.triggerTop - SCREEN_MARGIN - 6,
      }
    : {
        top: anchor.top,
        maxHeight: screenHeight - anchor.top - SCREEN_MARGIN,
      };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close period menu"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <View
          style={{
            position: "absolute",
            left: anchor.left,
            minWidth: 208,
            padding: 6,
            borderRadius: radius.dropdown,
            backgroundColor: colors.surface,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.14)",
            ...placement,
          }}
        >
          {options.map((option) => (
            <Row
              key={option.label}
              label={option.label}
              active={value.count === option.selection.count}
              onPress={() => onSelect(option.selection)}
            />
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}
