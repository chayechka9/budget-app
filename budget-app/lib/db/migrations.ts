/**
 * Версионированная схема локальной базы.
 *
 * Версия хранится в `PRAGMA user_version` — так рекомендует документация
 * expo-sqlite для SDK 57. Новая правка схемы добавляется отдельным элементом
 * в конец `MIGRATIONS`; уже выпущенные версии не редактируются, иначе база
 * установленного приложения останется со старой схемой и без шанса догнать.
 *
 * Общие правила схемы:
 * - у каждой записи стабильный UUID из `lib/id.ts`, а не автоинкремент:
 *   идентификатор должен пережить перенос в Supabase;
 * - у каждой записи `created_at` / `updated_at` в ISO;
 * - ничего не удаляется физически — только `deleted_at`. Это и Undo после
 *   удаления транзакции, и будущий признак удаления для синхронизации, чтобы
 *   запись не воскресала на другом устройстве.
 */

import type { Db } from "./types.ts";

export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      // Профиль — одна строка. Валюта и день старта бюджетного месяца живут
      // здесь, а не в коде: роадмап разрешает пользователю выбрать любой день.
      `CREATE TABLE profile (
        id TEXT PRIMARY KEY NOT NULL,
        currency TEXT NOT NULL DEFAULT 'EUR',
        month_start_day INTEGER NOT NULL DEFAULT 1,
        onboarded_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      `CREATE TABLE category_groups (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Ни плана, ни потраченного здесь нет: план — это budget_allocations
      // за конкретный месяц, потраченное считается из транзакций, цель
      // накопления — savings_goals. Одно число в двух местах разъехалось бы.
      `CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        group_id TEXT NOT NULL REFERENCES category_groups(id),
        name TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('fixed', 'savings')),
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX categories_group_idx ON categories(group_id)`,

      `CREATE TABLE income_sources (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        archived_at TEXT,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // `amount` со знаком: минус — трата, плюс — приход. Так же, как читают
      // сумму все экраны и вся агрегация, поэтому знак не переизобретаем.
      // `type` отделяет стартовый баланс от дохода: деньги он приносит, но
      // доходом не считается и в Insights как доход не показывается.
      `CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'starting_balance')),
        amount REAL NOT NULL,
        category_id TEXT REFERENCES categories(id),
        income_source_id TEXT REFERENCES income_sources(id),
        payee TEXT NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        deleted_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX transactions_date_idx ON transactions(date)`,
      `CREATE INDEX transactions_category_idx ON transactions(category_id)`,
      `CREATE INDEX transactions_deleted_idx ON transactions(deleted_at)`,

      // Бюджетный месяц. `starts_on` хранится явно, а не выводится из ключа:
      // день старта можно поменять, и уже прожитые месяцы обязаны остаться
      // с той границей, по которой их считали.
      `CREATE TABLE budget_months (
        id TEXT PRIMARY KEY NOT NULL,
        month_key TEXT NOT NULL UNIQUE,
        starts_on TEXT NOT NULL,
        closed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Сколько денег разложено на категорию в конкретном месяце. Перенос
      // остатка (rollover) здесь не хранится — он считается из этой же таблицы
      // и транзакций, иначе кеш рано или поздно разойдётся с фактом.
      `CREATE TABLE budget_allocations (
        id TEXT PRIMARY KEY NOT NULL,
        month_key TEXT NOT NULL REFERENCES budget_months(month_key),
        category_id TEXT NOT NULL REFERENCES categories(id),
        assigned REAL NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (month_key, category_id)
      )`,
      `CREATE INDEX budget_allocations_month_idx ON budget_allocations(month_key)`,

      // Цель накопления: сумма, сумма с датой или бессрочное накопление.
      // `cadence` — в чём считать взнос, «€X в неделю» или «€X в месяц».
      `CREATE TABLE savings_goals (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL UNIQUE REFERENCES categories(id),
        kind TEXT NOT NULL CHECK (kind IN ('target', 'target_date', 'open')),
        target_amount REAL,
        target_date TEXT,
        cadence TEXT CHECK (cadence IN ('weekly', 'monthly')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,

      // Мелкие технические флаги вроде «стартовые категории уже созданы».
      `CREATE TABLE app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
    ],
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS.reduce(
  (latest, migration) => Math.max(latest, migration.version),
  0,
);

export async function schemaVersion(db: Db): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  return row?.user_version ?? 0;
}

/**
 * Догоняет схему до последней версии и возвращает её номер.
 *
 * Каждая версия применяется целиком в своей транзакции вместе с записью
 * нового `user_version`: если один из запросов упадёт, база останется на
 * прежней версии, а не в полусобранном состоянии.
 */
export async function migrate(db: Db): Promise<number> {
  const current = await schemaVersion(db);

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;

    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      // Значение — из собственной константы, а не из пользовательского ввода;
      // параметры в PRAGMA SQLite всё равно не принимает.
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }

  return schemaVersion(db);
}
