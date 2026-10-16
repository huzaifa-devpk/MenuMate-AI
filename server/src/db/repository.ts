import type {
  Category,
  CategoryInput,
  CurrencyCode,
  DietaryLabel,
  Dish,
  DishInput,
  LanguageCode,
  Menu,
  MenuInput,
  MenuSummary,
  MenuUpdate,
  Restaurant,
  RestaurantInput,
  TranslatableField,
} from "@shared";
import { LANGUAGES, dietaryLabelSchema } from "@shared";
import { z } from "zod";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors";
import { newId, nowIso, slugify } from "../lib/ids";
import type { Db } from "./connection";

const SAMPLE_MENU_MESSAGE = "The sample menu is read-only. Duplicate it to make your own copy.";

interface RestaurantRow {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  website: string | null;
  created_at: string;
  updated_at: string;
}

interface MenuRow {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  currency: string;
  default_language: string;
  theme: string;
  is_published: number;
  published_at: string | null;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

interface CategoryRow {
  id: string;
  menu_id: string;
  name: string;
  sort_order: number;
}

interface DishRow {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  labels: string;
  is_available: number;
  sort_order: number;
}

interface TranslationRow {
  entity_type: "category" | "dish";
  entity_id: string;
  language: string;
  field: string;
  text: string;
}

function mapRestaurant(row: RestaurantRow): Restaurant {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseLabels(raw: string): DietaryLabel[] {
  try {
    const parsed = z.array(dietaryLabelSchema).safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

function roundPrice(price: number): number {
  return Math.round(price * 100) / 100;
}

function uniqueSlug(db: Db, name: string): string {
  const base = slugify(name);
  let candidate = base;
  for (let i = 2; i < 100; i++) {
    const taken = db.prepare("SELECT 1 AS ok FROM menus WHERE slug = ?").get(candidate);
    if (!taken) return candidate;
    const suffix = `-${i}`;
    candidate = `${base.slice(0, 60 - suffix.length)}${suffix}`;
  }
  return `${base.slice(0, 50)}-${newId(8)}`;
}

function touchMenu(db: Db, menuId: string) {
  db.prepare("UPDATE menus SET updated_at = ? WHERE id = ?").run(nowIso(), menuId);
}

export function getPrimaryRestaurant(db: Db): Restaurant | null {
  const row = db.prepare("SELECT * FROM restaurants ORDER BY created_at ASC LIMIT 1").get() as RestaurantRow | undefined;
  return row ? mapRestaurant(row) : null;
}

export function savePrimaryRestaurant(db: Db, input: RestaurantInput): Restaurant {
  const existing = db.prepare("SELECT * FROM restaurants ORDER BY created_at ASC LIMIT 1").get() as RestaurantRow | undefined;
  const now = nowIso();
  if (!existing) {
    const id = newId();
    db.prepare(
      `INSERT INTO restaurants
        (id, name, description, logo_url, cover_image_url, phone, email, address, website, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(id, input.name, input.description, input.logoUrl, input.coverImageUrl, input.phone, input.email, input.address, input.website, now, now);
    return getPrimaryRestaurant(db)!;
  }
  db.prepare(
    `UPDATE restaurants
        SET name = ?, description = ?, logo_url = ?, cover_image_url = ?, phone = ?, email = ?, address = ?, website = ?, updated_at = ?
      WHERE id = ?`,
  ).run(
    input.name,
    input.description,
    input.logoUrl,
    input.coverImageUrl,
    input.phone,
    input.email,
    input.address,
    input.website,
    now,
    existing.id,
  );
  return getPrimaryRestaurant(db)!;
}

function hydrateMenu(db: Db, row: MenuRow): Menu {
  const restaurantRow = db.prepare("SELECT * FROM restaurants WHERE id = ?").get(row.restaurant_id) as RestaurantRow | undefined;
  if (!restaurantRow) throw notFound("Restaurant");

  const categories = db.prepare("SELECT * FROM categories WHERE menu_id = ? ORDER BY sort_order ASC, name ASC").all(row.id) as CategoryRow[];
  const categoryIds = categories.map((c) => c.id);
  const dishes = categoryIds.length
    ? (db
        .prepare(`SELECT * FROM dishes WHERE category_id IN (${categoryIds.map(() => "?").join(",")}) ORDER BY sort_order ASC, name ASC`)
        .all(...categoryIds) as DishRow[])
    : [];

  const entityIds = [...categoryIds, ...dishes.map((d) => d.id)];
  const translations = entityIds.length
    ? (db
        .prepare(
          `SELECT entity_type, entity_id, language, field, text FROM translations
            WHERE status = 'approved' AND entity_id IN (${entityIds.map(() => "?").join(",")})`,
        )
        .all(...entityIds) as TranslationRow[])
    : [];

  const transByKey = new Map<string, Record<string, Partial<Record<TranslatableField, string>>>>();
  const languages = new Set<string>([row.default_language]);
  for (const t of translations) {
    if (t.field !== "name" && t.field !== "description") continue;
    const key = `${t.entity_type}:${t.entity_id}`;
    const bucket = transByKey.get(key) ?? {};
    const langBucket = bucket[t.language] ?? {};
    langBucket[t.field] = t.text;
    bucket[t.language] = langBucket;
    transByKey.set(key, bucket);
    languages.add(t.language);
  }

  const dishesByCategory = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const mapped: Dish = {
      id: dish.id,
      categoryId: dish.category_id,
      name: dish.name,
      description: dish.description,
      price: dish.price,
      imageUrl: dish.image_url,
      labels: parseLabels(dish.labels),
      isAvailable: dish.is_available === 1,
      sortOrder: dish.sort_order,
      translations: transByKey.get(`dish:${dish.id}`) ?? {},
    };
    const list = dishesByCategory.get(dish.category_id) ?? [];
    list.push(mapped);
    dishesByCategory.set(dish.category_id, list);
  }

  const mappedCategories: Category[] = categories.map((category) => ({
    id: category.id,
    menuId: category.menu_id,
    name: category.name,
    sortOrder: category.sort_order,
    translations: transByKey.get(`category:${category.id}`) ?? {},
    dishes: dishesByCategory.get(category.id) ?? [],
  }));

  const availableLanguages = [
    row.default_language,
    ...LANGUAGES.map((l) => l.code).filter((code) => code !== row.default_language && languages.has(code)),
  ];

  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    name: row.name,
    slug: row.slug,
    currency: row.currency as CurrencyCode,
    defaultLanguage: row.default_language as LanguageCode,
    theme: row.theme === "modern" ? "modern" : "classic",
    isPublished: row.is_published === 1,
    publishedAt: row.published_at,
    isDemo: row.is_demo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    availableLanguages,
    categories: mappedCategories,
    restaurant: mapRestaurant(restaurantRow),
  };
}

function menuRow(db: Db, id: string): MenuRow | undefined {
  return db.prepare("SELECT * FROM menus WHERE id = ?").get(id) as MenuRow | undefined;
}

export function getMenuById(db: Db, id: string): Menu | null {
  const row = menuRow(db, id);
  return row ? hydrateMenu(db, row) : null;
}

export function getMenuBySlug(db: Db, slug: string): Menu | null {
  const row = db.prepare("SELECT * FROM menus WHERE slug = ?").get(slug) as MenuRow | undefined;
  return row ? hydrateMenu(db, row) : null;
}

export function requireMenu(db: Db, id: string): Menu {
  const menu = getMenuById(db, id);
  if (!menu) throw notFound("Menu");
  return menu;
}

export function assertMenuWritable(menu: Menu) {
  if (menu.isDemo) throw forbidden(SAMPLE_MENU_MESSAGE);
}

export function listMenus(db: Db): MenuSummary[] {
  const rows = db
    .prepare(
      `SELECT m.id, m.name, m.slug, m.currency, m.default_language, m.theme, m.is_published, m.is_demo, m.updated_at,
              (SELECT COUNT(*) FROM categories c WHERE c.menu_id = m.id) AS category_count,
              (SELECT COUNT(*) FROM dishes d
                 JOIN categories c ON c.id = d.category_id
                WHERE c.menu_id = m.id) AS dish_count
         FROM menus m
        ORDER BY m.updated_at DESC`,
    )
    .all() as Array<{
    id: string;
    name: string;
    slug: string;
    currency: string;
    default_language: string;
    theme: string;
    is_published: number;
    is_demo: number;
    updated_at: string;
    category_count: number;
    dish_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    currency: row.currency,
    defaultLanguage: row.default_language,
    theme: row.theme,
    isPublished: row.is_published === 1,
    isDemo: row.is_demo === 1,
    categoryCount: row.category_count,
    dishCount: row.dish_count,
    updatedAt: row.updated_at,
  }));
}

export function createMenu(db: Db, restaurantId: string, input: MenuInput): Menu {
  const id = newId();
  const now = nowIso();
  const slug = uniqueSlug(db, input.name);
  db.prepare(
    `INSERT INTO menus
      (id, restaurant_id, name, slug, currency, default_language, theme, is_published, published_at, is_demo, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, 0, ?, ?)`,
  ).run(id, restaurantId, input.name, slug, input.currency, input.defaultLanguage, input.theme, now, now);
  return requireMenu(db, id);
}

export function updateMenu(db: Db, id: string, patch: MenuUpdate): Menu {
  const current = requireMenu(db, id);
  assertMenuWritable(current);
  const slug = patch.slug ?? current.slug;
  if (slug !== current.slug) {
    const taken = db.prepare("SELECT id FROM menus WHERE slug = ? AND id != ?").get(slug, id) as { id: string } | undefined;
    if (taken) throw conflict("That public link is already used by another menu.");
  }
  db.prepare(
    `UPDATE menus
        SET name = ?, slug = ?, currency = ?, default_language = ?, theme = ?, updated_at = ?
      WHERE id = ?`,
  ).run(
    patch.name ?? current.name,
    slug,
    patch.currency ?? current.currency,
    patch.defaultLanguage ?? current.defaultLanguage,
    patch.theme ?? current.theme,
    nowIso(),
    id,
  );
  return requireMenu(db, id);
}

export function deleteMenu(db: Db, id: string) {
  const current = requireMenu(db, id);
  assertMenuWritable(current);
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM translations
        WHERE entity_type = 'dish' AND entity_id IN (
          SELECT d.id FROM dishes d JOIN categories c ON c.id = d.category_id WHERE c.menu_id = ?
        )`,
    ).run(id);
    db.prepare(
      `DELETE FROM translations
        WHERE entity_type = 'category' AND entity_id IN (SELECT id FROM categories WHERE menu_id = ?)`,
    ).run(id);
    db.prepare("DELETE FROM menus WHERE id = ?").run(id);
  });
  tx();
}

function requireCategory(db: Db, menuId: string, categoryId: string): CategoryRow {
  const row = db.prepare("SELECT * FROM categories WHERE id = ? AND menu_id = ?").get(categoryId, menuId) as CategoryRow | undefined;
  if (!row) throw notFound("Category");
  return row;
}

export function addCategory(db: Db, menuId: string, input: CategoryInput): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  const sort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM categories WHERE menu_id = ?").get(menuId) as { m: number };
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO categories (id, menu_id, name, sort_order) VALUES (?, ?, ?, ?)").run(newId(), menuId, input.name, sort.m + 1);
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function updateCategory(db: Db, menuId: string, categoryId: string, input: CategoryInput): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  requireCategory(db, menuId, categoryId);
  const tx = db.transaction(() => {
    db.prepare("UPDATE categories SET name = ? WHERE id = ? AND menu_id = ?").run(input.name, categoryId, menuId);
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function deleteCategory(db: Db, menuId: string, categoryId: string): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  requireCategory(db, menuId, categoryId);
  const tx = db.transaction(() => {
    db.prepare(
      `DELETE FROM translations WHERE entity_type = 'dish' AND entity_id IN (SELECT id FROM dishes WHERE category_id = ?)`,
    ).run(categoryId);
    db.prepare("DELETE FROM translations WHERE entity_type = 'category' AND entity_id = ?").run(categoryId);
    db.prepare("DELETE FROM categories WHERE id = ? AND menu_id = ?").run(categoryId, menuId);
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function reorderCategories(db: Db, menuId: string, orderedIds: string[]): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  const existing = (db.prepare("SELECT id FROM categories WHERE menu_id = ?").all(menuId) as { id: string }[]).map((r) => r.id).sort();
  const incoming = [...orderedIds].sort();
  if (existing.length !== incoming.length || existing.some((id, i) => id !== incoming[i]) || new Set(orderedIds).size !== orderedIds.length) {
    throw badRequest("Reorder must include every category of this menu exactly once.");
  }
  const update = db.prepare("UPDATE categories SET sort_order = ? WHERE id = ? AND menu_id = ?");
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id, menuId));
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

function requireDish(db: Db, menuId: string, dishId: string): DishRow {
  const row = db
    .prepare(
      `SELECT d.* FROM dishes d
         JOIN categories c ON c.id = d.category_id
        WHERE d.id = ? AND c.menu_id = ?`,
    )
    .get(dishId, menuId) as DishRow | undefined;
  if (!row) throw notFound("Dish");
  return row;
}

export function addDish(db: Db, menuId: string, categoryId: string, input: DishInput): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  requireCategory(db, menuId, categoryId);
  const sort = db.prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM dishes WHERE category_id = ?").get(categoryId) as { m: number };
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO dishes (id, category_id, name, description, price, image_url, labels, is_available, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      newId(),
      categoryId,
      input.name,
      input.description,
      roundPrice(input.price),
      input.imageUrl,
      JSON.stringify(input.labels),
      input.isAvailable ? 1 : 0,
      sort.m + 1,
    );
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function updateDish(db: Db, menuId: string, dishId: string, input: DishInput): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  const current = requireDish(db, menuId, dishId);
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE dishes
          SET name = ?, description = ?, price = ?, image_url = ?, labels = ?, is_available = ?
        WHERE id = ?`,
    ).run(
      input.name,
      input.description,
      roundPrice(input.price),
      input.imageUrl,
      JSON.stringify(input.labels),
      input.isAvailable ? 1 : 0,
      current.id,
    );
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function deleteDish(db: Db, menuId: string, dishId: string): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  requireDish(db, menuId, dishId);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM translations WHERE entity_type = 'dish' AND entity_id = ?").run(dishId);
    db.prepare("DELETE FROM dishes WHERE id = ?").run(dishId);
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}

export function reorderDishes(db: Db, menuId: string, categoryId: string, orderedIds: string[]): Menu {
  const menu = requireMenu(db, menuId);
  assertMenuWritable(menu);
  requireCategory(db, menuId, categoryId);
  const existing = (db.prepare("SELECT id FROM dishes WHERE category_id = ?").all(categoryId) as { id: string }[]).map((r) => r.id);
  const existingSorted = [...existing].sort();
  const incoming = [...orderedIds].sort();
  if (
    existingSorted.length !== incoming.length ||
    existingSorted.some((id, i) => id !== incoming[i]) ||
    new Set(orderedIds).size !== orderedIds.length
  ) {
    throw badRequest("Reorder must include every dish in this category exactly once.");
  }
  const update = db.prepare("UPDATE dishes SET sort_order = ? WHERE id = ? AND category_id = ?");
  const tx = db.transaction(() => {
    orderedIds.forEach((id, index) => update.run(index, id, categoryId));
    touchMenu(db, menuId);
  });
  tx();
  return requireMenu(db, menuId);
}
