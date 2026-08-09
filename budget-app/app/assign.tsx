import { useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { Button } from "../components/Button";
import { Card, CardRow } from "../components/Card";
import { IconTile } from "../components/IconTile";
import { ModalScreen } from "../components/ModalScreen";
import { ProgressBar, spendProgress } from "../components/Progress";
import {
  OVERSPEND_DOT_SIZE,
  colors,
  progressHeight,
  radius,
  spacing,
  typography,
} from "../constants/theme";
import { formatMoney } from "../lib/mock-data";
import { useStore, type ResolvedCategory } from "../lib/store";
import { useCloseScreen } from "../lib/navigation";

/** Оставляем только цифры и одну точку с двумя знаками после неё. */
function sanitizeAmount(input: string): string {
  const cleaned = input.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  return rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

function parseAmount(input: string | undefined): number {
  const value = Number.parseFloat(input ?? "");
  return Number.isFinite(value) ? value : 0;
}

type AssignRowProps = {
  category: ResolvedCategory;
  value: string;
  onChange: (value: string) => void;
};

/** Строка категории с полем «+€»: слева что уже есть, справа сколько добавить. */
function AssignRow({ category, value, onChange }: AssignRowProps) {
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  // Поле с введённой суммой выглядит иначе, чем пустое: белая подложка и
  // зелёный «+€» показывают, что в эту категорию уже что-то положили, ещё до
  // того, как читаешь цифру.
  const filled = parseAmount(value) > 0;

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

      {/* Плашка сама по себе — цель 78×44: это и есть область нажатия, отдельный
          hitSlop ей больше не нужен. Нажатие в любую её точку переводит фокус
          в поле, поэтому попадать надо по плашке, а не по строке текста. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Assign to ${category.name}`}
        onPress={() => input.current?.focus()}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          minWidth: 78,
          height: 44,
          borderRadius: radius.field,
          borderWidth: 1.5,
          backgroundColor: focused || filled ? colors.surface : colors.surfaceField,
          borderColor: focused
            ? colors.positive
            : filled
              ? colors.fieldBorderFilled
              : colors.fieldBorder,
          // Фокус видно кольцом наружу, а не сменой размера: поле не должно
          // дёргать соседние строки, когда в него встают.
          ...(focused
            ? { boxShadow: `0 0 0 3px ${colors.positiveSurfacePressed}` }
            : null),
        }}
      >
        <Text
          style={[
            typography.amountRow,
            {
              fontSize: 14.5,
              fontWeight: "700",
              color: filled ? colors.positiveText : colors.textMuted,
            },
          ]}
        >
          +€
        </Text>
        <TextInput
          ref={input}
          value={value}
          onChangeText={(next) => onChange(sanitizeAmount(next))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={colors.textFaint}
          style={[
            typography.amountRow,
            {
              width: 44,
              padding: 0,
              fontSize: 14.5,
              fontWeight: "700",
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
    (sum, value) => sum + parseAmount(value),
    0,
  );
  const remaining = readyToAssign - assignedSum;
  const overAssigned = remaining < -0.005;

  const done = () => {
    const amounts: Record<string, number> = {};
    for (const [categoryId, value] of Object.entries(draft)) {
      const amount = parseAmount(value);
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

        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Text
            style={[
              typography.amountLarge,
              {
                marginTop: 2,
                // Перерасход остаётся нейтральным по цвету — сигналит точка,
                // как и в строках категорий на Budget.
                color: overAssigned ? colors.text : colors.positiveText,
              },
            ]}
          >
            {formatMoney(remaining)}
          </Text>
          {overAssigned ? (
            <View
              accessibilityLabel="More than you have"
              style={{
                width: OVERSPEND_DOT_SIZE,
                height: OVERSPEND_DOT_SIZE,
                borderRadius: radius.pill,
                backgroundColor: colors.overspend,
              }}
            />
          ) : null}
        </View>

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
