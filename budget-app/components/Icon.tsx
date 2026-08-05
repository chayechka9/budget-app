import type { ColorValue } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

import { colors, iconSize } from "../constants/theme";

/**
 * Единственный набор иконок в приложении.
 *
 * Пути скопированы один в один из код-экспорта «Calm Budget» (helper `icon()`
 * и разметка таб-бара). Общий язык: viewBox 24×24, fill none, скруглённые
 * концы, толщина 1.8 у контентных иконок и 1.9–2.2 у иконок таб-бара.
 *
 * Новые иконки добавлять сюда и рисовать в той же манере, а не подключать
 * сторонние наборы — иначе стиль поедет.
 */

/** Толщина обводки контентных иконок — как в референсе. */
const STROKE = 1.8;

export type IconName =
  // Таб-бар
  | "home"
  | "budget"
  | "add"
  | "progress"
  | "settings"
  // Интерфейс
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "close"
  | "calendar"
  | "calendarCheck"
  | "backspace"
  // Категории и транзакции
  | "rent"
  | "groceries"
  | "utilities"
  | "transport"
  | "eatingOut"
  | "subscriptions"
  | "emergency"
  | "trip"
  | "laptop"
  | "income"
  | "wallet";

type IconProps = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = iconSize.md, color = colors.text }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {renderGlyph(name, color as string)}
    </Svg>
  );
}

function renderGlyph(name: IconName, stroke: string) {
  const c = {
    stroke,
    fill: "none" as const,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    // ── Таб-бар ──
    case "home":
      return (
        <>
          <Path d="M4 11.4 12 4.8l8 6.6" {...c} strokeWidth={1.9} />
          <Path d="M6.3 9.9V19h11.4V9.9" {...c} strokeWidth={1.9} />
        </>
      );
    case "budget":
      return (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={2.2} {...c} strokeWidth={1.9} />
          <Rect x={13} y={4} width={7} height={7} rx={2.2} {...c} strokeWidth={1.9} />
          <Rect x={4} y={13} width={7} height={7} rx={2.2} {...c} strokeWidth={1.9} />
          <Rect x={13} y={13} width={7} height={7} rx={2.2} {...c} strokeWidth={1.9} />
        </>
      );
    case "progress":
      return <Path d="M5.5 19.5V13M12 19.5V4.5M18.5 19.5V9" {...c} strokeWidth={2.2} />;
    case "settings":
      return (
        <>
          <Path d="M4 7.5h16M4 16.5h16" {...c} strokeWidth={1.9} />
          <Circle
            cx={15}
            cy={7.5}
            r={2.6}
            fill={colors.background}
            stroke={stroke}
            strokeWidth={1.9}
          />
          <Circle
            cx={9}
            cy={16.5}
            r={2.6}
            fill={colors.background}
            stroke={stroke}
            strokeWidth={1.9}
          />
        </>
      );
    case "add":
      return <Path d="M12 5v14M5 12h14" {...c} strokeWidth={2.2} />;

    // ── Интерфейс ──
    case "chevronRight":
      return <Path d="M9 5l7 7-7 7" {...c} strokeWidth={2} />;
    case "chevronLeft":
      return <Path d="M15 5l-7 7 7 7" {...c} strokeWidth={2.4} />;
    case "chevronDown":
      return <Path d="M6 9l6 6 6-6" {...c} strokeWidth={2} />;
    case "close":
      return <Path d="M6 6l12 12M18 6L6 18" {...c} strokeWidth={STROKE} />;
    case "calendar":
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...c} strokeWidth={STROKE} />
          <Path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4" {...c} strokeWidth={STROKE} />
        </>
      );
    case "calendarCheck":
      return (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...c} strokeWidth={STROKE} />
          <Path d="M3.5 9.5h17M8 2.8v3.4M16 2.8v3.4" {...c} strokeWidth={STROKE} />
          <Path d="M9 14.6l2.1 2.1 4-4.4" {...c} strokeWidth={STROKE} />
        </>
      );
    case "backspace":
      return (
        <>
          <Path
            d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z"
            {...c}
            strokeWidth={STROKE}
          />
          <Path d="M11.5 9.5l5 5M16.5 9.5l-5 5" {...c} strokeWidth={STROKE} />
        </>
      );

    // ── Категории и транзакции ──
    case "rent":
      return (
        <>
          <Path d="M4 11.4 12 4.8l8 6.6" {...c} strokeWidth={STROKE} />
          <Path d="M6.3 9.9V19h11.4V9.9" {...c} strokeWidth={STROKE} />
        </>
      );
    case "groceries":
      return (
        <>
          <Path d="M4.6 9.5h14.8L17.9 19H6.1L4.6 9.5Z" {...c} strokeWidth={STROKE} />
          <Path d="M9 9.5l3-4.8 3 4.8" {...c} strokeWidth={STROKE} />
        </>
      );
    case "transport":
      return (
        <>
          <Rect x={4.5} y={4.8} width={15} height={11.7} rx={2.6} {...c} strokeWidth={STROKE} />
          <Path d="M4.5 11.5h15" {...c} strokeWidth={STROKE} />
          <Circle cx={8.6} cy={19.6} r={1.1} fill={stroke} />
          <Circle cx={15.4} cy={19.6} r={1.1} fill={stroke} />
        </>
      );
    case "eatingOut":
      return (
        <>
          <Path
            d="M5.5 8h11v5.4a4.6 4.6 0 0 1-4.6 4.6h-1.8A4.6 4.6 0 0 1 5.5 13.4V8Z"
            {...c}
            strokeWidth={STROKE}
          />
          <Path d="M16.5 9.6h.9a2.7 2.7 0 0 1 0 5.4h-.9" {...c} strokeWidth={STROKE} />
        </>
      );
    case "subscriptions":
      return (
        <>
          <Rect x={3.6} y={6.8} width={16.8} height={10.4} rx={2.6} {...c} strokeWidth={STROKE} />
          <Path d="M14.6 6.8v10.4" {...c} strokeWidth={STROKE} strokeDasharray="2.2 3" />
        </>
      );
    case "emergency":
      return (
        <Path
          d="M12 3.6 19 6.2v5.3c0 4.9-3 7.9-7 9.1-4-1.2-7-4.2-7-9.1V6.2L12 3.6Z"
          {...c}
          strokeWidth={STROKE}
        />
      );
    case "trip":
      return (
        <>
          <Path d="M20.4 3.8 3.8 10.7l6.2 2.3 2.3 6.2 8.1-15.4Z" {...c} strokeWidth={STROKE} />
          <Path d="M10 13 20.4 3.8" {...c} strokeWidth={STROKE} />
        </>
      );
    case "income":
      return (
        <>
          <Rect x={3.5} y={5.5} width={17} height={13} rx={2.5} {...c} strokeWidth={STROKE} />
          <Path d="M3.5 10h17" {...c} strokeWidth={STROKE} />
        </>
      );

    // Своих глифов в референсе нет — нарисованы в той же манере.
    case "utilities":
      return (
        <Path d="M13.2 3.5 5.8 13.4h5l-.9 7.1 7.4-9.9h-5l.9-7.1Z" {...c} strokeWidth={STROKE} />
      );
    case "laptop":
      return (
        <>
          <Rect x={4.4} y={5.4} width={15.2} height={10.2} rx={2.2} {...c} strokeWidth={STROKE} />
          <Path d="M2.8 19h18.4" {...c} strokeWidth={STROKE} />
        </>
      );
    case "wallet":
      return (
        <>
          <Rect x={3.5} y={6} width={17} height={12.5} rx={3} {...c} strokeWidth={STROKE} />
          <Path d="M16 12.2h1.6" {...c} strokeWidth={STROKE} />
        </>
      );
  }
}
