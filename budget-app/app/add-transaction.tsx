import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { NumericKeypad, type KeypadKey } from "../components/NumericKeypad";
import { SegmentedControl } from "../components/SegmentedControl";
import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { MOCK_INCOME_SOURCES } from "../lib/mock-data";
import { useStore, type TransactionType } from "../lib/store";
import { useCloseScreen } from "../lib/navigation";

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

const SEGMENTS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export default function AddTransactionScreen() {
  const close = useCloseScreen();
  const { addTransaction, categories } = useStore();

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<{ name: string; icon: IconName } | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [dateOpen, setDateOpen] = useState(false);

  const isIncome = type === "income";
  // Доход — позитивное событие, поэтому акцент зелёный, а не тёмный.
  const accent = isIncome ? colors.positive : colors.surfaceInverse;
  // Категории берём из стора, а не из моков: созданные в этой сессии должны
  // сразу быть доступны для трат.
  const options = isIncome
    ? MOCK_INCOME_SOURCES
    : categories.map((category) => ({ name: category.name, icon: category.icon }));

  const canSave = amount.trim().length > 0 && Number(amount) > 0 && selected !== null;
  const isToday = date === today();

  /** Смена режима сбрасывает выбор: категории и источники не взаимозаменяемы. */
  const changeType = (next: TransactionType) => {
    if (next === type) return;
    setType(next);
    setSelected(null);
  };

  const save = () => {
    if (!canSave || !selected) return;
    addTransaction({
      type,
      amount: Number(amount),
      label: selected.name,
      icon: selected.icon,
      note,
      date,
    });
    close();
  };

  return (
    <BottomSheet title="New transaction" onClose={() => close()}>
      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={{ flexGrow: 0 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: spacing.md }}>
          <SegmentedControl segments={SEGMENTS} value={type} onChange={changeType} />
        </View>

        {/* Сумма: крупный текст по центру, без рамки и без label */}
        <Text
          style={[
            typography.amountSheet,
            {
              color: amount ? accent : colors.textFaint,
              textAlign: "center",
              paddingTop: spacing.lg,
              paddingBottom: isIncome ? spacing.xs : spacing.sm,
            },
          ]}
        >
          €{amount || "0"}
        </Text>

        {isIncome ? (
          <Text
            style={[
              typography.overline,
              {
                color: colors.textTertiary,
                textAlign: "center",
                marginBottom: spacing.md,
              },
            ]}
          >
            Source
          </Text>
        ) : null}

        {/* Категории расхода или источники дохода */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: spacing.sm,
            justifyContent: "center",
          }}
        >
          {options.map((option) => {
            const active = selected?.name === option.name;
            return (
              <Pressable
                key={option.name}
                onPress={() => setSelected(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: radius.pill,
                  borderWidth: 0.5,
                  borderColor: active ? accent : colors.separator,
                  backgroundColor: active ? accent : colors.surface,
                  paddingHorizontal: 13,
                  paddingVertical: spacing.sm,
                }}
              >
                {isIncome ? null : (
                  <Icon
                    name={option.icon}
                    size={iconSize.xs}
                    color={active ? colors.textInverse : colors.text}
                  />
                )}
                <Text
                  style={[
                    typography.amountCaption,
                    { color: active ? colors.textInverse : colors.text },
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
              backgroundColor: dateOpen ? accent : colors.surfaceField,
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
        variant={isIncome ? "positive" : "primary"}
        disabled={!canSave}
        onPress={save}
        style={{ marginTop: 10 }}
      />
    </BottomSheet>
  );
}
