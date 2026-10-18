import {
  Restaurant,
  Menu,
  MenuWithFullDetails,
  Category,
  Dish,
  AIProviderStatus,
  AIMenuTranslationResult,
  AIImproveDescriptionResult,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorJson: any = null;
    try {
      errorJson = await response.json();
    } catch {}

    const errorMessage = errorJson?.error || errorJson?.message || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMessage) as any;
    err.status = response.status;
    err.details = errorJson?.details;
    throw err;
  }

  return response.json();
}

export const api = {
  // Restaurant Profile
  getRestaurant: () => request<Restaurant>('/restaurant'),
  updateRestaurant: (data: Partial<Restaurant>) =>
    request<Restaurant>('/restaurant', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  getStats: () =>
    request<{
      totalMenus: number;
      publishedMenus: number;
      totalDishes: number;
      totalTranslations: number;
    }>('/restaurant/stats'),

  // Menus
  getMenus: () => request<Menu[]>('/menus'),
  getMenu: (id: string) => request<MenuWithFullDetails>(`/menus/${id}`),
  createMenu: (data: Partial<Menu> & { restaurant_id: string; title: string }) =>
    request<Menu>('/menus', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMenu: (id: string, data: Partial<Menu>) =>
    request<Menu>(`/menus/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteMenu: (id: string) =>
    request<{ success: boolean }>(`/menus/${id}`, {
      method: 'DELETE',
    }),
  publishMenu: (id: string, publish: boolean) =>
    request<{ success: boolean; is_published: number; slug: string }>(`/menus/${id}/publish`, {
      method: 'POST',
      body: JSON.stringify({ publish }),
    }),

  // Categories
  addCategory: (menuId: string, data: { name: string; description?: string }) =>
    request<Category>(`/menus/${menuId}/categories`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (menuId: string, categoryId: string, data: Partial<Category>) =>
    request<Category>(`/menus/${menuId}/categories/${categoryId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (menuId: string, categoryId: string) =>
    request<{ success: boolean }>(`/menus/${menuId}/categories/${categoryId}`, {
      method: 'DELETE',
    }),

  // Dishes
  addDish: (
    menuId: string,
    categoryId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      image_url?: string;
      dietary_tags?: string[];
    }
  ) =>
    request<Dish>(`/menus/${menuId}/categories/${categoryId}/dishes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateDish: (
    menuId: string,
    dishId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      image_url?: string;
      dietary_tags?: string[];
      is_available?: number;
      display_order?: number;
      category_id?: string;
    }
  ) =>
    request<Dish>(`/menus/${menuId}/dishes/${dishId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteDish: (menuId: string, dishId: string) =>
    request<{ success: boolean }>(`/menus/${menuId}/dishes/${dishId}`, {
      method: 'DELETE',
    }),

  // Translations
  saveTranslations: (
    menuId: string,
    translations: Array<{
      entity_type: 'menu' | 'category' | 'dish';
      entity_id: string;
      language_code: string;
      field_name: 'title' | 'name' | 'description';
      translation: string;
      status?: 'pending_review' | 'approved' | 'rejected';
    }>
  ) =>
    request<{ success: boolean; count: number }>(`/menus/${menuId}/translations`, {
      method: 'POST',
      body: JSON.stringify({ translations }),
    }),

  // AI & Gemma
  getAIStatus: () => request<AIProviderStatus>('/ai/status'),
  translateMenuWithGemma: (menuId: string, sourceLang = 'en', targetLang = 'ur') =>
    request<AIMenuTranslationResult>('/ai/translate', {
      method: 'POST',
      body: JSON.stringify({
        menu_id: menuId,
        source_language: sourceLang,
        target_language: targetLang,
      }),
    }),
  improveDescriptionWithGemma: (payload: {
    dish_name: string;
    current_description?: string;
    ingredients?: string;
    cuisine_notes?: string;
  }) =>
    request<AIImproveDescriptionResult>('/ai/improve-description', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Public
  getPublicMenu: (slug: string) => request<MenuWithFullDetails>(`/public/menu/${slug}`),
};
