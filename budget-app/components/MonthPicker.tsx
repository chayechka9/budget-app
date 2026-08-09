import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import { formatMonthKey } from "../lib/mock-data";

type MonthPickerProps = {
  visible: boolean;
  /** Ключи месяцев «2026-08», от свежего к старому. */
  months: string[];
  value: string;
  /** Координаты в окне — под кнопкой, которая открыла список. */
  anchor: { top: number; left: number };
  onSelect: (month: string) => void;
  onClose: () => void;
};

/**
 * Выпадающий список месяцев из макета: белая карточка под подписью месяца.
 *
 * Через `Modal`, а не абсолютным блоком внутри экрана: список должен лежать
 * поверх скролла и закрываться по тапу мимо, а внутри ScrollView он бы
 * скроллился вместе с содержимым.
 */
export function MonthPicker({
  visible,
  months,
  value,
  anchor,
  onSelect,
  onClose,
}: MonthPickerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close month picker"
        onPress={onClose}
        style={{ flex: 1 }}
      >
        <View
          style={{
            position: "absolute",
            top: anchor.top,
            left: anchor.left,
            minWidth: 190,
            maxHeight: 276,
            borderRadius: radius.dropdown,
            backgroundColor: colors.surface,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.14)",
          }}
        >
          {/* Месяцев больше, чем влезает в 276px, поэтому список прокручивается —
              как `overflow-y:auto` у выпадающего списка в макете. Без этого
              нижние месяцы просто обрезались бы и добраться до них было нельзя. */}
          <ScrollView contentContainerStyle={{ padding: 6 }}>
            {months.map((month) => (
              <Pressable
                key={month}
                accessibilityRole="button"
                accessibilityState={{ selected: month === value }}
                onPress={() => onSelect(month)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.text,
                      fontSize: 14,
                      fontWeight: month === value ? "700" : "500",
                    },
                  ]}
                >
                  {formatMonthKey(month)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
