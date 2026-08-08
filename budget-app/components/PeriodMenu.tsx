import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import {
  MONTH_PRESETS,
  WEEK_PRESETS,
  type PeriodSelection,
} from "../lib/analytics";

/** Куда меню становится относительно подписи, которая его открыла. */
export type MenuAnchor = {
  /** Y нижнего края подписи — отсюда меню растёт вниз. */
  top: number;
  /** Y верхнего края подписи — сюда меню упирается, когда растёт вверх. */
  triggerTop: number;
  left: number;
};

type PeriodMenuProps = {
  visible: boolean;
  value: PeriodSelection;
  anchor: MenuAnchor;
  onSelect: (selection: PeriodSelection) => void;
  /** Открыть выбор произвольного диапазона. */
  onCustom: () => void;
  onClose: () => void;
  /**
   * Меню полностью убрано с экрана.
   *
   * Нужно, чтобы открыть следующее модальное окно: iOS не показывает второй
   * `Modal`, пока первый не доиграл закрытие, и календарь молча не появлялся бы.
   */
  onDismissed?: () => void;
};

/**
 * Во что примерно разворачивается список — два раздела по четыре пункта
 * плюс Custom. Точную высоту знать неоткуда: решение «вниз или вверх»
 * принимается до того, как меню отрисовано и его можно измерить.
 */
const ESTIMATED_HEIGHT = 396;

/** Зазор до края экрана, чтобы меню не липло к нему вплотную. */
const SCREEN_MARGIN = 16;

function isActive(
  value: PeriodSelection,
  unit: "month" | "week",
  count: number,
): boolean {
  return value.kind === "preset" && value.unit === unit && value.count === count;
}

function Section({ title }: { title: string }) {
  return (
    <Text
      style={[
        typography.overline,
        {
          color: colors.textTertiary,
          paddingHorizontal: 14,
          paddingTop: spacing.sm,
          paddingBottom: 4,
        },
      ]}
    >
      {title}
    </Text>
  );
}

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
 * Единое меню периода: пресеты по месяцам, по неделям и произвольный
 * диапазон — в одном списке.
 *
 * Отдельного переключателя единиц измерения намеренно нет: «за сколько» и
 * «чем меряем» — один выбор пользователя, и разносить его на два контрола
 * значит заставлять делать два действия там, где хватает одного.
 *
 * Через `Modal`, как и `MonthPicker`: меню лежит поверх скролла экрана и
 * закрывается тапом мимо, а вложенное в `ScrollView` уезжало бы вместе с
 * содержимым.
 */
export function PeriodMenu({
  visible,
  value,
  anchor,
  onSelect,
  onCustom,
  onClose,
  onDismissed,
}: PeriodMenuProps) {
  const screenHeight = Dimensions.get("window").height;

  // Подпись периода есть и на нижней карточке: там места под ней не хватает,
  // и меню разворачивается вверх, а не уезжает за край экрана.
  const flip = anchor.top + ESTIMATED_HEIGHT > screenHeight - SCREEN_MARGIN;

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      // `onDismiss` есть только на iOS; на остальных платформах очереди
      // модальных окон нет и ждать нечего.
      onDismiss={Platform.OS === "ios" ? onDismissed : undefined}
    >
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
            borderRadius: radius.dropdown,
            backgroundColor: colors.surface,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.14)",
            ...placement,
          }}
        >
          <ScrollView contentContainerStyle={{ padding: 6 }}>
            <Section title="By month" />
            {MONTH_PRESETS.map((preset) => (
              <Row
                key={preset.id}
                label={preset.label}
                active={isActive(value, "month", preset.count)}
                onPress={() =>
                  onSelect({ kind: "preset", unit: "month", count: preset.count })
                }
              />
            ))}

            <Section title="By week" />
            {WEEK_PRESETS.map((preset) => (
              <Row
                key={preset.id}
                label={preset.label}
                active={isActive(value, "week", preset.count)}
                onPress={() =>
                  onSelect({ kind: "preset", unit: "week", count: preset.count })
                }
              />
            ))}

            <View
              style={{
                height: 1,
                marginVertical: 6,
                marginHorizontal: 14,
                backgroundColor: colors.separator,
              }}
            />

            <Row
              label="Custom range…"
              active={value.kind === "custom"}
              onPress={onCustom}
            />
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}
