import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import { MONTHS_SHORT } from "../lib/dates";
import { Icon } from "./Icon";

type MonthPickerProps = {
  visible: boolean;
  /** Ключи месяцев «2026-08», от свежего к старому. */
  months: string[];
  /** Месяцы, в которых есть транзакции. Остальные остаются доступными, но приглушены. */
  monthsWithData?: string[];
  value: string;
  /** Координаты в окне — под кнопкой, которая открыла список. */
  anchor: { top: number; left: number };
  onSelect: (month: string) => void;
  onClose: () => void;
};

/**
 * Выпадающий календарь месяцев: год со стрелками и сетка из 12 месяцев.
 *
 * Через `Modal`, а не абсолютным блоком внутри экрана: список должен лежать
 * поверх скролла и закрываться по тапу мимо, а внутри ScrollView он бы
 * скроллился вместе с содержимым.
 */
export function MonthPicker({
  visible,
  months,
  monthsWithData = months,
  value,
  anchor,
  onSelect,
  onClose,
}: MonthPickerProps) {
  const selectedYear = Number(value.slice(0, 4)) || new Date().getFullYear();
  const [year, setYear] = useState(selectedYear);

  useEffect(() => {
    if (visible) setYear(selectedYear);
  }, [selectedYear, visible]);

  const selectable = useMemo(() => new Set(months), [months]);
  const withData = useMemo(() => new Set(monthsWithData), [monthsWithData]);
  const years = useMemo(
    () =>
      [...new Set(months.map((month) => Number(month.slice(0, 4))))]
        .filter(Number.isFinite)
        .sort((first, second) => first - second),
    [months],
  );
  const previousYear = years.includes(year - 1) ? year - 1 : null;
  const nextYear = years.includes(year + 1) ? year + 1 : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close month picker"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            position: "absolute",
            top: anchor.top,
            left: anchor.left,
            width: 336,
            padding: spacing.lg,
            borderRadius: radius.dropdown,
            backgroundColor: colors.surface,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.14)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: spacing.md,
            }}
          >
            <Text style={[typography.detailTitle, { color: colors.text }]}>{year}</Text>

            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous year"
                accessibilityState={{ disabled: previousYear === null }}
                disabled={previousYear === null}
                onPress={() => previousYear !== null && setYear(previousYear)}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceControl,
                  opacity: previousYear === null ? 0.4 : 1,
                }}
              >
                <Icon name="chevronLeft" size={14} color={colors.icon} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next year"
                accessibilityState={{ disabled: nextYear === null }}
                disabled={nextYear === null}
                onPress={() => nextYear !== null && setYear(nextYear)}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceControl,
                  opacity: nextYear === null ? 0.4 : 1,
                }}
              >
                <View style={{ transform: [{ rotate: "180deg" }] }}>
                  <Icon name="chevronLeft" size={14} color={colors.icon} />
                </View>
              </Pressable>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              rowGap: spacing.sm,
            }}
          >
            {MONTHS_SHORT.map((label, index) => {
              const month = `${year}-${String(index + 1).padStart(2, "0")}`;
              const selected = month === value;
              const canSelect = selectable.has(month);
              const hasData = withData.has(month);

              return (
                <Pressable
                  key={month}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${year}`}
                  accessibilityState={{ selected, disabled: !canSelect }}
                  disabled={!canSelect}
                  onPress={() => canSelect && onSelect(month)}
                  style={{
                    width: "23%",
                    height: 38,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radius.pill,
                    backgroundColor: selected ? colors.surfaceInverse : "transparent",
                  }}
                >
                  <Text
                    style={[
                      typography.rowTitle,
                      {
                        color: selected
                          ? colors.textInverse
                          : hasData
                            ? colors.text
                            : colors.textFaint,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}
