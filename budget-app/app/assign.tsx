import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "../components/Button";
import { Card, CardRow } from "../components/Card";
import { IconTile } from "../components/IconTile";
import { ModalScreen } from "../components/ModalScreen";
import { ProgressBar, spendProgress } from "../components/Progress";
import {
  colors,
  progressHeight,
  radius,
  spacing,
  typography,
} from "../constants/theme";
import { formatMoney, parseMoney, sanitizeMoneyInput } from "../lib/money";
import { useStore, type ResolvedCategory } from "../lib/store";
import { useCloseScreen } from "../lib/navigation";

/**
 * Одинаковые метрики шрифта для префикса `€` и для цифр.
 *
 * Ключевое здесь — `lineHeight: undefined`. Оба стиля начинаются со спреда
 * `typography.amountRow`, а он приносит с собой `lineHeight: 19`, и именно он
 * разводил € с цифрой по вертикали: на iOS `lineHeight` двигает глиф внутри
 * line box у `Text`, но к однострочному `TextInput` не применяется вовсе —
 * там текст центрируется по рамке поля. Две разные схемы выкладки на одной
 * строке и давали постоянный сдвиг примерно в 1.3 pt.
 *
 * По той же причине бесполезно задавать общие `height` + `lineHeight` (так
 * уже пробовали) и `textAlignVertical`/`includeFontPadding` — обе настройки
 * android-only. Без `lineHeight` обе коробки живут по метрикам самого шрифта,
 * и `alignItems: "center"` у контейнера ставит их на одну базовую линию.
 */
const ASSIGN_AMOUNT_TEXT_METRICS = {
  fontSize: 14.5,
  fontWeight: "700" as const,
  lineHeight: undefined,
};

type AssignRowProps = {
  category: ResolvedCategory;
  value: string;
  onChange: (value: string) => void;
};

/** Строка категории с полем «€»: слева что уже есть, справа сколько добавить. */
function AssignRow({ category, value, onChange }: AssignRowProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const current =
    category.kind === "savings"
      ? `${formatMoney(category.assigned)} saved`
      : `${formatMoney(category.assigned)} planned`;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: 13,
      }}
    >
      <IconTile name={category.icon} size={38} />

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.headline, { color: colors.text }]}>{category.name}</Text>
        <Text
          style={[typography.amountCaption, { color: colors.textTertiary, marginTop: 2 }]}
        >
          {current}
        </Text>
      </View>

      {/* Плашка 96×44 — она же область нажатия, отдельный hitSlop не нужен.
          Роли кнопки у неё нет намеренно: это не кнопка, а способ попасть
          пальцем в поле, и с ролью VoiceOver объявил бы инпут кнопкой.
          Подпись живёт на самом `TextInput`. */}
      <Pressable
        accessible={false}
        onPress={() => input.current?.focus()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          minWidth: 96,
          height: 44,
          borderRadius: radius.field,
          borderWidth: 1.5,
          backgroundColor: colors.surfaceField,
          borderColor: focused ? colors.fieldBorderFilled : colors.fieldBorder,
        }}
      >
        <Text
          style={[
            typography.amountRow,
            {
              ...ASSIGN_AMOUNT_TEXT_METRICS,
              color: colors.textMuted,
            },
          ]}
        >
          €
        </Text>
        <TextInput
          ref={input}
          accessibilityLabel={`Assign to ${category.name}`}
          value={value}
          onChangeText={(next) => onChange(sanitizeMoneyInput(next, value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          style={[
            typography.amountRow,
            {
              ...ASSIGN_AMOUNT_TEXT_METRICS,
              // Хватает на «125.50»: при 44 суммы с центами обрезались.
              width: 62,
              padding: 0,
              margin: 0,
              color: colors.text,
            },
          ]}
        />
      </Pressable>
    </View>
  );
}

export default function AssignScreen() {
  const close = useCloseScreen();
  const { groups, readyToAssign, assign } = useStore();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const assignedSum = Object.values(draft).reduce(
    (sum, value) => sum + parseMoney(value),
    0,
  );
  const remaining = readyToAssign - assignedSum;
  const overAssigned = remaining < -0.005;

  const done = () => {
    const amounts: Record<string, number> = {};
    for (const [categoryId, value] of Object.entries(draft)) {
      const amount = parseMoney(value);
      if (amount > 0) amounts[categoryId] = amount;
    }
    assign(amounts);
    close();
  };

  return (
    <ModalScreen>
      <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.lg }]}>
        Assign money
      </Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3, fontSize: 14 }]}>
        Put your ready-to-assign balance to work
      </Text>

      <Card style={{ marginTop: 18 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          Remaining to assign
        </Text>

        <Text
          style={[
            typography.amountLarge,
            {
              marginTop: 2,
              color: overAssigned ? colors.text : colors.positiveText,
            },
          ]}
        >
          {formatMoney(remaining)}
        </Text>

        <ProgressBar
          // Та же раскладка, что и у трат: зелёное — разложенное по плану,
          // красный хвост — насколько разложили больше, чем есть.
          {...spendProgress(assignedSum, readyToAssign)}
          tone="positive"
          height={progressHeight.card}
          style={{ marginTop: spacing.md }}
        />
      </Card>

      {groups.map((group) => (
        <View key={group.id} style={{ marginTop: 22 }}>
          <Text
            style={[
              typography.overline,
              { color: colors.textTertiary, paddingHorizontal: 14, paddingBottom: spacing.sm },
            ]}
          >
            {group.name}
          </Text>
          <Card list>
            {group.categories.map((category, index) => (
              <CardRow key={category.id} first={index === 0}>
                <AssignRow
                  category={category}
                  value={draft[category.id] ?? ""}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, [category.id]: value }))
                  }
                />
              </CardRow>
            ))}
          </Card>
        </View>
      ))}

      <Button
        label="Done"
        disabled={overAssigned || assignedSum <= 0}
        onPress={done}
        style={{ marginTop: 26 }}
      />
    </ModalScreen>
  );
}
