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
import type { CategoryKind } from "../lib/mock-data";
import { isMoneyAmountWithinLimit, limitMoneyInput } from "../lib/money";
import { useStore, type ResolvedCategory } from "../lib/store";
import { useCloseScreen } from "../lib/navigation";

/** Значение чипса «New group» — своей группы у него нет. */
const NEW_GROUP = "__new__";

const TYPES: { value: CategoryKind; label: string }[] = [
  { value: "fixed", label: "Fixed" },
  { value: "savings", label: "Savings" },
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
  const { groups, categories, addCategory, updateCategory } = useStore();

  const editing = categories.find((category) => category.id === id);
  const initial = initialValues(editing, groups[0]?.id ?? "");

  const [name, setName] = useState(initial.name);
  const [groupId, setGroupId] = useState(initial.groupId);
  const [newGroupName, setNewGroupName] = useState("");
  const [kind, setKind] = useState<CategoryKind>(initial.kind);
  const [amount, setAmount] = useState(initial.amount);
  const [icon, setIcon] = useState<IconName>(initial.icon);

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
  }

  const creatingGroup = groupId === NEW_GROUP;
  // Запятая с цифровой клавиатуры — такой же разделитель, как точка.
  const parsedAmount = Number(amount.replace(",", "."));
  const amountValid =
    amount.trim().length > 0 && isMoneyAmountWithinLimit(parsedAmount);

  const canSubmit =
    name.trim().length > 0 &&
    amountValid &&
    (creatingGroup ? newGroupName.trim().length > 0 : groupId.length > 0);

  const submit = () => {
    if (!canSubmit) return;
    const draft = {
      name,
      kind,
      icon,
      amount: parsedAmount,
      groupId: creatingGroup ? "" : groupId,
      newGroupName: creatingGroup ? newGroupName : undefined,
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
        // меняется вместе с типом, чтобы поле не врало.
        label={kind === "fixed" ? "Planned per month, €" : "Savings goal, €"}
        value={amount}
        onChangeText={(next) =>
          setAmount((current) => limitMoneyInput(next, current))
        }
        placeholder="0"
        keyboardType="decimal-pad"
        containerStyle={{ marginTop: spacing.lg }}
      />

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
    </ModalScreen>
  );
}
