/**
 * Что онбординг оставляет после себя в базе.
 *
 * Правила вынесены из стора отдельно и без React: то, какие данные уходят в
 * аналитику, а какие остаются деньгами пользователя, — это как раз то, что
 * стоит проверять тестами, а не глазами на экране.
 */

import { ONBOARDING_GOAL_EVENT, type EventProps } from "./db/repositories/analytics-events.ts";
import { isMoneyAmountWithinLimit } from "./money.ts";
import type { OnboardingGoal } from "./types.ts";

/** Что пользователь оставил после себя в онбординге. */
export interface OnboardingResult {
  /** Выбранная цель или `null`, если шаг пропустили. */
  goal: OnboardingGoal | null;
  /** Свой вариант к `other`; у остальных целей его нет. */
  goalText: string | null;
  /** Стартовый баланс или `null` — «Start from zero instead» и Skip. */
  startingBalance: number | null;
}

export interface OnboardingWrites {
  /** Продуктовое событие или `null`, если отвечать было нечем. */
  event: { name: string; props: EventProps } | null;
  /** Сумма для транзакции `starting_balance` или `null`, если её не будет. */
  startingBalance: number | null;
}

/**
 * Переводит ответы онбординга в записи.
 *
 * В событие попадает только выбор и, у «Other», написанный пользователем
 * текст цели — так требует роадмап. Сумма стартового баланса в аналитику не
 * идёт ни в каком виде: это финансовые данные.
 */
export function onboardingWrites(result: OnboardingResult): OnboardingWrites {
  return {
    event: buildEvent(result),
    startingBalance: buildStartingBalance(result.startingBalance),
  };
}

function buildEvent(result: OnboardingResult): OnboardingWrites["event"] {
  if (!result.goal) return null;

  const props: EventProps = { goal: result.goal };
  const text = result.goalText?.trim() ?? "";
  // Пустой «Other» — тоже ответ: человек выбрал вариант, но писать не стал.
  // Пустую строку в событие не кладём, чтобы не притворяться, что текст есть.
  if (result.goal === "other" && text) props.text = text;

  return { name: ONBOARDING_GOAL_EVENT, props };
}

function buildStartingBalance(amount: number | null): number | null {
  if (amount === null) return null;
  // Ноль записью не является: пустая история честнее строки на €0. Слишком
  // большая сумма — тот же лимит, что и у остальных денежных полей.
  if (!(amount > 0) || !isMoneyAmountWithinLimit(amount)) return null;
  return amount;
}
