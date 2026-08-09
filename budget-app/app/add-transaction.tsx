import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import { BottomSheet } from "../components/BottomSheet";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { NumericKeypad, type KeypadKey } from "../components/NumericKeypad";
import { SegmentedControl } from "../components/SegmentedControl";
import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { formatMoney, MOCK_INCOME_SOURCES } from "../lib/mock-data";
import { isMoneyAmountWithinLimit, limitMoneyInput } from "../lib/money";
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
  const next = amount === "0" ? key : amount + key;
  return limitMoneyInput(next, amount);
}

const SEGMENTS: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

const CATEGORY_PAGE_SIZE = 11;

type TransactionOption = { name: string; icon: IconName };

/** Один chip без изменений внешнего вида относительно прежнего списка. */
function OptionChip({
  option,
  active,
  income,
  accent,
  onPress,
}: {
  option: TransactionOption;
  active: boolean;
  income: boolean;
  accent: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
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
      {income ? null : (
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
}

/** Тот же перенос chips внутри обычного списка или отдельной страницы. */
function OptionCloud({
  options,
  selected,
  income,
  accent,
  onSelect,
  width,
}: {
  options: TransactionOption[];
  selected: TransactionOption | null;
  income: boolean;
  accent: string;
  onSelect: (option: TransactionOption) => void;
  width?: number;
}) {
  return (
    <View
      style={{
        width,
        flexDirection: "row",
        flexWrap: "wrap",
        gap: spacing.sm,
        justifyContent: "center",
      }}
    >
      {options.map((option, index) => (
        <OptionChip
          key={`${option.name}-${index}`}
          option={option}
          active={selected?.name === option.name}
          income={income}
          accent={accent}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
  );
}

/**
 * До 11 категорий сохраняет прежний flex-wrap. Для большего списка добавляет
 * крайние клоны: [последняя, первая…последняя, первая]. После свайпа на клон
 * позиция без анимации переносится на его идентичную реальную страницу.
 */
function CategoryPicker({
  options,
  selected,
  income,
  accent,
  onSelect,
}: {
  options: TransactionOption[];
  selected: TransactionOption | null;
  income: boolean;
  accent: string;
  onSelect: (option: TransactionOption) => void;
}) {
  const scroller = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [positioned, setPositioned] = useState(false);
  const [activePage, setActivePage] = useState(0);

  const pages: TransactionOption[][] = [];
  for (let index = 0; index < options.length; index += CATEGORY_PAGE_SIZE) {
    pages.push(options.slice(index, index + CATEGORY_PAGE_SIZE));
  }

  const circular = !income && pages.length > 1;
  const loopPages = circular
    ? [pages[pages.length - 1], ...pages, pages[0]]
    : pages;

  useEffect(() => {
    if (!circular || pageWidth === 0) return;

    setPositioned(false);
    const frame = requestAnimationFrame(() => {
      scroller.current?.scrollTo({ x: pageWidth, animated: false });
      setActivePage(0);
      requestAnimationFrame(() => setPositioned(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [circular, pageWidth, pages.length]);

  if (!circular) {
    return (
      <OptionCloud
        options={options}
        selected={selected}
        income={income}
        accent={accent}
        onSelect={onSelect}
      />
    );
  }

  const measure = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && width !== pageWidth) setPageWidth(width);
  };

  const finishPage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const physicalPage = Math.round(event.nativeEvent.contentOffset.x / pageWidth);

    if (physicalPage === 0) {
      scroller.current?.scrollTo({ x: pages.length * pageWidth, animated: false });
      setActivePage(pages.length - 1);
    } else if (physicalPage === pages.length + 1) {
      scroller.current?.scrollTo({ x: pageWidth, animated: false });
      setActivePage(0);
    } else {
      setActivePage(physicalPage - 1);
    }
  };

  const showPage = (index: number) => {
    scroller.current?.scrollTo({ x: (index + 1) * pageWidth, animated: true });
    setActivePage(index);
  };

  return (
    <View onLayout={measure} style={{ width: "100%" }}>
      {pageWidth === 0 ? (
        <OptionCloud
          options={pages[0]}
          selected={selected}
          income={false}
          accent={accent}
          onSelect={onSelect}
        />
      ) : (
        <ScrollView
          ref={scroller}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          directionalLockEnabled
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={finishPage}
          style={{ opacity: positioned ? 1 : 0 }}
        >
          {loopPages.map((page, index) => (
            <OptionCloud
              key={
                index === 0
                  ? "last-page-clone"
                  : index === loopPages.length - 1
                    ? "first-page-clone"
                    : `page-${index - 1}`
              }
              options={page}
              selected={selected}
              income={false}
              accent={accent}
              onSelect={onSelect}
              width={pageWidth}
            />
          ))}
        </ScrollView>
      )}

      {pageWidth > 0 && positioned ? (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          {pages.map((_, index) => (
            <Pressable
              key={`page-indicator-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Category page ${index + 1} of ${pages.length}`}
              accessibilityState={{ selected: activePage === index }}
              onPress={() => showPage(index)}
              hitSlop={4}
              style={{ padding: 3 }}
            >
              <View
                style={{
                  width: activePage === index ? 12 : 5,
                  height: 5,
                  borderRadius: radius.pill,
                  backgroundColor:
                    activePage === index ? colors.textMuted : colors.separator,
                }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

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

  const parsedAmount = Number(amount);
  const canSave =
    amount.trim().length > 0 &&
    parsedAmount > 0 &&
    isMoneyAmountWithinLimit(parsedAmount) &&
    selected !== null;
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
      amount: parsedAmount,
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
          {selected ? formatMoney(Number(amount || 0)) : `€${amount || "0"}`}
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
        <CategoryPicker
          options={options}
          selected={selected}
          income={isIncome}
          accent={accent}
          onSelect={setSelected}
        />

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
