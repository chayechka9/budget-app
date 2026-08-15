/**
 * Минимальный контракт базы, от которого зависит весь слой данных.
 *
 * Репозитории и миграции пишутся против этого интерфейса, а не против
 * expo-sqlite напрямую. Причина практическая: expo-sqlite — нативный модуль,
 * в node он не запускается, и тесты не смогли бы проверить ни одну строчку
 * настоящего SQL. С интерфейсом в приложении работает expo-sqlite, а в тестах —
 * адаптер над `node:sqlite`, и проверяется тот же самый SQL, а не его макет.
 */

/** Значение, которое можно подставить в параметр запроса. */
export type SqlValue = string | number | null;

export interface Db {
  /** Несколько запросов подряд, без параметров — схема и PRAGMA. */
  execAsync(sql: string): Promise<void>;
  /** Запись: INSERT / UPDATE / DELETE. */
  runAsync(sql: string, params?: SqlValue[]): Promise<unknown>;
  getAllAsync<Row>(sql: string, params?: SqlValue[]): Promise<Row[]>;
  getFirstAsync<Row>(sql: string, params?: SqlValue[]): Promise<Row | null>;
  /** Всё внутри задачи либо применяется целиком, либо откатывается. */
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
