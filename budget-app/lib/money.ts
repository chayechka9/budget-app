/** Максимальная сумма, которую пользователь может ввести в денежное поле. */
export const MAX_MONEY_AMOUNT = 1_000_000_000;

/** Число безопасно для сохранения как пользовательская денежная сумма. */
export function isMoneyAmountWithinLimit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_MONEY_AMOUNT;
}

/**
 * Оставляет промежуточный ввод как есть, пока его числовое значение не
 * превышает общий лимит. Запятая на decimal-клавиатуре равнозначна точке.
 */
export function limitMoneyInput(next: string, previous: string): string {
  const normalized = next.trim().replace(",", ".");
  if (normalized === "" || normalized === ".") return next;

  const value = Number(normalized);
  return isMoneyAmountWithinLimit(value) ? next : previous;
}
