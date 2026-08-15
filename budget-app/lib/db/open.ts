/**
 * Единственное место, где приложение встречается с expo-sqlite.
 *
 * Всё остальное — миграции, репозитории, стор — работает через `Db` из
 * types.ts и про expo-sqlite не знает. Благодаря этому тот же код проверяется
 * тестами на `node:sqlite`.
 */

import * as SQLite from "expo-sqlite";

import { migrate } from "./migrations.ts";
import type { Db, SqlValue } from "./types.ts";

/**
 * Имя файла базы. Менять его нельзя: другое имя — это другая, пустая база,
 * то есть молча потерянные данные пользователя.
 */
export const DATABASE_NAME = "budget.db";

function adapt(database: SQLite.SQLiteDatabase): Db {
  return {
    execAsync: (sql) => database.execAsync(sql),
    runAsync: (sql, params = []) => database.runAsync(sql, params as SqlValue[]),
    getAllAsync: (sql, params = []) => database.getAllAsync(sql, params as SqlValue[]),
    getFirstAsync: (sql, params = []) => database.getFirstAsync(sql, params as SqlValue[]),
    withTransactionAsync: (task) => database.withTransactionAsync(task),
  };
}

let connection: Promise<Db> | null = null;

async function connect(): Promise<Db> {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME);
  // WAL — рекомендованный режим для мобильных: чтение не ждёт запись.
  // Внешние ключи в SQLite выключены по умолчанию и включаются на соединение,
  // а без них история могла бы ссылаться на исчезнувшую категорию.
  await database.execAsync("PRAGMA journal_mode = WAL");
  await database.execAsync("PRAGMA foreign_keys = ON");

  const db = adapt(database);
  await migrate(db);
  return db;
}

/**
 * Соединение с уже накатанной схемой. Промис кешируется: параллельные вызовы
 * при старте приложения не должны открывать базу дважды и гонять миграции
 * друг поверх друга.
 */
export function getDb(): Promise<Db> {
  connection ??= connect().catch((error) => {
    // Иначе неудачная попытка навсегда осталась бы в кеше, и приложение не
    // смогло бы переоткрыть базу до перезапуска.
    connection = null;
    throw error;
  });
  return connection;
}
