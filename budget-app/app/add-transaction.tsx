import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { colors, radius, spacing, typography } from "../constants/theme";
import { MOCK_CATEGORY_NAMES } from "../lib/mock-data";

/** Сегодняшняя дата как YYYY-MM-DD. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function AddTransactionScreen() {
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());

  // Сохранения пока нет — слой данных появится на Stage 1.
  // Модалка просто закрывается.
  const canSave = amount.trim().length > 0 && category !== null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.surfaceSheet }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: spacing.xxxl }}>
        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          emphasis
        />

        <View style={{ marginTop: spacing.lg }}>
          <Text
            style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}
          >
            Category
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            {MOCK_CATEGORY_NAMES.map((name) => {
              const selected = category === name;
              return (
                <Pressable
                  key={name}
                  onPress={() => setCategory(name)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={{
                    borderRadius: radius.pill,
                    borderWidth: 0.5,
                    borderColor: selected ? colors.surfaceInverse : colors.separator,
                    backgroundColor: selected ? colors.surfaceInverse : colors.surface,
                    paddingHorizontal: 13,
                    paddingVertical: spacing.sm,
                  }}
                >
                  <Text
                    style={[
                      typography.amountCaption,
                      { color: selected ? colors.textInverse : colors.text },
                    ]}
                  >
                    {name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Input
          label="Note"
          value={note}
          onChangeText={setNote}
          placeholder="Add a note"
          containerStyle={{ marginTop: spacing.lg }}
        />

        <Input
          label="Date"
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          containerStyle={{ marginTop: spacing.lg }}
        />

        <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
          <Button label="Save" disabled={!canSave} onPress={() => router.back()} />
          <Button label="Cancel" variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
