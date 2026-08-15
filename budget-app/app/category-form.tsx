import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button } from "../components/Button";
import { CATEGORY_ICONS, type IconName } from "../components/Icon";
import { IconTile } from "../components/IconTile";
import { Input } from "../components/Input";
import { ModalScreen } from "../components/ModalScreen";
import { SegmentedControl } from "../components/SegmentedControl";
import { colors, radius, spacing, typography } from "../constants/theme";
import { contributionPerPeriod } from "../lib/budget";
import { todayIso } from "../lib/dates";
import { formatMoney, isMoneyAmountWithinLimit, sanitizeMoneyInput } from "../lib/money";
import { useStore, type ResolvedCategory } from "../lib/store";
import type { CategoryKind, GoalCadence } from "../lib/types";
import { useCloseScreen } from "../lib/navigation";

/** Значение чипса «New group» — своей группы у него нет. */
const NEW_GROUP = "__new__";

/** Дата цели вводится текстом — принимаем только полный ISO-день. */
const ISO_DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

const TYPES: { value: CategoryKind; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "savings", label: "Savings" },
];

const CADENCES: { value: GoalCadence; label: string }[] = [
  { value: "monthly", label: "Per month" },
  { value: "weekly", label: "Per week" },
];

/** Подпись над блоком полей — тот же оверлайн, что у групп на Budget. */
function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={[
        typography.caption,
        { color: colors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.lg },
      ]}
    >
      {children}
    </Text>
  );
}

/** Чипс выбора: тот же вид, что у выбора категории в шите транзакции. */
function Chip({
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
      style={{
        borderRadius: radius.pill,
        borderWidth: 0.5,
        borderColor: active ? colors.surfaceInverse : colors.separator,
        backgroundColor: active ? colors.surfaceInverse : colors.surface,
        paddingHorizontal: 13,
        paddingVertical: spacing.sm,
      }}
    >
      <Text
        style={[
          typography.amountCaption,
          { color: active ? colors.textInverse : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Стартовые значения формы: пустые для новой категории, текущие для правки. */
function initialValues(editing: ResolvedCategory | undefined, fallbackGroupId: string) {
  const amount = editing
    ? editing.kind === "fixed"
      ? editing.assigned
      : editing.target
    : undefined;

  return {
    name: editing?.name ?? "",
    groupId: editing?.groupId ?? fallbackGroupId,
    kind: editing?.kind ?? ("fixed" as CategoryKind),
    amount: amount ? String(amount) : "",
    icon: editing?.icon ?? CATEGORY_ICONS[0],
    targetDate: editing?.targetDate ?? "",
    cadence: editing?.cadence ?? ("monthly" as GoalCadence),
  };
}

/**
 * Форма категории — одна на создание и редактирование.
 *
 * Без параметра это «New category» с кнопкой Create; с `?id=…` — «Edit
 * category», предзаполненная текущими значениями, с кнопкой Save. Второй
 * экран заводить не стали: поля совпадают полностью, и они бы разъехались.
 */
export default function CategoryFormScreen() {
  const close = useCloseScreen();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const {
    groups,
    categories,
    archivedCategories,
    addCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
  } = useStore();

  // Архивную категорию форма тоже обязана открывать: иначе её нельзя ни
  // посмотреть, ни вернуть.
  const editing =
    categories.find((category) => category.id === id) ??
    archivedCategories.find((category) => category.id === id);
  const archived = editing?.archivedAt !== null && editing !== undefined;
  const initial = initialValues(editing, groups[0]?.id ?? "");

  const [name, setName] = useState(initial.name);
  const [groupId, setGroupId] = useState(initial.groupId);
  const [newGroupName, setNewGroupName] = useState("");
  const [kind, setKind] = useState<CategoryKind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [icon, setIcon] = useState<IconName>(initial.icon);
  const [targetDate, setTargetDate] = useState(initial.targetDate);
  const [cadence, setCadence] = useState<GoalCadence>(initial.cadence);
  /** Архивация уже спросила подтверждение и ждёт второго тапа. */
  const [archiveArmed, setArchiveArmed] = useState(false);

  // Экран может остаться смонтированным между открытиями (переход сразу с
  // одной категории на другую): тогда useState не переинициализируется и
  // форма показала бы прошлые значения. Сбрасываем её на смену id.
  const [shownId, setShownId] = useState(id);
  if (id !== shownId) {
    setShownId(id);
    setName(initial.name);
    setGroupId(initial.groupId);
    setNewGroupName("");
    setKind(initial.kind);
    setAmount(initial.amount);
    setIcon(initial.icon);
    setTargetDate(initial.targetDate);
    setCadence(initial.cadence);
    setArchiveArmed(false);
  }

  const creatingGroup = groupId === NEW_GROUP;
  // Запятая с цифровой клавиатуры — такой же разделитель, как точка.
  const parsedAmount = Number(amount.replace(",", "."));
  const filledAmount = amount.trim().length > 0;
  /**
   * Пустое поле суммы — валидное состояние: план на месяц необязателен, а
   * накопление может быть бессрочным. Непустое обязано быть числом в пределах
   * лимита, иначе сохранять нечего.
   */
  const amountValid = !filledAmount || isMoneyAmountWithinLimit(parsedAmount);
  const dateValid = targetDate.trim().length === 0 || ISO_DATE.test(targetDate.trim());

  const canSubmit =
    name.trim().length > 0 &&
    amountValid &&
    dateValid &&
    (creatingGroup ? newGroupName.trim().length > 0 : groupId.length > 0);

  /**
   * Сколько нужно откладывать, чтобы успеть к дате. Уже накопленное берём из
   * категории: цель считается от остатка, а не от нуля.
   */
  const contribution =
    kind === "savings" && filledAmount && dateValid && targetDate.trim()
      ? contributionPerPeriod(
          {
            targetAmount: parsedAmount,
            targetDate: targetDate.trim(),
            cadence,
          },
          editing?.assigned ?? 0,
          todayIso(),
        )
      : null;

  /**
   * Первый тап взводит подтверждение, второй архивирует — тот же жест, что и
   * у удаления транзакции. Восстановление подтверждения не требует: оно
   * ничего не прячет.
   */
  const toggleArchive = () => {
    if (!editing) return;
    if (archived) {
      restoreCategory(editing.id);
      close();
      return;
    }
    if (!archiveArmed) {
      setArchiveArmed(true);
      return;
    }
    archiveCategory(editing.id);
    close();
  };

  const submit = () => {
    if (!canSubmit) return;
    const draft = {
      name,
      kind,
      icon,
      amount: filledAmount ? parsedAmount : null,
      groupId: creatingGroup ? "" : groupId,
      newGroupName: creatingGroup ? newGroupName : undefined,
      // Дата и ритм взносов относятся только к накоплению; у обычной
      // категории их некуда приложить.
      targetDate: kind === "savings" ? targetDate.trim() || null : null,
      cadence: kind === "savings" ? cadence : null,
    };

    if (editing) {
      updateCategory(editing.id, draft);
    } else {
      addCategory(draft);
    }
    close();
  };

  return (
    <ModalScreen>
      <Text style={[typography.screenTitle, { color: colors.text, marginTop: spacing.md }]}>
        {editing ? "Edit category" : "New category"}
      </Text>

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        placeholder="Groceries"
        containerStyle={{ marginTop: spacing.lg }}
      />

      <FieldLabel>Group</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {groups.map((group) => (
          <Chip
            key={group.id}
            label={group.name}
            active={groupId === group.id}
            onPress={() => setGroupId(group.id)}
          />
        ))}
        <Chip
          label="New group"
          active={creatingGroup}
          onPress={() => setGroupId(NEW_GROUP)}
        />
      </View>

      {creatingGroup ? (
        <Input
          value={newGroupName}
          onChangeText={setNewGroupName}
          placeholder="Group name"
          containerStyle={{ marginTop: spacing.md }}
        />
      ) : null}

      <FieldLabel>Type</FieldLabel>
      <SegmentedControl segments={TYPES} value={kind} onChange={setKind} />

      <Input
        // У savings сумма — не месячный план, а цель накопления: подпись
        // меняется вместе с типом, чтобы поле не врало. Оба поля
        // необязательны, и подпись говорит об этом прямо.
        label={
          kind === "fixed" ? "Planned per month, € (optional)" : "Savings goal, € (optional)"
        }
        value={amount}
        onChangeText={(next) =>
          setAmount((current) => sanitizeMoneyInput(next, current))
        }
        placeholder="0"
        keyboardType="decimal-pad"
        containerStyle={{ marginTop: spacing.lg }}
      />

      {/* Цель с датой: приложение только считает взнос, деньги оно не
          переводит и бюджет само не меняет. */}
      {kind === "savings" && filledAmount ? (
        <>
          <Input
            label="Target date (optional)"
            value={targetDate}
            onChangeText={setTargetDate}
            placeholder="YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            containerStyle={{ marginTop: spacing.lg }}
          />

          {targetDate.trim().length > 0 ? (
            <>
              <FieldLabel>Put aside</FieldLabel>
              <SegmentedControl
                segments={CADENCES}
                value={cadence}
                onChange={setCadence}
              />
              {contribution === null ? null : (
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, marginTop: spacing.sm },
                  ]}
                >
                  {`Put aside ${formatMoney(contribution)} per ${
                    cadence === "weekly" ? "week" : "month"
                  }.`}
                </Text>
              )}
            </>
          ) : null}
        </>
      ) : null}

      <FieldLabel>Icon</FieldLabel>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {CATEGORY_ICONS.map((option) => (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityLabel={option}
            accessibilityState={{ selected: icon === option }}
            onPress={() => setIcon(option)}
          >
            <IconTile name={option} size={44} selected={icon === option} />
          </Pressable>
        ))}
      </View>

      <Button
        label={editing ? "Save" : "Create"}
        disabled={!canSubmit}
        onPress={submit}
        style={{ marginTop: spacing.xxl }}
      />

      {/* Архивация — тихая ссылка под основной кнопкой, как удаление в шите
          транзакции. Категория не удаляется: её история остаётся на месте,
          а сама она в любой момент возвращается. */}
      {editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            archived
              ? "Restore category"
              : archiveArmed
                ? "Tap again to archive"
                : "Archive category"
          }
          accessibilityHint={
            archived
              ? undefined
              : "Hides the category from new transactions. Past transactions keep it."
          }
          onPress={toggleArchive}
          style={{ alignItems: "center", marginTop: 14, padding: 6 }}
        >
          <Text
            style={[
              typography.rowTitle,
              { color: archiveArmed ? colors.textConfirm : colors.textSecondary },
            ]}
          >
            {archived
              ? "Restore category"
              : archiveArmed
                ? "Tap again to archive"
                : "Archive category"}
          </Text>
        </Pressable>
      ) : null}
    </ModalScreen>
  );
}
