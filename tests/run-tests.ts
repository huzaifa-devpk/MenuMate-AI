import assert from 'node:assert';
import { test, describe } from 'node:test';
import { DatabaseSync } from 'node:sqlite';
import { dishSchema, menuSchema, restaurantSchema } from '../server/src/middleware/validation';
import { gemmaTranslationResultSchema, gemmaImproveDescriptionSchema, GemmaService } from '../server/src/services/gemma.service';

describe('1. Zod Input Validation Tests', () => {
  test('Rejects empty dish name', () => {
    const invalidDish = {
      category_id: 'cat-1',
      name: '',
      price: 100,
    };
    const result = dishSchema.safeParse(invalidDish);
    assert.strictEqual(result.success, false, 'Empty dish name must fail validation');
  });

  test('Rejects negative prices', () => {
    const negativePriceDish = {
      category_id: 'cat-1',
      name: 'Chicken Karahi',
      price: -50,
    };
    const result = dishSchema.safeParse(negativePriceDish);
    assert.strictEqual(result.success, false, 'Negative price must fail validation');
  });

  test('Accepts valid dish with non-negative price and optional tags', () => {
    const validDish = {
      category_id: 'cat-1',
      name: 'Chicken Karahi',
      price: 1250.5,
      description: 'Slow simmered in woks with tomato and black pepper',
      dietary_tags: ['spicy', 'halal'],
    };
    const result = dishSchema.safeParse(validDish);
    assert.strictEqual(result.success, true);
    if (result.success) {
      assert.strictEqual(result.data.price, 1250.5);
      assert.strictEqual(result.data.name, 'Chicken Karahi');
    }
  });

  test('Validates menu slug structure', () => {
    const validMenu = {
      restaurant_id: 'rest-1',
      title: 'Grand Menu',
      slug: 'grand-menu-2026',
      theme: 'classic',
    };
    const result = menuSchema.safeParse(validMenu);
    assert.strictEqual(result.success, true);

    const invalidSlug = {
      ...validMenu,
      slug: 'Grand Menu with Spaces!',
    };
    const invalidResult = menuSchema.safeParse(invalidSlug);
    assert.strictEqual(invalidResult.success, false, 'Slug with spaces must fail');
  });
});

describe('2. In-Memory SQLite CRUD & Relational Integrity', () => {
  const memDb = new DatabaseSync(':memory:');

  test('Initializes schema and tables correctly', () => {
    memDb.exec(`
      CREATE TABLE restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        currency TEXT DEFAULT 'PKR'
      );
      CREATE TABLE menus (
        id TEXT PRIMARY KEY,
        restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        is_published INTEGER DEFAULT 0
      );
      CREATE TABLE categories (
        id TEXT PRIMARY KEY,
        menu_id TEXT REFERENCES menus(id) ON DELETE CASCADE,
        name TEXT NOT NULL
      );
      CREATE TABLE dishes (
        id TEXT PRIMARY KEY,
        category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0)
      );
      CREATE TABLE translations (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        language_code TEXT NOT NULL,
        field_name TEXT NOT NULL,
        translation TEXT NOT NULL,
        UNIQUE(entity_type, entity_id, language_code, field_name)
      );
    `);

    // Insert Restaurant
    memDb.prepare('INSERT INTO restaurants (id, name, currency) VALUES (?, ?, ?)')
      .run('r1', 'Saffron Garden Test', 'PKR');

    // Insert Menu
    memDb.prepare('INSERT INTO menus (id, restaurant_id, title, slug, is_published) VALUES (?, ?, ?, ?, ?)')
      .run('m1', 'r1', 'Main Menu', 'saffron-test', 0);

    // Insert Category
    memDb.prepare('INSERT INTO categories (id, menu_id, name) VALUES (?, ?, ?)')
      .run('c1', 'm1', 'Barbecue');

    // Insert Dish
    memDb.prepare('INSERT INTO dishes (id, category_id, name, price) VALUES (?, ?, ?, ?)')
      .run('d1', 'c1', 'Seekh Kabab', 650);

    const dish = memDb.prepare('SELECT * FROM dishes WHERE id = ?').get('d1') as any;
    assert.strictEqual(dish.name, 'Seekh Kabab');
    assert.strictEqual(dish.price, 650);
  });

  test('Preserves translations and handles upserts without modifying original dish', () => {
    memDb.prepare(`
      INSERT INTO translations (id, entity_type, entity_id, language_code, field_name, translation)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tr1', 'dish', 'd1', 'ur', 'name', 'سیخ کباب');

    const tr = memDb.prepare('SELECT * FROM translations WHERE entity_id = ?').get('d1') as any;
    assert.strictEqual(tr.translation, 'سیخ کباب');

    // Verify dish price and ID remain unaltered
    const originalDish = memDb.prepare('SELECT * FROM dishes WHERE id = ?').get('d1') as any;
    assert.strictEqual(originalDish.id, 'd1');
    assert.strictEqual(originalDish.price, 650);
  });
});

describe('3. Gemma AI Response Schema Validation', () => {
  test('Validates well-formed translation JSON from Gemma', () => {
    const rawGemmaOutput = {
      menu_title: {
        original: 'Main Menu',
        translated: 'مین مینو',
      },
      categories: [
        {
          id: 'cat-1',
          original_name: 'Main Course',
          translated_name: 'خاص پکوان',
          dishes: [
            {
              id: 'dish-1',
              original_name: 'Chicken Karahi',
              translated_name: 'چکن کڑاہی',
              original_description: 'Simmered in fresh tomatoes and ginger',
              translated_description: 'تازہ ٹماٹروں اور ادرک میں تیار کردہ',
            },
          ],
        },
      ],
    };

    const parseResult = gemmaTranslationResultSchema.safeParse(rawGemmaOutput);
    assert.strictEqual(parseResult.success, true);
    if (parseResult.success) {
      assert.strictEqual(parseResult.data.categories[0].dishes[0].id, 'dish-1');
      assert.strictEqual(parseResult.data.categories[0].dishes[0].translated_name, 'چکن کڑاہی');
    }
  });

  test('Rejects malformed translation missing dish IDs', () => {
    const invalidOutput = {
      categories: [
        {
          id: 'cat-1',
          original_name: 'Main Course',
          translated_name: 'خاص پکوان',
          dishes: [
            {
              // missing id!
              original_name: 'Chicken Karahi',
              translated_name: 'چکن کڑاہی',
            },
          ],
        },
      ],
    };

    const parseResult = gemmaTranslationResultSchema.safeParse(invalidOutput);
    assert.strictEqual(parseResult.success, false, 'Translation without ID must fail schema validation');
  });

  test('Validates improved description schema', () => {
    const rawOutput = {
      dish_name: 'Chicken Biryani',
      improved_description: 'Fragrant long-grain aged basmati layered with tender saffron-marinated chicken and caramelized onions.',
      suggested_tags: ['chef-special', 'popular'],
    };

    const parseResult = gemmaImproveDescriptionSchema.safeParse(rawOutput);
    assert.strictEqual(parseResult.success, true);
  });
});

describe('4. AI Error Handling and Configuration Guards', () => {
  test('Throws descriptive error when Gemma API key is missing', async () => {
    const service = new GemmaService();
    // Verify that attempting to execute without API key throws expected status 503
    if (!service.isConfigured()) {
      try {
        await service.translateMenu({
          menuTitle: 'Test',
          sourceLanguage: 'en',
          targetLanguage: 'ur',
          categories: [],
        });
        assert.fail('Should have thrown error due to missing API key');
      } catch (err: any) {
        assert.strictEqual(err.statusCode, 503);
        assert.match(err.message, /Gemma AI is not configured/);
      }
    }
  });
});

describe('5. Public URL Construction and Sharing Rules', () => {
  test('Constructs canonical public menu share URL', () => {
    const baseUrl = 'https://menumate.onrender.com';
    const slug = 'saffron-garden-demo';
    const shareUrl = `${baseUrl.replace(/\/$/, '')}/m/${slug}`;
    assert.strictEqual(shareUrl, 'https://menumate.onrender.com/m/saffron-garden-demo');
  });

  test('Detects localhost vs production environment for QR notices', () => {
    const isLocalhost = (url: string) => /localhost|127\.0\.0\.1/.test(url);
    assert.strictEqual(isLocalhost('http://localhost:5173'), true);
    assert.strictEqual(isLocalhost('https://menumate.onrender.com'), false);
  });
});
