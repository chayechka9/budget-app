/**
 * Адаптер `node:sqlite` под интерфейс `Db` из lib/db/types.ts.
 *
 * Нужен, чтобы тесты гоняли настоящий SQL: expo-sqlite — нативный модуль и в
 * node не запускается, а проверять схему и запросы по макету бессмысленно —
 * макет согласится с любой опечаткой в SQL.
 */

import { DatabaseSync } from "node:sqlite";

export function createTestDb() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params = []) {
      return db.prepare(sql).run(...params);
    },
    async getAllAsync(sql, params = []) {
      // node:sqlite отдаёт строки с null-прототипом; expo-sqlite — обычные
      // объекты. Уравниваем, чтобы тест проверял репозиторий, а не разницу
      // между двумя драйверами.
      return db.prepare(sql).all(...params).map((row) => ({ ...row }));
    },
    async getFirstAsync(sql, params = []) {
      const [row] = db.prepare(sql).all(...params);
      return row ? { ...row } : null;
    },
    async withTransactionAsync(task) {
      db.exec("BEGIN");
      try {
        await task();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    },
    close() {
      db.close();
    },
  };
}
