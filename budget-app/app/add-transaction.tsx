import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { NumericKeypad, type KeypadKey } from "../components/NumericKeypad";
import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { MOCK_CATEGORY_OPTIONS } from "../lib/mock-data";

/** Сегодняшняя дата как YYYY-MM-DD. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Применяет нажатие клавиши к строке суммы. */
function applyKey(amount: string, key: KeypadKey): string {
  if (key === "backspace") return amount.slice(0, -1);
  if (key === ".") return amount.includes(".") ? amount : amount === "" ? "0." : `${amount}.`;
  // Не даём набрать больше двух знаков после точки.
  const [, fraction] = amount.split(".");
  if (fraction !== undefined && fraction.length >= 2) return amount;
  // Ведущий ноль заменяем первой значащей цифрой.
  if (amount === "0") return key;
  return amount + key;
}

export default function AddTransactionScreen() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [dateOpen, setDateOpen] = useState(false);

  // Сохранения пока нет — слой данных появится на Stage 1.
  // Шит просто закрывается.
  const canSave = amount.trim().length > 0 && Number(amount) > 0 && category !== null;
  const isToday = date === today();

  return (
    <BottomSheet title="New transaction" onClose={() => router.back()}>
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ flexGrow: 0 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
      {/* Сумма: крупный текст по центру, без рамки и без label */}
      <Text
        style={[
          typography.amountSheet,
          {
            color: amount ? colors.text : colors.textFaint,
            textAlign: "center",
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm,
          },
        ]}
      >
        €{amount || "0"}
      </Text>

      {/* Категории — чипсы с иконкой */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          justifyContent: "center",
        }}
      >
        {MOCK_CATEGORY_OPTIONS.map((option) => {
          const selected = category === option.name;
          return (
            <Pressable
              key={option.name}
              onPress={() => setCategory(option.name)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderRadius: radius.pill,
                borderWidth: 0.5,
                borderColor: selected ? colors.surfaceInverse : colors.separator,
                backgroundColor: selected ? colors.surfaceInverse : colors.surface,
                paddingHorizontal: 13,
                paddingVertical: spacing.sm,
              }}
            >
              <Icon
                name={option.icon}
                size={iconSize.xs}
                color={selected ? colors.textInverse : colors.text}
              />
              <Text
                style={[
                  typography.amountCaption,
                  { color: selected ? colors.textInverse : colors.text },
                ]}
              >
                {option.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Заметка и дата — в один ряд */}
      <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: 14 }}>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          placeholderTextColor={colors.textFaint}
          style={[
            typography.rowTitle,
            {
              flex: 1,
              minWidth: 0,
              color: colors.text,
              backgroundColor: colors.surfaceField,
              borderRadius: radius.tile,
              paddingHorizontal: 14,
              paddingVertical: spacing.md,
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change date"
          onPress={() => setDateOpen((open) => !open)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            borderRadius: radius.tile,
            backgroundColor: dateOpen ? colors.surfaceInverse : colors.surfaceField,
            paddingHorizontal: 13,
            paddingVertical: spacing.md,
          }}
        >
          <Icon
            name="calendar"
            size={iconSize.xs}
            color={dateOpen ? colors.textInverse : colors.text}
          />
          <Text
            style={[
              typography.amountCaption,
              { color: dateOpen ? colors.textInverse : colors.text },
            ]}
          >
            {isToday ? "Today" : date}
          </Text>
        </Pressable>
      </View>

      </ScrollView>

      {/* Ввод даты остаётся доступным — раскрывается по тапу на чип */}
      {dateOpen ? (
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textFaint}
          autoFocus
          style={[
            typography.rowTitle,
            {
              color: colors.text,
              backgroundColor: colors.surfaceField,
              borderRadius: radius.tile,
              paddingHorizontal: 14,
              paddingVertical: spacing.md,
              marginTop: spacing.sm,
            },
          ]}
        />
      ) : (
        <NumericKeypad onKey={(key) => setAmount((current) => applyKey(current, key))} />
      )}

      <Button
        label="Save"
        disabled={!canSave}
        onPress={() => router.back()}
        style={{ marginTop: 10 }}
      />
    </BottomSheet>
  );
}
