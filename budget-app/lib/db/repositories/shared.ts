/** Мелочи, общие для всех репозиториев. */

import { nowIso } from "../../dates.ts";

/** Метки времени для новой записи — обе одинаковые. */
export function createdStamps(): { createdAt: string; updatedAt: string } {
  const timestamp = nowIso();
  return { createdAt: timestamp, updatedAt: timestamp };
}

export { nowIso };

/**
 * SQLite не знает булевых значений, а `undefined` в параметрах драйверы
 * трактуют по-разному. Приводим отсутствие значения к явному NULL.
 */
export function nullable(value: string | number | null | undefined): string | number | null {
  return value ?? null;
}
