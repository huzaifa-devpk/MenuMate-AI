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
  supported_languages: string[];
  is_published: number;
  published_at: string | null;
  category_count?: number;
  dish_count?: number;
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
  translations?: Record<string, { name?: string; description?: string }>;
}

export interface Dish {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  dietary_tags: string;
  parsed_dietary_tags?: string[];
  is_available: number;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  translations?: Record<string, { name?: string; description?: string }>;
}

export interface CategoryWithDishes extends Category {
  dishes: Dish[];
}

export interface MenuWithFullDetails extends Omit<Menu, 'supported_languages'> {
  supported_languages: string[];
  parsed_supported_languages: string[];
  restaurant: Restaurant;
  categories: CategoryWithDishes[];
  translations: Record<string, { title?: string; description?: string }>;
}

export interface AIProviderStatus {
  provider: 'google' | 'groq' | 'openai_compatible';
  model: string;
  isConfigured: boolean;
  supportedLanguages: Array<{
    code: string;
    name: string;
    nativeName: string;
    dir: 'ltr' | 'rtl';
  }>;
  hint: string;
}

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
