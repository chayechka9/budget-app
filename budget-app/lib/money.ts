/**
 * Деньги: форматирование для показа и разбор пользовательского ввода.
 *
 * Единственное место, где живут правила «как выглядит сумма» и «что вообще
 * можно набрать в денежном поле». Экраны обязаны звать эти функции, а не
 * чистить строку у себя — иначе поля начинают вести себя по-разному.
 */

/** Максимальная сумма, которую пользователь может ввести в денежное поле. */
export const MAX_MONEY_AMOUNT = 1_000_000_000;

const MONEY_FALLBACK = "—";

/** Число безопасно для сохранения как пользовательская денежная сумма. */
export function isMoneyAmountWithinLimit(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= MAX_MONEY_AMOUNT;
}

/**
 * Единый пользовательский формат суммы: целые без `.00`, значения с
 * центами — ровно с двумя знаками. Внутреннее число при этом не меняется.
 */
export function formatMoney(amount: unknown): string {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return MONEY_FALLBACK;

  const roundedAbsolute = Math.round((Math.abs(amount) + Number.EPSILON) * 100) / 100;
  const hasCents = !Number.isInteger(roundedAbsolute);
  const formatted = roundedAbsolute.toLocaleString("en-IE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  });

  return `${amount < 0 && roundedAbsolute !== 0 ? "−" : ""}€${formatted}`;
}

/** Сумма с явным плюсом для положительного ненулевого значения. */
export function formatSignedMoney(amount: unknown): string {
  const formatted = formatMoney(amount);
  if (formatted === MONEY_FALLBACK) return formatted;
  return typeof amount === "number" && amount > 0 && formatted !== "€0"
    ? `+${formatted}`
    : formatted;
}

/** Строку ввода — в число. Нечисловое значение считаем нулём. */
export function parseMoney(input: string | undefined): number {
  const value = Number.parseFloat((input ?? "").replace(",", "."));
  return Number.isFinite(value) ? value : 0;
}

/**
 * Очищает промежуточный ввод денежного поля и не даёт превысить лимит.
 *
 * Оставляет только цифры и одну точку максимум с двумя знаками после неё.
 * Строку возвращает «как набрали» (в том числе `12.` посреди ввода) — иначе
 * нельзя было бы поставить точку. Если результат вышел за лимит, оставляем
 * предыдущее значение: поле просто перестаёт принимать лишние цифры.
 */
export function sanitizeMoneyInput(next: string, previous = ""): string {
  // Запятая на decimal-клавиатуре — такой же разделитель, как точка.
  const cleaned = next.replace(",", ".").replace(/[^0-9.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  const limited =
    rest.length > 0 ? `${whole}.${rest.join("").slice(0, 2)}` : whole;

  if (limited === "" || limited === ".") return limited;
  return isMoneyAmountWithinLimit(Number(limited)) ? limited : previous;
}

/**
 * Нажатие клавиши встроенной клавиатуры применительно к строке суммы.
 * `key` — цифра, точка или `backspace`.
 */
export function appendMoneyKey(amount: string, key: string): string {
  if (key === "backspace") return amount.slice(0, -1);

  if (key === ".") {
    if (amount.includes(".")) return amount;
    return amount === "" ? "0." : `${amount}.`;
  }

  // Ведущий ноль заменяем первой значащей цифрой.
  const next = amount === "0" ? key : amount + key;
  return sanitizeMoneyInput(next, amount);
}
