import { Platform, type TextStyle, type ViewStyle } from "react-native";

/**
 * Единственный источник истины по оформлению.
 *
 * Значения сняты один в один с код-экспорта «Calm Budget» из Claude Design
 * (проект 596bc56c-e208-4b76-b45c-354ddb873ae5, файл `Calm Budget.dc.html`).
 * Компоненты и экраны обязаны брать цвета/шрифты/отступы отсюда и не
 * хардкодить их у себя — иначе дизайн размазывается по коду и мешает
 * менять логику.
 *
 * Про oklch: макет задан в oklch, но React Native на нативе такие строки
 * не парсит (в отличие от веба). Поэтому в коде лежат точные sRGB-эквиваленты,
 * а исходный oklch указан рядом в комментарии — он и есть источник истины.
 */

export const colors = {
  // ── Тёплые кремовые подложки ──
  /** Фон экрана. */
  background: "#F6F6F3",
  /** Тот же фон, но полупрозрачный — панель таб-бара. */
  backgroundTranslucent: "rgba(246, 246, 243, 0.88)",
  /** Фон модальных экранов — в макете на полтона светлее обычного. */
  backgroundModal: "#FAFAF7",
  /** Карточки и списки — в макете это чистый белый. */
  surface: "#FFFFFF",
  /** Наведение/нажатие на строку списка. */
  surfacePressed: "#FAFAF7",
  /** Плашки под иконками, нейтральные чипсы. */
  surfaceTile: "#F1F1ED",
  /** Модальные шиты. */
  surfaceSheet: "#FBFBF9",
  /** Поля ввода внутри шита. */
  surfaceField: "#F0F0EC",
  /** Мелкие круглые кнопки «закрыть». */
  surfaceControl: "#EFEFEB",
  /** Подложка спокойной заметки о перерасходе. */
  surfaceNote: "#F6F6F2",
  /** Трек прогресс-бара. */
  track: "#EEEEEA",
  /** Трек кольца прогресса — чуть темнее полосы. */
  trackRing: "#ECECE8",
  /** Границы. */
  border: "#E2E2DD",
  /** Разделители строк внутри карточки (0.5px). */
  separator: "rgba(0, 0, 0, 0.05)",
  /** Обводка поля ввода в покое — поле видно как поле, но не тянет взгляд. */
  fieldBorder: "rgba(0, 0, 0, 0.08)",
  /** Она же, когда в поле уже есть значение: чуть плотнее, поле «занято». */
  fieldBorderFilled: "rgba(0, 0, 0, 0.14)",
  /** Тёмные элементы: кнопка [+], заливка прогресса, primary-кнопка. */
  surfaceInverse: "#141414",
  /** Затемнение под модальным шитом. */
  scrim: "rgba(0, 0, 0, 0.28)",
  /** Полоска-индикатор для свайпа сверху шита. */
  handle: "rgba(0, 0, 0, 0.12)",
  /** Подсветка нажатой клавиши цифровой клавиатуры. */
  pressedOverlay: "rgba(0, 0, 0, 0.06)",

  // ── Текст ──
  /** Обычный текст и заголовки. */
  text: "#111111",
  /** Вторичный текст, подписи. */
  textSecondary: "rgba(0, 0, 0, 0.45)",
  /** Третичный: подзаголовки строк, оверлайны групп. */
  textTertiary: "rgba(0, 0, 0, 0.38)",
  /** Неактивные вкладки таб-бара. */
  textMuted: "rgba(0, 0, 0, 0.35)",
  /** Шевроны и совсем тихие подписи. */
  textFaint: "rgba(0, 0, 0, 0.25)",
  /**
   * Ещё не введённая крупная сумма — поле стартового баланса в онбординге.
   * Значение из `Onboarding.dc.html`; чуть плотнее `textFaint`, потому что
   * 50px цифра placeholder’ом иначе почти не видна.
   */
  textPlaceholderLarge: "rgba(0, 0, 0, 0.28)",
  /**
   * Тихая текстовая ссылка, которая уже ждёт подтверждения: «Tap again to
   * delete». Темнее обычной подписи, но всё ещё не сигнальный цвет —
   * предупреждение здесь делается контрастом, а не красным.
   */
  textConfirm: "rgba(0, 0, 0, 0.75)",
  /** Иконки внутри круглых кнопок. */
  icon: "rgba(0, 0, 0, 0.6)",
  /** Иконки категорий в плашках строк — в макете чуть контрастнее. */
  iconStrong: "rgba(0, 0, 0, 0.72)",
  /** Текст на тёмном. */
  textInverse: "#FFFFFF",
  /** Он же второго плана: подпись рядом с действием внутри тёмной плашки. */
  textInverseSecondary: "rgba(255, 255, 255, 0.65)",

  // ── Зелёный: акцент и позитив ──
  /** oklch(0.55 0.13 155) — основной акцент, кольца, точка в пилюле. */
  positive: "#14874E",
  /** oklch(0.5 0.12 155) — приглушённый, для текста и сумм дохода. */
  positiveText: "#0B7643",
  /** oklch(0.42 0.1 155) — тёмный, для текста на светло-зелёной подложке. */
  positiveTextStrong: "#095C34",
  /** oklch(0.5 0.11 155) — шеврон внутри зелёной пилюли. */
  positiveIcon: "#1E7546",
  /** oklch(0.95 0.03 155) — фон зелёных пилюль и плашек. */
  positiveSurface: "#E0F5E6",
  /** oklch(0.93 0.045 155) — нажатое состояние зелёной пилюли. */
  positiveSurfacePressed: "#D1F1DB",

  // ── Красный: только перерасход ──
  /**
   * oklch(0.55 0.16 25). Единственный сигнальный цвет: хвост полосы прогресса
   * на величину превышения плана и точка 6px там, где полосы нет.
   * Ни фонов, ни текста сумм этим цветом — суммы остаются нейтральными.
   */
  overspend: "#BD413F",
} as const;

/** Размер точки-индикатора перерасхода — там, где полосы прогресса нет. */
export const OVERSPEND_DOT_SIZE = 6;

/** Толщина разделителя строк внутри карточки. */
export const HAIRLINE = 0.5;

/**
 * Системный шрифт: на нативе это SF Pro (iOS) / Roboto (Android) по умолчанию,
 * поэтому fontFamily там не задаём вовсе. Стек нужен только вебу.
 */
export const fontFamily = Platform.select({
  web: '-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
  default: undefined,
});

/** Шаг отступов — кратно 4. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Скругления из макета. */
export const radius = {
  /** Плашка 34px в строке Recent. */
  tileSmall: 11,
  /** Плашка под иконкой строки (36–38px). */
  tile: 12,
  /** Поле ввода суммы в строке списка. */
  field: 13,
  /** Плашка 42px в карточке итогов месяца. */
  tileLarge: 14,
  /** Выпадающий список и спокойные заметки внутри карточки. */
  dropdown: 16,
  /** Карточка-список. */
  card: 22,
  /** Карточка с содержимым. */
  cardLarge: 24,
  /** Верх модального шита. */
  sheet: 28,
  /** Клавиша цифровой клавиатуры. */
  key: 14,
  /** Пилюли, кнопки, круглые элементы. */
  pill: 999,
} as const;

/** Тени. Все мягкие — резких в макете нет. */
export const shadows = {
  /** Карточки и списки. */
  card: {
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.04), 0 4px 14px rgba(0, 0, 0, 0.04)",
  } satisfies ViewStyle,
  /** Пилюли и мелкие круглые кнопки. */
  pill: { boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)" } satisfies ViewStyle,
  /** Кнопка [+] в таб-баре. */
  fab: { boxShadow: "0 6px 16px rgba(0, 0, 0, 0.18)" } satisfies ViewStyle,
} as const;

/** Моноширинные цифры — чтобы суммы не «прыгали» при изменении. */
const tabularNums = { fontVariant: ["tabular-nums"] } satisfies TextStyle;

/**
 * Типографика. Размеры и трекинг — из макета. 700 у крупных цифр и заголовков,
 * 600 у обычного UI-текста. Все денежные стили обязаны включать tabular-nums.
 */
export const typography = {
  /** Hero-баланс на Home: 46/700/-1.4. */
  hero: {
    fontFamily,
    fontSize: 46,
    lineHeight: 51,
    fontWeight: "700",
    letterSpacing: -1.4,
    ...tabularNums,
  },
  /** Сумма в шите добавления: 50/700/-1.5. */
  amountSheet: {
    fontFamily,
    fontSize: 50,
    lineHeight: 58,
    fontWeight: "700",
    letterSpacing: -1.5,
    ...tabularNums,
  },
  /** Крупная сумма на экране деталей: 36/700/-1. */
  amountLarge: {
    fontFamily,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -1,
    ...tabularNums,
  },
  /** Сумма второго плана в карточке: 22/700/-0.4. */
  amountMedium: {
    fontFamily,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.4,
    ...tabularNums,
  },
  /** Сумма внутри карточки: 27/700/-0.6. */
  amount: {
    fontFamily,
    fontSize: 27,
    lineHeight: 33,
    fontWeight: "700",
    letterSpacing: -0.6,
    ...tabularNums,
  },
  /** Сумма в строке списка: 14/600. */
  amountRow: {
    fontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
    ...tabularNums,
  },
  /** Числа в подписях: 12.5/600. */
  amountCaption: {
    fontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
    ...tabularNums,
  },
  /** Заголовок экрана: 30/700/-0.6. */
  screenTitle: {
    fontFamily,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    letterSpacing: -0.6,
  },
  /** Заголовок экрана деталей: 22/700/-0.4. */
  detailTitle: {
    fontFamily,
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  /** Заголовок карточки и название строки: 15/600. */
  headline: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "600",
  },
  /** Название строки списка: 14/600. */
  rowTitle: {
    fontFamily,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "600",
  },
  /** Обычный текст: 15/400. */
  body: {
    fontFamily,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "400",
  },
  /** Подпись: 13/400. */
  caption: {
    fontFamily,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "400",
  },
  /** Мелкая подпись строки Recent: 12/400. */
  captionSmall: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
  },
  /** Оверлайн группы: 12.5/600, трекинг 0.8, капс. */
  overline: {
    fontFamily,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  /** Оверлайн месяца на Home: 12/600, трекинг 1.6, капс. */
  overlineWide: {
    fontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  /** Подпись сегмент-контрола: 12.5/600. */
  segmentLabel: {
    fontFamily,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "600",
  },
  /** Подпись вкладки таб-бара: 10.5/600. */
  tabLabel: {
    fontFamily,
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },
  /** Клавиша цифровой клавиатуры: 24/500. */
  key: {
    fontFamily,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "500",
    ...tabularNums,
  },
  /** Подпись внутри тоста: 13/600. */
  toast: {
    fontFamily,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "600",
  },
  /** Текст кнопки: 16/600. */
  button: {
    fontFamily,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "600",
  },
} satisfies Record<string, TextStyle>;

/** Размеры иконок из макета. */
export const iconSize = {
  /** Шеврон в строке. */
  xs: 14,
  /** Иконка в плашке строки. */
  sm: 18,
  /** Иконка вкладки таб-бара. */
  md: 23,
  /** Плюс в кнопке [+]. */
  lg: 22,
  /** Шеврон в карточке (8×14 в макете). */
  chevron: 15,
} as const;

/**
 * Геометрия таб-бара из макета: padding 10px сверху, 30px снизу, кнопка [+]
 * 54px, итого 94px высоты. Иконка 23px, подпись 10.5px, зазор 3px.
 */
export const tabBar = {
  height: 94,
  paddingTop: 10,
  paddingBottom: 30,
  paddingHorizontal: 16,
  /** Ширина колонки вкладки. */
  itemWidth: 60,
  /** Зазор между иконкой и подписью. */
  labelGap: 3,
  /** Диаметр центральной кнопки. */
  addButtonSize: 54,
} as const;

/** Высота полос прогресса. */
export const progressHeight = {
  /** Строка категории. */
  row: 4,
  /** Карточка. */
  card: 6,
} as const;

/** Тон элемента — задаёт акцентный цвет. */
export type Tone = "neutral" | "positive";

export function toneColor(tone: Tone = "neutral"): string {
  return tone === "positive" ? colors.positive : colors.text;
}

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  iconSize,
  progressHeight,
  fontFamily,
} as const;
