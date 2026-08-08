import { useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";

import { colors, radius, spacing, typography } from "../constants/theme";
import {
  MONTHS_LONG,
  MONTHS_SHORT,
  parseIsoDate,
  toIsoDate,
  todayIso,
} from "../lib/analytics";
import { Button } from "./Button";
import { CircleButton } from "./CircleButton";
import { Icon } from "./Icon";

type DateRangePickerProps = {
  /** Диапазон, с которого открывается выбор. */
  from: string;
  to: string;
  onApply: (from: string, to: string) => void;
  onClose: () => void;
};

/** Понедельник первым — так же, как считает недельные корзины `analytics`. */
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const CELL_HEIGHT = 38;

/** Высота области под сеткой дней — её же занимает выбор месяца и года. */
const GRID_HEIGHT = CELL_HEIGHT * 6;

/** На сколько лет назад можно уйти в выборе года. */
const YEARS_BACK = 5;

/** Высота строки в колонках выбора — из неё считается прокрутка к выбранному. */
const COLUMN_ROW_HEIGHT = 39;

/** Сколько строк оставить над выбранной, чтобы она не липла к верху колонки. */
const COLUMN_LEAD_ROWS = 2;

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Сколько пустых клеток до первого числа, если неделя начинается с понедельника. */
function leadingBlanks(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

function formatShort(iso: string): string {
  const date = parseIsoDate(iso);
  return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

type ColumnValue = {
  key: string;
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
};

/** Колонка выбора: месяцы слева, годы справа. Выбранное — чёрной плашкой. */
function MonthYearColumn({ values }: { values: ColumnValue[] }) {
  // Колонка открывается на выбранном значении: двенадцать месяцев в высоту
  // не помещаются, и без прокрутки текущий выбор оказывался бы за кадром.
  const scroller = useRef<ScrollView>(null);
  const selectedIndex = values.findIndex((value) => value.selected);
  const offset =
    selectedIndex < 0
      ? 0
      : Math.max(0, (selectedIndex - COLUMN_LEAD_ROWS) * COLUMN_ROW_HEIGHT);

  return (
    <ScrollView
      ref={scroller}
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      // Не `contentOffset`: на момент монтирования содержимое ещё не
      // измерено, и iOS обрезает смещение до нулевой высоты. Здесь же
      // размер уже известен. Выбор значения размер не меняет, так что
      // ручную прокрутку это не перебивает.
      onContentSizeChange={() => scroller.current?.scrollTo({ y: offset, animated: false })}
      contentContainerStyle={{ gap: 2 }}
    >
      {values.map((value) => (
        <Pressable
          key={value.key}
          accessibilityRole="button"
          accessibilityState={{ selected: value.selected, disabled: value.disabled }}
          disabled={value.disabled}
          onPress={value.onPress}
          style={{
            paddingVertical: 9,
            paddingHorizontal: spacing.md,
            borderRadius: radius.tile,
            backgroundColor: value.selected ? colors.surfaceInverse : "transparent",
          }}
        >
          <Text
            style={[
              typography.rowTitle,
              {
                color: value.selected
                  ? colors.textInverse
                  : value.disabled
                    ? colors.textFaint
                    : colors.text,
              },
            ]}
          >
            {value.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

/**
 * Выбор произвольного диапазона дат — календарь-сетка в оформлении
 * приложения, без системного пикера: тот выглядит как чужой элемент и умеет
 * выбирать только одну дату за раз.
 *
 * Первый тап ставит начало, второй — конец (если он раньше начала, границы
 * меняются местами). Третий тап начинает выбор заново, поэтому исправить
 * промах можно не закрывая окно.
 *
 * Показывается монтированием, а не флагом `visible`: незакоммиченный выбор
 * живёт в стейте компонента, и размонтирование — самый надёжный способ не
 * показать его же при следующем открытии.
 */
export function DateRangePicker({ from, to, onApply, onClose }: DateRangePickerProps) {
  const today = todayIso();

  const [start, setStart] = useState<string | null>(from);
  const [end, setEnd] = useState<string | null>(to);
  const [cursor, setCursor] = useState(() => {
    const date = parseIsoDate(to || today);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  /** Открыт выбор месяца и года вместо сетки дней. */
  const [pickingMonth, setPickingMonth] = useState(false);

  const pick = (iso: string) => {
    // Есть обе границы — начинаем новый диапазон, а не двигаем старый:
    // угадывать, какую именно границу хотел поправить пользователь, значит
    // ошибаться в половине случаев.
    if (start && end) {
      setStart(iso);
      setEnd(null);
      return;
    }
    if (!start) {
      setStart(iso);
      return;
    }
    if (iso < start) {
      setEnd(start);
      setStart(iso);
    } else {
      setEnd(iso);
    }
  };

  const blanks = leadingBlanks(cursor.year, cursor.month);
  const total = daysInMonth(cursor.year, cursor.month);
  const cells: (string | null)[] = [
    ...Array.from({ length: blanks }, () => null),
    ...Array.from({ length: total }, (_, index) =>
      toIsoDate(new Date(cursor.year, cursor.month, index + 1)),
    ),
  ];

  const complete = start !== null && end !== null;

  const todayDate = parseIsoDate(today);
  const currentYear = todayDate.getFullYear();
  const currentMonth = todayDate.getMonth();
  const years = Array.from(
    { length: YEARS_BACK + 1 },
    (_, index) => currentYear - YEARS_BACK + index,
  );

  /** Месяцы вперёд выбирать нечего: трат там ещё нет. */
  const isFutureMonth = (year: number, month: number) =>
    year > currentYear || (year === currentYear && month > currentMonth);

  const moveCursor = (year: number, month: number) => {
    // Смена года может увести на будущий месяц — прижимаем к текущему.
    setCursor({
      year,
      month: isFutureMonth(year, month) ? currentMonth : month,
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.scrim,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 360,
            borderRadius: radius.cardLarge,
            backgroundColor: colors.surfaceSheet,
            padding: spacing.xl,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.22)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Text style={[typography.detailTitle, { color: colors.text }]}>
              Custom range
            </Text>
            <CircleButton icon="close" label="Close" glyphSize={13} onPress={onClose} />
          </View>

          {/* Месяц выбирается прямо тут, а не перелистыванием: до прошлой
              зимы стрелкой пришлось бы жать десяток раз. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose month and year"
            accessibilityState={{ expanded: pickingMonth }}
            onPress={() => setPickingMonth((current) => !current)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              marginTop: spacing.lg,
              paddingVertical: 2,
            }}
          >
            <Text style={[typography.headline, { color: colors.text }]}>
              {MONTHS_LONG[cursor.month]} {cursor.year}
            </Text>
            <Icon name="chevronDown" size={11} color={colors.textSecondary} />
          </Pressable>

          {pickingMonth ? (
            <>
              <View
                style={{
                  flexDirection: "row",
                  gap: spacing.md,
                  height: GRID_HEIGHT,
                  marginTop: spacing.md,
                }}
              >
                <MonthYearColumn
                  values={MONTHS_LONG.map((name, month) => ({
                    key: name,
                    label: name,
                    selected: month === cursor.month,
                    disabled: isFutureMonth(cursor.year, month),
                    onPress: () => moveCursor(cursor.year, month),
                  }))}
                />
                <MonthYearColumn
                  values={years.map((year) => ({
                    key: String(year),
                    label: String(year),
                    selected: year === cursor.year,
                    disabled: false,
                    onPress: () => moveCursor(year, cursor.month),
                  }))}
                />
              </View>

              <Button
                label="Done"
                onPress={() => setPickingMonth(false)}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : (
            <>
          <View style={{ flexDirection: "row", marginTop: spacing.md }}>
            {WEEKDAYS.map((day, index) => (
              <Text
                key={`${day}-${index}`}
                style={[
                  typography.tabLabel,
                  { flex: 1, textAlign: "center", color: colors.textTertiary },
                ]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
            {cells.map((iso, index) => {
              if (iso === null) {
                return (
                  <View
                    key={`blank-${index}`}
                    style={{ width: `${100 / 7}%`, height: CELL_HEIGHT }}
                  />
                );
              }

              const future = iso > today;
              const isStart = iso === start;
              const isEnd = iso === end;
              const inRange =
                start !== null && end !== null && iso > start && iso < end;
              const edge = isStart || isEnd;

              return (
                <Pressable
                  key={iso}
                  accessibilityRole="button"
                  accessibilityState={{ selected: edge || inRange, disabled: future }}
                  disabled={future}
                  onPress={() => pick(iso)}
                  style={{
                    width: `${100 / 7}%`,
                    height: CELL_HEIGHT,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.pill,
                      alignItems: "center",
                      justifyContent: "center",
                      // Диапазон подсвечен нейтральным тёплым тоном, а не
                      // зелёным: зелёный в макете значит «хорошо с деньгами»,
                      // и на выборе дат он читался бы как оценка.
                      backgroundColor: edge
                        ? colors.surfaceInverse
                        : inRange
                          ? colors.trackRing
                          : "transparent",
                    }}
                  >
                    <Text
                      style={[
                        typography.amountCaption,
                        {
                          color: edge
                            ? colors.textInverse
                            : future
                              ? colors.textFaint
                              : colors.text,
                        },
                      ]}
                    >
                      {parseIsoDate(iso).getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: spacing.md },
            ]}
          >
            {start === null
              ? "Pick the first day"
              : end === null
                ? `${formatShort(start)} — pick the last day`
                : `${formatShort(start)} – ${formatShort(end)}`}
          </Text>

          <Button
            label="Apply"
            disabled={!complete}
            onPress={() => {
              if (start !== null && end !== null) onApply(start, end);
            }}
            style={{ marginTop: spacing.lg }}
          />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
