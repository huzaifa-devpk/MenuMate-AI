import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import {
  validateBody,
  menuSchema,
  menuUpdateSchema,
  categorySchema,
  dishSchema,
  dishUpdateSchema,
  saveTranslationsSchema,
} from '../middleware/validation';
import {
  Menu,
  MenuWithFullDetails,
  Category,
  Dish,
  Restaurant,
  CategoryWithDishes,
  DishWithTranslations,
} from '../types';

const router = Router();

// Helper to generate a URL-safe slug
function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return `${base || 'menu'}-${randomSuffix}`;
}

// GET /api/menus - List all menus
router.get('/', (req: Request, res: Response) => {
  try {
    const menus = db.prepare(`
      SELECT m.*,
        (SELECT COUNT(*) FROM categories c WHERE c.menu_id = m.id) as category_count,
        (SELECT COUNT(*) FROM dishes d JOIN categories c ON d.category_id = c.id WHERE c.menu_id = m.id) as dish_count
      FROM menus m
      ORDER BY m.created_at DESC
    `).all() as any[];

    const formatted = menus.map((m) => ({
      ...m,
      supported_languages: JSON.parse(m.supported_languages || '["en", "ur"]'),
      category_count: Number(m.category_count || 0),
      dish_count: Number(m.dish_count || 0),
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch menus', message: err.message });
  }
});

// POST /api/menus - Create a new menu
router.post('/', validateBody(menuSchema), (req: Request, res: Response) => {
  try {
    const data = req.body;
    const id = `menu-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    let slug = data.slug || generateSlug(data.title);

    // Ensure unique slug
    let existingSlug = db.prepare('SELECT id FROM menus WHERE slug = ?').get(slug);
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 5)}`;
    }

    const stmt = db.prepare(`
      INSERT INTO menus (id, restaurant_id, title, description, slug, theme, source_language, supported_languages, is_published, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.restaurant_id,
      data.title,
      data.description || null,
      slug,
      data.theme || 'classic',
      data.source_language || 'en',
      JSON.stringify(data.supported_languages || ['en', 'ur']),
      data.is_published ? 1 : 0,
      data.is_published ? new Date().toISOString() : null
    );

    const created = db.prepare('SELECT * FROM menus WHERE id = ?').get(id) as unknown as Menu;
    res.status(201).json({
      ...created,
      supported_languages: JSON.parse(created.supported_languages),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to create menu', message: err.message });
  }
});

// GET /api/menus/:id - Get menu with full details (categories, dishes, translations)
router.get('/:id', (req: Request, res: Response) => {
  try {
    const menuId = req.params.id;
    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId) as unknown as Menu | undefined;

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(menu.restaurant_id) as unknown as Restaurant;

    // Fetch translations for this menu
    const menuTranslations = db.prepare('SELECT * FROM translations WHERE entity_type = "menu" AND entity_id = ?').all(menuId) as any[];
    const parsedMenuTranslations: Record<string, { title?: string; description?: string }> = {};
    for (const tr of menuTranslations) {
      if (!parsedMenuTranslations[tr.language_code]) {
        parsedMenuTranslations[tr.language_code] = {};
      }
      (parsedMenuTranslations[tr.language_code] as any)[tr.field_name] = tr.translation;
    }

    // Fetch categories
    const categories = db.prepare('SELECT * FROM categories WHERE menu_id = ? ORDER BY display_order ASC, created_at ASC').all(menuId) as unknown as Category[];

    const categoriesWithDishes: CategoryWithDishes[] = [];

    for (const cat of categories) {
      // Category translations
      const catTranslations = db.prepare('SELECT * FROM translations WHERE entity_type = "category" AND entity_id = ?').all(cat.id) as any[];
      const parsedCatTr: Record<string, { name?: string; description?: string }> = {};
      for (const tr of catTranslations) {
        if (!parsedCatTr[tr.language_code]) parsedCatTr[tr.language_code] = {};
        (parsedCatTr[tr.language_code] as any)[tr.field_name] = tr.translation;
      }

      // Dishes
      const dishes = db.prepare('SELECT * FROM dishes WHERE category_id = ? ORDER BY display_order ASC, created_at ASC').all(cat.id) as unknown as Dish[];

      const dishesWithTranslations: DishWithTranslations[] = [];

      for (const d of dishes) {
        const dishTr = db.prepare('SELECT * FROM translations WHERE entity_type = "dish" AND entity_id = ?').all(d.id) as any[];
        const parsedDishTr: Record<string, { name?: string; description?: string }> = {};
        for (const tr of dishTr) {
          if (!parsedDishTr[tr.language_code]) parsedDishTr[tr.language_code] = {};
          (parsedDishTr[tr.language_code] as any)[tr.field_name] = tr.translation;
        }

        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(d.dietary_tags || '[]');
        } catch {}

        dishesWithTranslations.push({
          ...d,
          parsed_dietary_tags: parsedTags,
          translations: parsedDishTr,
        });
      }

      categoriesWithDishes.push({
        ...cat,
        translations: parsedCatTr,
        dishes: dishesWithTranslations,
      });
    }

    let parsedSupportedLanguages: string[] = ['en', 'ur'];
    try {
      parsedSupportedLanguages = JSON.parse(menu.supported_languages || '["en", "ur"]');
    } catch {}

    const fullMenu: MenuWithFullDetails = {
      ...menu,
      parsed_supported_languages: parsedSupportedLanguages,
      restaurant: restaurant || {
        id: menu.restaurant_id,
        name: 'My Restaurant',
        currency: 'PKR',
        description: null,
        logo_url: null,
        cover_url: null,
        phone: null,
        email: null,
        address: null,
      },
      categories: categoriesWithDishes,
      translations: parsedMenuTranslations,
    };

    res.json(fullMenu);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch menu details', message: err.message });
  }
});

// PUT /api/menus/:id - Update menu metadata
router.put('/:id', validateBody(menuUpdateSchema), (req: Request, res: Response) => {
  try {
    const menuId = req.params.id;
    const existing = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId) as unknown as Menu | undefined;

    if (!existing) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const data = req.body;
    let slug = data.slug || existing.slug;

    if (data.slug && data.slug !== existing.slug) {
      const slugClash = db.prepare('SELECT id FROM menus WHERE slug = ? AND id != ?').get(data.slug, menuId);
      if (slugClash) {
        return res.status(400).json({ error: 'This URL slug is already taken. Please choose another.' });
      }
    }

    const title = data.title !== undefined ? data.title : existing.title;
    const description = data.description !== undefined ? data.description : existing.description;
    const theme = data.theme !== undefined ? data.theme : existing.theme;
    const source_language = data.source_language !== undefined ? data.source_language : existing.source_language;
    const supported_languages = data.supported_languages !== undefined
      ? JSON.stringify(data.supported_languages)
      : existing.supported_languages;
    const is_published = data.is_published !== undefined ? data.is_published : existing.is_published;
    const published_at = is_published && !existing.published_at ? new Date().toISOString() : existing.published_at;

    const stmt = db.prepare(`
      UPDATE menus SET
        title = ?,
        description = ?,
        slug = ?,
        theme = ?,
        source_language = ?,
        supported_languages = ?,
        is_published = ?,
        published_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title,
      description,
      slug,
      theme,
      source_language,
      supported_languages,
      is_published,
      published_at,
      menuId
    );

    const updated = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId) as unknown as Menu;
    res.json({
      ...updated,
      supported_languages: JSON.parse(updated.supported_languages),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update menu', message: err.message });
  }
});

// DELETE /api/menus/:id - Delete a menu
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const menuId = req.params.id;
    const info = db.prepare('DELETE FROM menus WHERE id = ?').run(menuId);

    if (info.changes === 0) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    res.json({ success: true, message: 'Menu deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete menu', message: err.message });
  }
});

// POST /api/menus/:id/publish - Toggle or update publication status
router.post('/:id/publish', (req: Request, res: Response) => {
  try {
    const menuId = req.params.id;
    const { publish } = req.body;
    const isPublished = publish ? 1 : 0;

    const existing = db.prepare('SELECT * FROM menus WHERE id = ?').get(menuId) as unknown as Menu | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const publishedAt = isPublished ? (existing.published_at || new Date().toISOString()) : null;

    db.prepare('UPDATE menus SET is_published = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(isPublished, publishedAt, menuId);

    res.json({
      success: true,
      is_published: isPublished,
      published_at: publishedAt,
      slug: existing.slug,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update publishing state', message: err.message });
  }
});

// --- Categories Endpoints ---

// POST /api/menus/:id/categories - Add category
router.post('/:id/categories', validateBody(categorySchema.omit({ menu_id: true })), (req: Request, res: Response) => {
  try {
    const menuId = req.params.id;
    const data = req.body;
    const categoryId = `cat-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    const maxOrderRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM categories WHERE menu_id = ?').get(menuId) as any;
    const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

    db.prepare(`
      INSERT INTO categories (id, menu_id, name, description, display_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(categoryId, menuId, data.name, data.description || null, data.display_order ?? nextOrder);

    const created = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add category', message: err.message });
  }
});

// PUT /api/menus/:id/categories/:categoryId - Update category
router.put('/:id/categories/:categoryId', (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { name, description, display_order } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId) as unknown as Category | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        display_order = COALESCE(?, display_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name !== undefined ? name : null,
      description !== undefined ? description : null,
      display_order !== undefined ? display_order : null,
      categoryId
    );

    const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(categoryId);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update category', message: err.message });
  }
});

// DELETE /api/menus/:id/categories/:categoryId - Delete category
router.delete('/:id/categories/:categoryId', (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const result = db.prepare('DELETE FROM categories WHERE id = ?').run(categoryId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json({ success: true, message: 'Category and all associated dishes deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete category', message: err.message });
  }
});

// --- Dishes Endpoints ---

// POST /api/menus/:id/categories/:categoryId/dishes - Add dish
router.post('/:id/categories/:categoryId/dishes', validateBody(dishSchema.omit({ category_id: true })), (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const data = req.body;
    const dishId = `dish-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;

    const maxOrderRow = db.prepare('SELECT MAX(display_order) as maxOrder FROM dishes WHERE category_id = ?').get(categoryId) as any;
    const nextOrder = (maxOrderRow?.maxOrder ?? -1) + 1;

    db.prepare(`
      INSERT INTO dishes (id, category_id, name, description, price, image_url, dietary_tags, is_available, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dishId,
      categoryId,
      data.name,
      data.description || null,
      data.price,
      data.image_url || null,
      JSON.stringify(data.dietary_tags || []),
      data.is_available ?? 1,
      data.display_order ?? nextOrder
    );

    const created = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId) as unknown as Dish;
    res.status(201).json({
      ...created,
      parsed_dietary_tags: JSON.parse(created.dietary_tags || '[]'),
      translations: {},
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to add dish', message: err.message });
  }
});

// PUT /api/menus/:id/dishes/:dishId - Update dish
router.put('/:id/dishes/:dishId', validateBody(dishUpdateSchema), (req: Request, res: Response) => {
  try {
    const { dishId } = req.params;
    const existing = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId) as unknown as Dish | undefined;

    if (!existing) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    const data = req.body;
    const name = data.name !== undefined ? data.name : existing.name;
    const description = data.description !== undefined ? data.description : existing.description;
    const price = data.price !== undefined ? data.price : existing.price;
    const image_url = data.image_url !== undefined ? data.image_url : existing.image_url;
    const dietary_tags = data.dietary_tags !== undefined ? JSON.stringify(data.dietary_tags) : existing.dietary_tags;
    const is_available = data.is_available !== undefined ? data.is_available : existing.is_available;
    const display_order = data.display_order !== undefined ? data.display_order : existing.display_order;
    const category_id = data.category_id !== undefined ? data.category_id : existing.category_id;

    db.prepare(`
      UPDATE dishes SET
        name = ?,
        description = ?,
        price = ?,
        image_url = ?,
        dietary_tags = ?,
        is_available = ?,
        display_order = ?,
        category_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name,
      description,
      price,
      image_url,
      dietary_tags,
      is_available,
      display_order,
      category_id,
      dishId
    );

    const updated = db.prepare('SELECT * FROM dishes WHERE id = ?').get(dishId) as unknown as Dish;
    res.json({
      ...updated,
      parsed_dietary_tags: JSON.parse(updated.dietary_tags || '[]'),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update dish', message: err.message });
  }
});

// DELETE /api/menus/:id/dishes/:dishId - Delete dish
router.delete('/:id/dishes/:dishId', (req: Request, res: Response) => {
  try {
    const { dishId } = req.params;
    const result = db.prepare('DELETE FROM dishes WHERE id = ?').run(dishId);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Dish not found' });
    }

    res.json({ success: true, message: 'Dish deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete dish', message: err.message });
  }
});

// POST /api/menus/:id/translations - Save approved translations
router.post('/:id/translations', validateBody(saveTranslationsSchema), (req: Request, res: Response) => {
  try {
    const { translations } = req.body;

    const insertStmt = db.prepare(`
      INSERT INTO translations (id, entity_type, entity_id, language_code, field_name, translation, status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(entity_type, entity_id, language_code, field_name) DO UPDATE SET
        translation = excluded.translation,
        status = excluded.status,
        updated_at = CURRENT_TIMESTAMP
    `);

    db.exec('BEGIN TRANSACTION;');

    try {
      for (const tr of translations) {
        const id = `tr-${tr.entity_type}-${tr.entity_id}-${tr.language_code}-${tr.field_name}`;
        insertStmt.run(
          id,
          tr.entity_type,
          tr.entity_id,
          tr.language_code,
          tr.field_name,
          tr.translation,
          tr.status || 'approved'
        );
      }
      db.exec('COMMIT;');
      res.json({ success: true, count: translations.length });
    } catch (err: any) {
      db.exec('ROLLBACK;');
      throw err;
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save translations', message: err.message });
  }
});

export default router;
