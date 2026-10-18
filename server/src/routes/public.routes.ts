import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import {
  Menu,
  MenuWithFullDetails,
  Restaurant,
  Category,
  Dish,
  CategoryWithDishes,
  DishWithTranslations,
} from '../types';

const router = Router();

// GET /api/public/menu/:slug - Public facing menu view
router.get('/menu/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const menu = db.prepare('SELECT * FROM menus WHERE slug = ?').get(slug) as unknown as Menu | undefined;

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found', message: 'The requested menu does not exist or has been removed.' });
    }

    if (menu.is_published !== 1) {
      return res.status(403).json({
        error: 'Menu unpublished',
        message: 'This restaurant menu is currently in draft mode and has not been published yet.',
        is_published: 0,
      });
    }

    const restaurant = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(menu.restaurant_id) as unknown as Restaurant;

    // Menu translations
    const menuTranslations = db.prepare('SELECT * FROM translations WHERE entity_type = "menu" AND entity_id = ? AND status = "approved"').all(menu.id) as any[];
    const parsedMenuTr: Record<string, { title?: string; description?: string }> = {};
    for (const tr of menuTranslations) {
      if (!parsedMenuTr[tr.language_code]) parsedMenuTr[tr.language_code] = {};
      (parsedMenuTr[tr.language_code] as any)[tr.field_name] = tr.translation;
    }

    // Categories
    const categories = db.prepare('SELECT * FROM categories WHERE menu_id = ? ORDER BY display_order ASC, created_at ASC').all(menu.id) as unknown as Category[];

    const categoriesWithDishes: CategoryWithDishes[] = [];

    for (const cat of categories) {
      // Category translations
      const catTranslations = db.prepare('SELECT * FROM translations WHERE entity_type = "category" AND entity_id = ? AND status = "approved"').all(cat.id) as any[];
      const parsedCatTr: Record<string, { name?: string; description?: string }> = {};
      for (const tr of catTranslations) {
        if (!parsedCatTr[tr.language_code]) parsedCatTr[tr.language_code] = {};
        (parsedCatTr[tr.language_code] as any)[tr.field_name] = tr.translation;
      }

      // Dishes (only available dishes for public menu)
      const dishes = db.prepare('SELECT * FROM dishes WHERE category_id = ? AND is_available = 1 ORDER BY display_order ASC, created_at ASC').all(cat.id) as unknown as Dish[];

      const dishesWithTranslations: DishWithTranslations[] = [];

      for (const d of dishes) {
        const dishTr = db.prepare('SELECT * FROM translations WHERE entity_type = "dish" AND entity_id = ? AND status = "approved"').all(d.id) as any[];
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

      // Only include categories that have dishes or are defined
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

    const responseData: MenuWithFullDetails = {
      ...menu,
      parsed_supported_languages: parsedSupportedLanguages,
      restaurant: restaurant || {
        id: menu.restaurant_id,
        name: 'Restaurant Menu',
        currency: 'PKR',
        description: null,
        logo_url: null,
        cover_url: null,
        phone: null,
        email: null,
        address: null,
      },
      categories: categoriesWithDishes,
      translations: parsedMenuTr,
    };

    res.json(responseData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load public menu', message: err.message });
  }
});

// GET /api/health - Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  try {
    const test = db.prepare('SELECT 1 as healthy').get() as { healthy: number };
    res.json({
      status: 'ok',
      service: 'MenuMate AI API',
      database: test?.healthy === 1 ? 'connected' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message });
  }
});

export default router;
