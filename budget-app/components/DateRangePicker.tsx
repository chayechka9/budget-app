import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";

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

  const shiftMonth = (delta: number) => {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

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
  const canGoForward =
    new Date(cursor.year, cursor.month + 1, 1) <= parseIsoDate(today);

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

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: spacing.lg,
            }}
          >
            <CircleButton
              icon="chevronLeft"
              label="Previous month"
              glyphSize={15}
              onPress={() => shiftMonth(-1)}
            />
            <Text style={[typography.headline, { color: colors.text }]}>
              {MONTHS_LONG[cursor.month]} {cursor.year}
            </Text>
            {canGoForward ? (
              <CircleButton
                icon="chevronRight"
                label="Next month"
                glyphSize={15}
                onPress={() => shiftMonth(1)}
              />
            ) : (
              // Место под кнопкой держим всегда: иначе название месяца
              // прыгает вбок на текущем месяце.
              <View style={{ width: 34, height: 34 }} />
            )}
          </View>

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
                      backgroundColor: edge
                        ? colors.surfaceInverse
                        : inRange
                          ? colors.positiveSurface
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
                              : inRange
                                ? colors.positiveTextStrong
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
        </View>
      </View>
    </Modal>
  );
}
