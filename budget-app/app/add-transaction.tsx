import { useLocalSearchParams } from "expo-router";
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
import { NumericKeypad } from "../components/NumericKeypad";
import { SegmentedControl } from "../components/SegmentedControl";
import { colors, iconSize, radius, spacing, typography } from "../constants/theme";
import { MOCK_INCOME_SOURCES, type MockTransaction } from "../lib/mock-data";
import {
  appendMoneyKey,
  formatMoney,
  isMoneyAmountWithinLimit,
  parseMoney,
} from "../lib/money";
import { useStore, type TransactionType } from "../lib/store";
import { useCloseScreen, useCloseTransactionFlow } from "../lib/navigation";

/** Сегодняшняя дата как YYYY-MM-DD. */
function today(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
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

/** Стартовые значения формы: пустые для новой траты, текущие для правки. */
function initialValues(editing: MockTransaction | undefined) {
  if (!editing) {
    return {
      type: "expense" as TransactionType,
      amount: "",
      selected: null,
      note: "",
      date: today(),
    };
  }

  const income = editing.amount > 0;
  return {
    type: (income ? "income" : "expense") as TransactionType,
    amount: String(Math.abs(editing.amount)),
    // У дохода выбран источник, у расхода — категория. Иконку берём из самой
    // записи: она уже та, что показывается в списке.
    selected: {
      name: income ? editing.payee : editing.category,
      icon: editing.icon,
    } as TransactionOption,
    // В `payee` у расхода лежит заметка, а если её не было — название
    // категории. Второе в поле заметки показывать нечего.
    note: !income && editing.payee !== editing.category ? editing.payee : "",
    date: editing.date,
  };
}

/**
 * Шит транзакции — один на создание и правку.
 *
 * Без параметра это «New transaction»; с `?id=…` — «Edit transaction» с
 * предзаполненными полями, кнопкой Save и тихой ссылкой удаления под ней.
 * Второй экран не заводили по той же причине, что и у категорий: поля
 * совпадают полностью, и две копии разъехались бы.
 */
export default function TransactionSheetScreen() {
  const close = useCloseScreen();
  const closeFlow = useCloseTransactionFlow();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { addTransaction, updateTransaction, deleteTransaction, categories, transactions } =
    useStore();

  const editing = id ? transactions.find((transaction) => transaction.id === id) : undefined;
  const initial = initialValues(editing);

  const [type, setType] = useState<TransactionType>(initial.type);
  const [amount, setAmount] = useState(initial.amount);
  const [selected, setSelected] = useState<TransactionOption | null>(initial.selected);
  const [note, setNote] = useState(initial.note);
  const [date, setDate] = useState(initial.date);
  const [dateOpen, setDateOpen] = useState(false);
  /** Удаление уже спросило подтверждение и ждёт второго тапа. */
  const [deleteArmed, setDeleteArmed] = useState(false);

  // Шит может остаться смонтированным между открытиями (правка одной записи,
  // затем добавление новой): useState тогда не переинициализируется и форма
  // показала бы прошлые значения. Сбрасываем её на смену id.
  const [shownId, setShownId] = useState(id);
  if (id !== shownId) {
    setShownId(id);
    setType(initial.type);
    setAmount(initial.amount);
    setSelected(initial.selected);
    setNote(initial.note);
    setDate(initial.date);
    setDateOpen(false);
    setDeleteArmed(false);
  }

  const isIncome = type === "income";
  // Доход — позитивное событие, поэтому акцент зелёный, а не тёмный.
  const accent = isIncome ? colors.positive : colors.surfaceInverse;
  // Категории берём из стора, а не из моков: созданные в этой сессии должны
  // сразу быть доступны для трат.
  const options = isIncome
    ? MOCK_INCOME_SOURCES
    : categories.map((category) => ({ name: category.name, icon: category.icon }));

  const parsedAmount = parseMoney(amount);
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
    const input = {
      type,
      amount: parsedAmount,
      label: selected.name,
      icon: selected.icon,
      note,
      date,
    };

    if (editing) {
      updateTransaction(editing.id, input);
    } else {
      addTransaction(input);
    }
    close();
  };

  /**
   * Первый тап только взводит подтверждение, второй удаляет. Нативный Alert
   * здесь был бы резче, чем всё остальное в приложении.
   */
  const remove = () => {
    if (!editing) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    deleteTransaction(editing.id);
    closeFlow();
  };

  return (
    <BottomSheet
      title={editing ? "Edit transaction" : "New transaction"}
      onClose={() => close()}
    >
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
        <NumericKeypad onKey={(key) => setAmount((current) => appendMoneyKey(current, key))} />
      )}

      <Button
        label="Save"
        variant={isIncome ? "positive" : "primary"}
        disabled={!canSave}
        onPress={save}
        style={{ marginTop: 10 }}
      />

      {/* Удаление — тихая ссылка без подложки: действие редкое и не должно
          спорить с Save. Красный в проекте занят перерасходом бюджета. */}
      {editing ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={deleteArmed ? "Tap again to delete" : "Delete transaction"}
          onPress={remove}
          style={{ alignItems: "center", marginTop: 14, padding: 6 }}
        >
          <Text
            style={[
              typography.rowTitle,
              { color: deleteArmed ? colors.textConfirm : colors.textSecondary },
            ]}
          >
            {deleteArmed ? "Tap again to delete" : "Delete transaction"}
          </Text>
        </Pressable>
      ) : null}
    </BottomSheet>
  );
}
