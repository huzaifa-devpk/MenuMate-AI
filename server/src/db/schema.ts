/**
 * SQLite schema. Kept as plain SQL so it is easy to read and audit.
 * Timestamps are ISO-8601 strings in UTC. IDs are random, URL-safe strings.
 */
export const SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS restaurants (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description     TEXT,
  logo_url        TEXT,
  cover_image_url TEXT,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  website         TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menus (
  id               TEXT PRIMARY KEY,
  restaurant_id    TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug             TEXT NOT NULL UNIQUE,
  currency         TEXT NOT NULL CHECK (currency IN ('PKR','USD','GBP','EUR')),
  default_language TEXT NOT NULL,
  theme            TEXT NOT NULL DEFAULT 'classic' CHECK (theme IN ('classic','modern')),
  is_published     INTEGER NOT NULL DEFAULT 0 CHECK (is_published IN (0,1)),
  published_at     TEXT,
  is_demo          INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0,1)),
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_menus_restaurant ON menus(restaurant_id);

CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  menu_id    TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(trim(name)) > 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_categories_menu ON categories(menu_id, sort_order);

CREATE TABLE IF NOT EXISTS dishes (
  id           TEXT PRIMARY KEY,
  category_id  TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description  TEXT,
  -- Prices are numeric and live only here. Translations never touch this column.
  price        REAL NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  labels       TEXT NOT NULL DEFAULT '[]',
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0,1)),
  sort_order   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category_id, sort_order);

-- Translated text for categories and dishes, one row per (entity, language, field).
-- Rows are deleted by application code when the parent entity is deleted.
CREATE TABLE IF NOT EXISTS translations (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('category','dish')),
  entity_id   TEXT NOT NULL,
  language    TEXT NOT NULL,
  field       TEXT NOT NULL CHECK (field IN ('name','description')),
  text        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('ai_draft','approved')),
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (entity_type, entity_id, language, field)
);
CREATE INDEX IF NOT EXISTS idx_translations_entity ON translations(entity_type, entity_id);
`;
