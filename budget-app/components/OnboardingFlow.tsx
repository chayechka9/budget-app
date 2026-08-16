import { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";

import { colors, radius, spacing, typography } from "../constants/theme";
import { parseMoney, sanitizeMoneyInput } from "../lib/money";
import type { OnboardingResult } from "../lib/onboarding";
import type { OnboardingGoal } from "../lib/types";
import { Button } from "./Button";
import { Input } from "./Input";

/**
 * Онбординг: приветствие → цель → стартовый баланс.
 *
 * Разметка снята один в один с `Onboarding.dc.html` из Claude Design (проект
 * 596bc56c-e208-4b76-b45c-354ddb873ae5): отступы, размеры и цвета оттуда, а не
 * придуманные здесь. Единственное осознанное отличие от макета — пятый вариант
 * цели «Other» со своим полем ввода.
 *
 * Показывается один раз: `profile.onboarded_at` ставится в конце и больше не
 * снимается. Экран «Replay onboarding» из макета сюда не переносился — в
 * приложении вернуться в онбординг нельзя.
 */

/** Шаги в порядке показа. Балансом заканчиваем — он и есть результат. */
const WELCOME = 0;
const GOAL = 1;
const BALANCE = 2;
const STEP_COUNT = 3;

/**
 * Одинаковые метрики шрифта для префикса `€` и для поля с цифрами — тот же
 * приём, что в поле раскладки на Assign.
 *
 * `lineHeight: undefined` здесь обязателен: `typography.amountSheet` приносит
 * `lineHeight: 58`, и на iOS он двигает глиф внутри line box у `Text`, но к
 * однострочному `TextInput` не применяется вовсе. Две разные схемы выкладки на
 * одной строке разводят символ и цифры по вертикали. Без `lineHeight` обе
 * коробки живут по метрикам шрифта, и `alignItems: "center"` ставит их на одну
 * базовую линию. Подробный разбор — в `app/assign.tsx`.
 */
const AMOUNT_TEXT_METRICS = {
  fontSize: 50,
  fontWeight: "700" as const,
  letterSpacing: -1.5,
  lineHeight: undefined,
};

const GOALS: { id: OnboardingGoal; label: string }[] = [
  { id: "understand", label: "Understand my spending" },
  { id: "save", label: "Save more" },
  { id: "stop", label: "Stop overspending" },
  { id: "explore", label: "Just exploring" },
  // Пятого варианта в макете нет: он добавлен, чтобы человек мог назвать свою
  // причину словами, а не выбирать ближайшую из чужих.
  { id: "other", label: "Other" },
];

/**
 * Галочка выбранного варианта. Нарисована здесь, а не в `Icon`: там набор
 * контурных глифов 24×24, а это залитый кружок из макета онбординга.
 */
function CheckBadge() {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Circle cx={9} cy={9} r={9} fill={colors.positive} />
      <Path
        d="M5 9.2l2.6 2.6L13 6.4"
        stroke={colors.textInverse}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Полоски-шаги слева сверху: текущая длиннее и темнее. */
function StepDots({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <View
          key={index}
          style={{
            width: index === step ? 20 : 7,
            height: 7,
            borderRadius: radius.pill,
            backgroundColor: index === step ? colors.surfaceInverse : colors.border,
          }}
        />
      ))}
    </View>
  );
}

/** Подпись под заголовком — в макете 15/400 с межстрочным 1.5. */
function Subtitle({ children, marginTop }: { children: string; marginTop: number }) {
  return (
    <Text
      style={[
        typography.body,
        { color: colors.textSecondary, lineHeight: 22.5, marginTop },
      ]}
    >
      {children}
    </Text>
  );
}

export function OnboardingFlow({ onDone }: { onDone: (result: OnboardingResult) => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(WELCOME);
  const [goal, setGoal] = useState<OnboardingGoal | null>(null);
  const [goalText, setGoalText] = useState("");
  const [balance, setBalance] = useState("");
  /** Поле баланса уже трогали — цифра перестаёт быть подсказкой. */
  const [touched, setTouched] = useState(false);
  const amountInput = useRef<TextInput>(null);

  /** Символ и цифры всегда одного цвета — это одна сумма, а не два элемента. */
  const amountColor = touched ? colors.text : colors.textPlaceholderLarge;

  const finish = (withBalance: boolean) => {
    const amount = parseMoney(balance);
    onDone({
      goal,
      goalText: goal === "other" ? goalText : null,
      startingBalance: withBalance && amount > 0 ? amount : null,
    });
  };

  /**
   * Skip пропускает только текущий шаг, а не весь онбординг: до стартового
   * баланса пользователь доходит в любом случае, потому что это единственное
   * место, где он теперь задаётся.
   */
  const skip = () => {
    if (step === BALANCE) {
      finish(false);
      return;
    }
    setStep(step + 1);
  };

  const bottom = Math.max(insets.bottom, 34);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          position: "absolute",
          top: 54,
          left: spacing.xl,
          right: spacing.xl,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 5,
        }}
      >
        <StepDots step={step} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip this step"
          onPress={skip}
          style={{ padding: 6 }}
        >
          <Text style={[typography.rowTitle, { color: colors.textTertiary }]}>Skip</Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {step === WELCOME ? (
          <View
            style={{
              flex: 1,
              paddingTop: 130,
              paddingHorizontal: spacing.xxl,
              paddingBottom: bottom,
            }}
          >
            <View style={{ flex: 1 }} />
            <Text accessibilityRole="header" style={[typography.screenTitle, { color: colors.text }]}>
              Understand where your money goes
            </Text>
            <Subtitle marginTop={14}>
              A calm, honest look at your spending. No pressure, no blocking.
            </Subtitle>
            <View style={{ flex: 1.4 }} />
            <Button label="Get started" onPress={() => setStep(GOAL)} style={{ height: 54 }} />
          </View>
        ) : null}

        {step === GOAL ? (
          <View
            style={{
              flex: 1,
              paddingTop: 130,
              paddingHorizontal: spacing.xl,
              paddingBottom: bottom,
            }}
          >
            <Text accessibilityRole="header" style={[typography.detailTitle, { color: colors.text }]}>
              What brings you here?
            </Text>

            <View style={{ marginTop: 22, gap: 10 }}>
              {GOALS.map((option) => {
                const selected = goal === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setGoal(option.id)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 56,
                      paddingHorizontal: 18,
                      borderRadius: radius.dropdown,
                      backgroundColor: selected ? colors.positiveSurface : colors.surface,
                      borderWidth: 1,
                      borderColor: selected ? colors.positiveSurface : colors.border,
                    }}
                  >
                    <Text
                      style={[
                        typography.headline,
                        { color: selected ? colors.positiveTextStrong : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    {selected ? <CheckBadge /> : null}
                  </Pressable>
                );
              })}
            </View>

            {/* Своё поле появляется только под выбранным «Other» — оно и есть
                весь смысл этого варианта. */}
            {goal === "other" ? (
              <Input
                value={goalText}
                onChangeText={setGoalText}
                placeholder="What are you here for?"
                maxLength={80}
                returnKeyType="done"
                accessibilityLabel="Your own reason"
                containerStyle={{ marginTop: 10 }}
              />
            ) : null}

            <View style={{ flex: 1 }} />
            <Button
              label="Continue"
              disabled={goal === null}
              onPress={() => setStep(BALANCE)}
              style={{ height: 54 }}
            />
          </View>
        ) : null}

        {step === BALANCE ? (
          <View
            style={{
              flex: 1,
              paddingTop: 130,
              paddingHorizontal: spacing.xxl,
              paddingBottom: bottom,
            }}
          >
            <Text accessibilityRole="header" style={[typography.detailTitle, { color: colors.text }]}>
              What&apos;s your balance today?
            </Text>
            <Subtitle marginTop={10}>
              Just what&apos;s in your account right now. Nothing to calculate.
            </Subtitle>

            <View style={{ flex: 1 }} />

            {/* Символ и поле — как в строке раскладки на Assign: € живёт
                отдельным `Text` перед полем и не редактируется, поэтому курсор
                физически не может встать левее него, а цифры и каретка идут
                следом. Нажатие на всю строку, включая символ, ставит курсор в
                поле — иначе тапнуть мимо было бы слишком легко. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enter your starting balance"
              onPress={() => amountInput.current?.focus()}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 0,
              }}
            >
              <Text
                style={[typography.amountSheet, { ...AMOUNT_TEXT_METRICS, color: amountColor }]}
              >
                €
              </Text>
              <TextInput
                ref={amountInput}
                value={balance}
                onChangeText={(next) => {
                  setTouched(true);
                  setBalance((current) => sanitizeMoneyInput(next, current));
                }}
                onFocus={() => setTouched(true)}
                placeholder="0"
                placeholderTextColor={colors.textPlaceholderLarge}
                keyboardType="decimal-pad"
                inputMode="decimal"
                accessibilityLabel="Starting balance"
                style={[
                  typography.amountSheet,
                  {
                    ...AMOUNT_TEXT_METRICS,
                    // Ширина из макета. Хватает на «12345.67»: столько стоит
                    // ожидать от стартового баланса, набранного руками.
                    width: 200,
                    padding: 0,
                    margin: 0,
                    color: amountColor,
                  },
                ]}
              />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityHint="Finishes setup without recording a starting balance."
              onPress={() => finish(false)}
              style={{ marginTop: 16, padding: 6 }}
            >
              <Text
                style={[
                  typography.rowTitle,
                  { color: colors.textSecondary, textAlign: "center" },
                ]}
              >
                Start from zero instead
              </Text>
            </Pressable>

            <View style={{ flex: 1.4 }} />
            <Button label="Done" onPress={() => finish(true)} style={{ height: 54 }} />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}
