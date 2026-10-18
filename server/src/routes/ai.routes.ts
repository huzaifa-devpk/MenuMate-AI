import { Router, Request, Response } from 'express';
import { db } from '../db/database';
import { gemmaService, GemmaServiceError } from '../services/gemma.service';
import {
  validateBody,
  aiTranslateRequestSchema,
  aiImproveDescriptionSchema,
} from '../middleware/validation';
import { Menu, Category, Dish } from '../types';

const router = Router();

// GET /api/ai/status - Status of Gemma integration
router.get('/status', (req: Request, res: Response) => {
  const info = gemmaService.getProviderInfo();
  res.json({
    ...info,
    supportedLanguages: [
      { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
      { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
    ],
    hint: info.isConfigured
      ? 'Gemma is ready for high-fidelity translation and copywriting.'
      : 'Set GEMMA_API_KEY in your environment or .env file to enable live Gemma AI inference. (Google AI Studio or Groq)',
  });
});

// POST /api/ai/translate - Translate menu items using Gemma
router.post('/translate', validateBody(aiTranslateRequestSchema), async (req: Request, res: Response) => {
  try {
    const { menu_id, source_language, target_language } = req.body;

    const menu = db.prepare('SELECT * FROM menus WHERE id = ?').get(menu_id) as unknown as Menu | undefined;
    if (!menu) {
      return res.status(404).json({ error: 'Menu not found' });
    }

    const categories = db.prepare('SELECT * FROM categories WHERE menu_id = ? ORDER BY display_order ASC').all(menu_id) as unknown as Category[];

    const payloadCategories = categories.map((cat) => {
      const dishes = db.prepare('SELECT id, name, description FROM dishes WHERE category_id = ? ORDER BY display_order ASC').all(cat.id) as unknown as Dish[];
      return {
        id: cat.id,
        name: cat.name,
        dishes: dishes.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
        })),
      };
    });

    const result = await gemmaService.translateMenu({
      menuTitle: menu.title,
      sourceLanguage: source_language,
      targetLanguage: target_language,
      categories: payloadCategories,
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof GemmaServiceError) {
      return res.status(err.statusCode).json({
        error: err.message,
        details: err.details,
      });
    }
    console.error('AI Translation error:', err);
    res.status(500).json({
      error: 'An unexpected error occurred during translation with Gemma.',
      message: err.message,
    });
  }
});

// POST /api/ai/improve-description - Improve dish description with Gemma
router.post('/improve-description', validateBody(aiImproveDescriptionSchema), async (req: Request, res: Response) => {
  try {
    const { dish_name, current_description, ingredients, cuisine_notes } = req.body;

    const result = await gemmaService.improveDescription({
      dishName: dish_name,
      currentDescription: current_description,
      ingredients: ingredients,
      cuisineNotes: cuisine_notes,
    });

    res.json(result);
  } catch (err: any) {
    if (err instanceof GemmaServiceError) {
      return res.status(err.statusCode).json({
        error: err.message,
        details: err.details,
      });
    }
    console.error('AI Description improvement error:', err);
    res.status(500).json({
      error: 'Failed to generate improved description with Gemma.',
      message: err.message,
    });
  }
});

export default router;
