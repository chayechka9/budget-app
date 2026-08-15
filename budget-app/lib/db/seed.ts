/**
 * Стартовое наполнение базы при первом запуске.
 *
 * Ровно то, что обещает роадмап: новый пользователь получает готовый базовый
 * набор категорий и источников дохода — и ничего больше. Ни транзакций, ни
 * баланса, ни истории: цифры на экранах должны появляться только из того, что
 * пользователь ввёл сам.
 *
 * Планов на месяц у стартовых категорий тоже нет — планирование бюджета в
 * этой модели необязательное, и категория спокойно живёт без лимита.
 */

import type { IconName } from "../../components/Icon";
import type { CategoryKind } from "../types.ts";
import { insertCategory, insertGroup } from "./repositories/categories.ts";
import { insertIncomeSource } from "./repositories/income-sources.ts";
import { ensureProfile } from "./repositories/profile.ts";
import { getMeta, setMeta } from "./repositories/meta.ts";
import type { Db } from "./types.ts";

/** Флаг в app_meta: стартовый набор создаётся один раз и навсегда. */
const SEED_KEY = "starter_data_seeded";

const STARTER_GROUPS: {
  name: string;
  categories: { name: string; kind: CategoryKind; icon: IconName }[];
}[] = [
  {
    name: "Essentials",
    categories: [
      { name: "Rent", kind: "fixed", icon: "rent" },
      { name: "Groceries", kind: "fixed", icon: "groceries" },
      { name: "Utilities", kind: "fixed", icon: "utilities" },
      { name: "Transport", kind: "fixed", icon: "transport" },
    ],
  },
  {
    name: "Lifestyle",
    categories: [
      { name: "Eating out", kind: "fixed", icon: "eatingOut" },
      { name: "Subscriptions", kind: "fixed", icon: "subscriptions" },
    ],
  },
  {
    name: "Savings",
    categories: [{ name: "Emergency fund", kind: "savings", icon: "emergency" }],
  },
];

const STARTER_INCOME_SOURCES: { name: string; icon: IconName }[] = [
  { name: "Salary", icon: "income" },
  { name: "Freelance", icon: "laptop" },
  { name: "Refund", icon: "wallet" },
  { name: "Gift", icon: "wallet" },
  { name: "Other", icon: "wallet" },
];

/**
 * Создаёт профиль и стартовый набор, если этого ещё не делали.
 *
 * Проверка идёт по флагу, а не по «в базе пусто»: пользователь имеет право
 * удалить все категории до одной, и его пустой бюджет не должен на следующем
 * запуске снова зарасти нашими.
 */
export async function seedStarterData(db: Db): Promise<void> {
  await ensureProfile(db);

  if (await getMeta(db, SEED_KEY)) return;

  await db.withTransactionAsync(async () => {
    for (const [groupIndex, group] of STARTER_GROUPS.entries()) {
      const created = await insertGroup(db, { name: group.name, sortOrder: groupIndex });

      for (const [categoryIndex, category] of group.categories.entries()) {
        await insertCategory(db, {
          groupId: created.id,
          name: category.name,
          kind: category.kind,
          icon: category.icon,
          sortOrder: groupIndex * 100 + categoryIndex,
        });
      }
    }

    for (const [index, source] of STARTER_INCOME_SOURCES.entries()) {
      await insertIncomeSource(db, { ...source, sortOrder: index });
    }

    await setMeta(db, SEED_KEY, "1");
  });
}
