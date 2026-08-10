/**
 * Стабильные идентификаторы для новых записей.
 *
 * Checkpoint 1 (product-roadmap-and-checkpoints.md) требует стабильные ID:
 * значение не должно зависеть от порядкового номера записи, суммы или даты,
 * иначе оно меняется вместе с данными и не переживёт перенос в SQLite/Supabase.
 *
 * Использует crypto.randomUUID(), если доступен в рантайме (Hermes/Expo);
 * иначе — совместимый по формату fallback на Math.random.
 */

function fallbackUuid(): string {
  const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return template.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function generateId(prefix?: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackUuid();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
