export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface Menu {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  slug: string;
  theme: 'classic' | 'modern';
  source_language: string;
  supported_languages: string; // JSON string e.g. '["en", "ur"]'
  is_published: number; // 0 or 1
  published_at: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  menu_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Dish {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  dietary_tags: string; // JSON string e.g. '["vegetarian", "spicy"]'
  is_available: number; // 0 or 1
  display_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Translation {
  id: string;
  entity_type: 'menu' | 'category' | 'dish';
  entity_id: string;
  language_code: string;
  field_name: string;
  translation: string;
  status: 'pending_review' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
}

export interface DishWithTranslations extends Dish {
  parsed_dietary_tags: string[];
  translations: Record<string, { name?: string; description?: string }>;
}

export interface CategoryWithDishes extends Category {
  dishes: DishWithTranslations[];
  translations: Record<string, { name?: string; description?: string }>;
}

export interface MenuWithFullDetails extends Menu {
  parsed_supported_languages: string[];
  restaurant: Restaurant;
  categories: CategoryWithDishes[];
  translations: Record<string, { title?: string; description?: string }>;
}

// Gemma AI Payload Interfaces
export interface AITranslationItem {
  id: string;
  original_name: string;
  translated_name: string;
  original_description?: string | null;
  translated_description?: string | null;
}

export interface AICategoryTranslation {
  id: string;
  original_name: string;
  translated_name: string;
  dishes: AITranslationItem[];
}

export interface AIMenuTranslationResult {
  source_language: string;
  target_language: string;
  menu_title?: {
    original: string;
    translated: string;
  };
  categories: AICategoryTranslation[];
}

export interface AIImproveDescriptionResult {
  dish_name: string;
  original_description?: string | null;
  improved_description: string;
  suggested_tags?: string[];
}
