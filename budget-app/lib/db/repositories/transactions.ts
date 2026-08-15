/**
 * Транзакции.
 *
 * Удаление всегда мягкое: `deleted_at` — это и Undo сразу после удаления, и
 * признак удаления для будущей синхронизации. Физически из базы ничего не
 * пропадает без явного действия пользователя.
 */

import type { IconName } from "../../../components/Icon";
import { generateId } from "../../id.ts";
import type { Transaction, TransactionType } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso, nullable } from "./shared.ts";

/** Что известно о записи из формы. `amount` всегда положительный. */
export interface TransactionInput {
  type: TransactionType;
  amount: number;
  categoryId: string | null;
  incomeSourceId: string | null;
  note: string;
  date: string;
}

interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  category_id: string | null;
  income_source_id: string | null;
  note: string;
  date: string;
  created_at: string;
  updated_at: string;
  category_name: string | null;
  category_icon: IconName | null;
  source_name: string | null;
  source_icon: IconName | null;
}

const STARTING_BALANCE_LABEL = "Starting balance";
const INCOME_LABEL = "Income";

/** Трата уменьшает баланс, приход увеличивает. */
function signed(type: TransactionType, amount: number): number {
  return type === "expense" ? -Math.abs(amount) : Math.abs(amount);
}

/**
 * Подпись строки в списке. У расхода это заметка, а если её нет — название
 * категории; у дохода — источник; у стартового баланса — он сам.
 */
function payeeOf(row: TransactionRow): string {
  const note = row.note.trim();
  if (row.type === "income") return row.source_name ?? INCOME_LABEL;
  if (row.type === "starting_balance") return note || STARTING_BALANCE_LABEL;
  return note || row.category_name || "Uncategorised";
}

function categoryLabelOf(row: TransactionRow): string {
  if (row.type === "income") return INCOME_LABEL;
  if (row.type === "starting_balance") return STARTING_BALANCE_LABEL;
  return row.category_name ?? "Uncategorised";
}

function iconOf(row: TransactionRow): IconName {
  if (row.type === "income") return row.source_icon ?? "income";
  if (row.type === "starting_balance") return "wallet";
  return row.category_icon ?? "wallet";
}

function toTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    categoryId: row.category_id,
    incomeSourceId: row.income_source_id,
    payee: payeeOf(row),
    category: categoryLabelOf(row),
    icon: iconOf(row),
    note: row.note,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const SELECT_TRANSACTIONS = `
  SELECT
    t.id, t.type, t.amount, t.category_id, t.income_source_id, t.note, t.date,
    t.created_at, t.updated_at,
    c.name AS category_name, c.icon AS category_icon,
    s.name AS source_name, s.icon AS source_icon
  FROM transactions t
  LEFT JOIN categories c ON c.id = t.category_id
  LEFT JOIN income_sources s ON s.id = t.income_source_id
`;

/**
 * Все живые транзакции, свежие сверху. Внутри одного дня новее считается та,
 * что записана позже: за день их может быть несколько, и порядок ввода —
 * единственное, чем они различаются.
 *
 * Третий ключ сортировки — `rowid`, порядок вставки. Две записи, добавленные
 * в одну миллисекунду, получают одинаковый `created_at`, и без него их
 * взаимный порядок был бы произвольным: список на Home перетасовывался бы
 * между запусками. Ключ чисто локальный, на синхронизацию он не влияет.
 */
export async function listTransactions(db: Db): Promise<Transaction[]> {
  const rows = await db.getAllAsync<TransactionRow>(
    `${SELECT_TRANSACTIONS}
     WHERE t.deleted_at IS NULL
     ORDER BY t.date DESC, t.created_at DESC, t.rowid DESC`,
  );
  return rows.map(toTransaction);
}

export async function findTransaction(db: Db, id: string): Promise<Transaction | null> {
  const row = await db.getFirstAsync<TransactionRow>(
    `${SELECT_TRANSACTIONS} WHERE t.id = ?`,
    [id],
  );
  return row ? toTransaction(row) : null;
}

export async function insertTransaction(
  db: Db,
  input: TransactionInput,
): Promise<string> {
  const id = generateId("t");
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO transactions
       (id, type, amount, category_id, income_source_id, note, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.type,
      signed(input.type, input.amount),
      nullable(input.categoryId),
      nullable(input.incomeSourceId),
      input.note,
      input.date,
      createdAt,
      updatedAt,
    ],
  );

  return id;
}

export async function updateTransaction(
  db: Db,
  id: string,
  input: TransactionInput,
): Promise<void> {
  await db.runAsync(
    `UPDATE transactions
     SET type = ?, amount = ?, category_id = ?, income_source_id = ?, note = ?, date = ?,
         updated_at = ?
     WHERE id = ?`,
    [
      input.type,
      signed(input.type, input.amount),
      nullable(input.categoryId),
      nullable(input.incomeSourceId),
      input.note,
      input.date,
      nowIso(),
      id,
    ],
  );
}

/** Убирает запись из всех списков, оставляя её в базе для Undo. */
export async function softDeleteTransaction(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL`,
    [nowIso(), nowIso(), id],
  );
}

export async function restoreTransaction(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ? AND deleted_at IS NOT NULL`,
    [nowIso(), id],
  );
}
