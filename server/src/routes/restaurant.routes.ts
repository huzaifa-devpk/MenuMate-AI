import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { validateBody, restaurantSchema } from '../middleware/validation';
import { Restaurant } from '../types';

const router = Router();

// GET /api/restaurant - Get the current restaurant profile (single-user MVP)
router.get('/', (req: Request, res: Response) => {
  try {
    const restaurant = db.prepare('SELECT * FROM restaurants ORDER BY created_at ASC LIMIT 1').get() as Restaurant | undefined;

    if (!restaurant) {
      return res.status(404).json({ error: 'No restaurant profile found. Please create one.' });
    }

    res.json(restaurant);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch restaurant profile', message: err.message });
  }
});

// PUT /api/restaurant - Create or update restaurant profile
router.put('/', validateBody(restaurantSchema), (req: Request, res: Response) => {
  try {
    const data = req.body;
    const existing = db.prepare('SELECT id FROM restaurants ORDER BY created_at ASC LIMIT 1').get() as { id: string } | undefined;

    const id = existing?.id || `rest-${Date.now()}`;

    const stmt = db.prepare(`
      INSERT INTO restaurants (id, name, description, logo_url, cover_url, phone, email, address, currency, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        logo_url = excluded.logo_url,
        cover_url = excluded.cover_url,
        phone = excluded.phone,
        email = excluded.email,
        address = excluded.address,
        currency = excluded.currency,
        updated_at = CURRENT_TIMESTAMP
    `);

    stmt.run(
      id,
      data.name,
      data.description || null,
      data.logo_url || null,
      data.cover_url || null,
      data.phone || null,
      data.email || null,
      data.address || null,
      data.currency || 'PKR'
    );

    const updated = db.prepare('SELECT * FROM restaurants WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update restaurant profile', message: err.message });
  }
});

// GET /api/restaurant/stats - Overview statistics for dashboard
router.get('/stats', (req: Request, res: Response) => {
  try {
    const menuCount = (db.prepare('SELECT COUNT(*) as count FROM menus').get() as any)?.count || 0;
    const publishedCount = (db.prepare('SELECT COUNT(*) as count FROM menus WHERE is_published = 1').get() as any)?.count || 0;
    const dishCount = (db.prepare('SELECT COUNT(*) as count FROM dishes').get() as any)?.count || 0;
    const translationCount = (db.prepare('SELECT COUNT(*) as count FROM translations WHERE status = "approved"').get() as any)?.count || 0;

    res.json({
      totalMenus: menuCount,
      publishedMenus: publishedCount,
      totalDishes: dishCount,
      totalTranslations: translationCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch restaurant statistics', message: err.message });
  }
});

export default router;
