-- MenuMate AI SQLite Schema

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  cover_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  currency TEXT DEFAULT 'PKR',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menus (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  theme TEXT DEFAULT 'classic', -- 'classic' | 'modern'
  source_language TEXT DEFAULT 'en',
  supported_languages TEXT DEFAULT '["en", "ur"]',
  is_published INTEGER DEFAULT 0,
  published_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  menu_id TEXT NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dishes (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL CHECK(price >= 0),
  image_url TEXT,
  dietary_tags TEXT DEFAULT '[]', -- JSON string e.g. ["vegetarian", "spicy", "halal"]
  is_available INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS translations (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL CHECK(entity_type IN ('menu', 'category', 'dish')),
  entity_id TEXT NOT NULL,
  language_code TEXT NOT NULL,
  field_name TEXT NOT NULL,
  translation TEXT NOT NULL,
  status TEXT DEFAULT 'approved', -- 'pending_review' | 'approved' | 'rejected'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id, language_code, field_name)
);

CREATE INDEX IF NOT EXISTS idx_menus_restaurant_id ON menus(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menus_slug ON menus(slug);
CREATE INDEX IF NOT EXISTS idx_categories_menu_id ON categories(menu_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category_id ON dishes(category_id);
CREATE INDEX IF NOT EXISTS idx_translations_lookup ON translations(entity_type, entity_id, language_code);
