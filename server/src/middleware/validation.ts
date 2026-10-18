import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

export const restaurantSchema = z.object({
  name: z.string().trim().min(1, 'Restaurant name is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  logo_url: z.string().url('Invalid logo URL').or(z.literal('')).optional().nullable(),
  cover_url: z.string().url('Invalid cover URL').or(z.literal('')).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().email('Invalid email address').or(z.literal('')).optional().nullable(),
  address: z.string().trim().max(255).optional().nullable(),
  currency: z.string().trim().min(1).max(10).default('PKR'),
});

export const menuSchema = z.object({
  restaurant_id: z.string().min(1, 'Restaurant ID is required'),
  title: z.string().trim().min(1, 'Menu title is required').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens').optional(),
  theme: z.enum(['classic', 'modern']).default('classic'),
  source_language: z.string().min(2).max(10).default('en'),
  supported_languages: z.array(z.string()).default(['en', 'ur']),
  is_published: z.number().int().min(0).max(1).optional().default(0),
});

export const menuUpdateSchema = menuSchema.partial().extend({
  is_published: z.number().int().min(0).max(1).optional(),
});

export const categorySchema = z.object({
  menu_id: z.string().min(1, 'Menu ID is required'),
  name: z.string().trim().min(1, 'Category name is required').max(100),
  description: z.string().trim().max(300).optional().nullable(),
  display_order: z.number().int().default(0),
});

export const dishSchema = z.object({
  category_id: z.string().min(1, 'Category ID is required'),
  name: z.string().trim().min(1, 'Dish name cannot be empty').max(120),
  description: z.string().trim().max(1000).optional().nullable(),
  price: z.number({ invalid_type_error: 'Price must be a valid number' })
    .min(0, 'Price must be non-negative'),
  image_url: z.string().url('Invalid image URL').or(z.literal('')).optional().nullable(),
  dietary_tags: z.array(z.string()).optional().default([]),
  is_available: z.number().int().min(0).max(1).optional().default(1),
  display_order: z.number().int().default(0),
});

export const dishUpdateSchema = dishSchema.partial();

export const aiTranslateRequestSchema = z.object({
  menu_id: z.string().min(1, 'Menu ID is required'),
  source_language: z.string().min(2).max(10).default('en'),
  target_language: z.string().min(2).max(10).default('ur'),
});

export const aiImproveDescriptionSchema = z.object({
  dish_name: z.string().trim().min(1, 'Dish name is required').max(120),
  current_description: z.string().trim().max(1000).optional().nullable(),
  ingredients: z.string().trim().max(500).optional().nullable(),
  cuisine_notes: z.string().trim().max(300).optional().nullable(),
});

export const saveTranslationsSchema = z.object({
  translations: z.array(
    z.object({
      entity_type: z.enum(['menu', 'category', 'dish']),
      entity_id: z.string().min(1),
      language_code: z.string().min(2).max(10),
      field_name: z.enum(['title', 'name', 'description']),
      translation: z.string().trim().min(1),
      status: z.enum(['pending_review', 'approved', 'rejected']).default('approved'),
    })
  ).min(1, 'At least one translation must be supplied'),
});
