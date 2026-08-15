/**
 * Группы и категории.
 *
 * Категория никогда не удаляется — только архивируется. Роадмап требует
 * именно этого: архивная категория исчезает из новых операций, но старые
 * транзакции продолжают на неё ссылаться, и её можно восстановить.
 */

import type { IconName } from "../../../components/Icon";
import { generateId } from "../../id.ts";
import type { Category, CategoryGroup, CategoryKind } from "../../types.ts";
import type { Db } from "../types.ts";
import { createdStamps, nowIso, nullable } from "./shared.ts";

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
  archived_at: string | null;
}

interface CategoryRow extends GroupRow {
  group_id: string;
  kind: CategoryKind;
  icon: IconName;
}

function toGroup(row: GroupRow): CategoryGroup {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

function toCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    kind: row.kind,
    icon: row.icon,
    sortOrder: row.sort_order,
    archivedAt: row.archived_at,
  };
}

export async function listGroups(db: Db): Promise<CategoryGroup[]> {
  const rows = await db.getAllAsync<GroupRow>(
    `SELECT id, name, sort_order, archived_at FROM category_groups
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name`,
  );
  return rows.map(toGroup);
}

export async function listCategories(db: Db): Promise<Category[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    `SELECT id, group_id, name, kind, icon, sort_order, archived_at FROM categories
     WHERE deleted_at IS NULL
     ORDER BY sort_order, name`,
  );
  return rows.map(toCategory);
}

/** Следующий порядковый номер, чтобы новая запись встала в конец списка. */
async function nextSortOrder(db: Db, table: "category_groups" | "categories"): Promise<number> {
  const row = await db.getFirstAsync<{ next: number | null }>(
    `SELECT MAX(sort_order) + 1 AS next FROM ${table}`,
  );
  return row?.next ?? 0;
}

export async function insertGroup(
  db: Db,
  input: { name: string; sortOrder?: number },
): Promise<CategoryGroup> {
  const group: CategoryGroup = {
    id: generateId("g"),
    name: input.name,
    sortOrder: input.sortOrder ?? (await nextSortOrder(db, "category_groups")),
    archivedAt: null,
  };
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO category_groups (id, name, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [group.id, group.name, group.sortOrder, createdAt, updatedAt],
  );

  return group;
}

export async function insertCategory(
  db: Db,
  input: {
    groupId: string;
    name: string;
    kind: CategoryKind;
    icon: IconName;
    sortOrder?: number;
  },
): Promise<Category> {
  const category: Category = {
    id: generateId("c"),
    groupId: input.groupId,
    name: input.name,
    kind: input.kind,
    icon: input.icon,
    sortOrder: input.sortOrder ?? (await nextSortOrder(db, "categories")),
    archivedAt: null,
  };
  const { createdAt, updatedAt } = createdStamps();

  await db.runAsync(
    `INSERT INTO categories (id, group_id, name, kind, icon, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.groupId,
      category.name,
      category.kind,
      category.icon,
      category.sortOrder,
      createdAt,
      updatedAt,
    ],
  );

  return category;
}

export async function updateCategory(
  db: Db,
  id: string,
  changes: { groupId: string; name: string; kind: CategoryKind; icon: IconName },
): Promise<void> {
  await db.runAsync(
    `UPDATE categories
     SET group_id = ?, name = ?, kind = ?, icon = ?, updated_at = ?
     WHERE id = ?`,
    [changes.groupId, changes.name, changes.kind, changes.icon, nowIso(), id],
  );
}

export async function renameGroup(db: Db, id: string, name: string): Promise<void> {
  await db.runAsync(`UPDATE category_groups SET name = ?, updated_at = ? WHERE id = ?`, [
    name,
    nowIso(),
    id,
  ]);
}

/**
 * Убирает категорию из новых операций, не трогая историю. Повторный вызов
 * не сдвигает дату архивации: важно, когда категорию убрали, а не когда по
 * ней последний раз кликнули.
 */
export async function archiveCategory(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE categories SET archived_at = ?, updated_at = ?
     WHERE id = ? AND archived_at IS NULL`,
    [nowIso(), nowIso(), id],
  );
}

export async function restoreCategory(db: Db, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE categories SET archived_at = NULL, updated_at = ?
     WHERE id = ? AND archived_at IS NOT NULL`,
    [nowIso(), id],
  );
}

/**
 * Находит группу по названию без учёта регистра и лишних пробелов.
 * «New group» в форме категории не должен плодить вторую «Savings».
 */
export async function findGroupByName(
  db: Db,
  name: string,
): Promise<CategoryGroup | null> {
  const row = await db.getFirstAsync<GroupRow>(
    `SELECT id, name, sort_order, archived_at FROM category_groups
     WHERE deleted_at IS NULL AND LOWER(TRIM(name)) = LOWER(TRIM(?))
     LIMIT 1`,
    [nullable(name)],
  );
  return row ? toGroup(row) : null;
}
