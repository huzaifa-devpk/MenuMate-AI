import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  QrCode,
  Eye,
  Plus,
  Edit,
  Trash2,
  Layers,
  Utensils,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { MenuWithFullDetails, Category, Dish, CategoryWithDishes } from '../types';
import { GemmaTranslationModal } from '../components/GemmaTranslationModal';
import { QRCodeModal } from '../components/QRCodeModal';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { DishFormModal } from '../components/DishFormModal';

export const MenuBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuWithFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable menu metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [slug, setSlug] = useState('');
  const [theme, setTheme] = useState<'classic' | 'modern'>('classic');

  // Modals state
  const [isGemmaModalOpen, setIsGemmaModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Category Modal
  const [categoryModal, setCategoryModal] = useState<{
    isOpen: boolean;
    initialData?: Category | null;
  }>({ isOpen: false });

  // Dish Modal
  const [dishModal, setDishModal] = useState<{
    isOpen: boolean;
    categoryId: string;
    categoryName: string;
    initialData?: Dish | null;
  }>({ isOpen: false, categoryId: '', categoryName: '' });

  // Accordion state for categories
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const loadMenuDetails = async () => {
    if (!id || id === 'new') {
      // If /menu/new, redirect or fetch existing demo menu
      try {
        const menus = await api.getMenus();
        if (menus.length > 0) {
          navigate(`/menu/${menus[0].id}`, { replace: true });
        } else {
          const created = await api.createMenu({
            restaurant_id: 'rest-saffron-garden',
            title: 'Saffron Garden Main Menu',
            theme: 'classic',
          });
          navigate(`/menu/${created.id}`, { replace: true });
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize menu');
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.getMenu(id);
      setMenu(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setSlug(data.slug);
      setTheme(data.theme);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenuDetails();
  }, [id]);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleSaveMetadata = async () => {
    if (!menu) return;
    setSavingMetadata(true);
    try {
      const updated = await api.updateMenu(menu.id, {
        title,
        description: description || undefined,
        slug,
        theme,
      });
      setMenu({
        ...menu,
        title: updated.title,
        description: updated.description,
        slug: updated.slug,
        theme: updated.theme,
      });
      alert('Menu details successfully saved!');
    } catch (err: any) {
      alert(`Failed to save menu: ${err.message}`);
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!menu) return;
    try {
      const targetState = menu.is_published === 1 ? false : true;
      await api.publishMenu(menu.id, targetState);
      setMenu({ ...menu, is_published: targetState ? 1 : 0 });
    } catch (err: any) {
      alert(`Publish toggle failed: ${err.message}`);
    }
  };

  // Category Actions
  const handleCategorySubmit = async (data: { name: string; description?: string }) => {
    if (!menu) return;
    if (categoryModal.initialData) {
      // Edit
      const updated = await api.updateCategory(menu.id, categoryModal.initialData.id, data);
      setMenu({
        ...menu,
        categories: menu.categories.map((c) =>
          c.id === categoryModal.initialData!.id ? { ...c, ...updated } : c
        ),
      });
    } else {
      // Add
      const created = await api.addCategory(menu.id, data);
      setMenu({
        ...menu,
        categories: [...menu.categories, { ...created, dishes: [] }],
      });
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!menu) return;
    if (!window.confirm('Delete this category and all of its dishes?')) return;
    try {
      await api.deleteCategory(menu.id, catId);
      setMenu({
        ...menu,
        categories: menu.categories.filter((c) => c.id !== catId),
      });
    } catch (err: any) {
      alert(`Failed to delete category: ${err.message}`);
    }
  };

  // Dish Actions
  const handleDishSubmit = async (dishData: {
    name: string;
    description?: string;
    price: number;
    image_url?: string;
    dietary_tags?: string[];
    is_available?: number;
  }) => {
    if (!menu) return;
    if (dishModal.initialData) {
      // Update
      const updated = await api.updateDish(menu.id, dishModal.initialData.id, dishData);
      setMenu({
        ...menu,
        categories: menu.categories.map((c) => {
          if (c.id === dishModal.categoryId) {
            return {
              ...c,
              dishes: c.dishes.map((d) =>
                d.id === dishModal.initialData!.id
                  ? {
                      ...d,
                      ...updated,
                      parsed_dietary_tags: dishData.dietary_tags || [],
                    }
                  : d
              ),
            };
          }
          return c;
        }),
      });
    } else {
      // Create
      const created = await api.addDish(menu.id, dishModal.categoryId, dishData);
      setMenu({
        ...menu,
        categories: menu.categories.map((c) => {
          if (c.id === dishModal.categoryId) {
            return {
              ...c,
              dishes: [
                ...c.dishes,
                {
                  ...created,
                  parsed_dietary_tags: dishData.dietary_tags || [],
                },
              ],
            };
          }
          return c;
        }),
      });
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (!menu) return;
    if (!window.confirm('Are you sure you want to delete this dish?')) return;
    try {
      await api.deleteDish(menu.id, dishId);
      setMenu({
        ...menu,
        categories: menu.categories.map((c) => ({
          ...c,
          dishes: c.dishes.filter((d) => d.id !== dishId),
        })),
      });
    } catch (err: any) {
      alert(`Failed to delete dish: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-charcoal-500 mt-2 font-medium">Loading menu builder...</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-8">
        <div className="text-center max-w-md bg-white p-6 rounded-2xl border border-stone-200 space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h3 className="font-bold text-base text-charcoal-900">Unable to Load Menu</h3>
          <p className="text-xs text-charcoal-500">{error || 'Menu not found'}</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPublished = menu.is_published === 1;

  return (
    <div className="min-h-screen bg-cream-50 text-charcoal-900 pb-24">
      {/* Top Action Sticky Subheader */}
      <div className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 text-stone-500 hover:text-charcoal-900 hover:bg-stone-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-charcoal-900 truncate max-w-xs sm:max-w-md">
                  {menu.title}
                </h1>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isPublished
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="text-[11px] text-charcoal-500">
                URL: <span className="font-mono">/m/{menu.slug}</span>
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsGemmaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100/90 hover:bg-emerald-200/90 text-emerald-900 font-semibold text-xs border border-emerald-300 shadow-sm active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Gemma AI Translate</span>
            </button>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-charcoal-700 font-semibold text-xs transition-colors"
            >
              <QrCode className="w-4 h-4 text-stone-600" />
              <span>QR Code</span>
            </button>

            {isPublished && (
              <Link
                to={`/m/${menu.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-800 font-semibold text-xs transition-colors"
              >
                <Eye className="w-4 h-4 text-stone-600" />
                <span className="hidden sm:inline">Preview</span>
              </Link>
            )}

            <button
              type="button"
              onClick={handleTogglePublish}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                isPublished
                  ? 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  : 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{isPublished ? 'Unpublish' : 'Publish'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Categories and Dishes (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold font-serif text-charcoal-900">Menu Structure</h2>
              <p className="text-xs text-charcoal-500">
                Organize dishes by section, prices in {menu.restaurant?.currency || 'PKR'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCategoryModal({ isOpen: true, initialData: null })}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-charcoal-800 font-semibold text-xs shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-600" />
              Add Category
            </button>
          </div>

          {menu.categories.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-stone-300 p-8 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-charcoal-800">No Categories Yet</h4>
              <p className="text-xs text-charcoal-500 max-w-xs mx-auto">
                Add sections like "Starters", "Main Course", or "Desserts" to start adding dishes.
              </p>
              <button
                type="button"
                onClick={() => setCategoryModal({ isOpen: true, initialData: null })}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {menu.categories.map((cat) => {
                const isCollapsed = collapsedCategories[cat.id];
                const urduCatName = cat.translations?.ur?.name;

                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden transition-all"
                  >
                    {/* Category Header */}
                    <div className="p-4 bg-stone-50/70 border-b border-stone-200 flex items-center justify-between gap-3">
                      <div
                        className="flex items-center gap-3 cursor-pointer select-none flex-1"
                        onClick={() => toggleCategoryCollapse(cat.id)}
                      >
                        <button
                          type="button"
                          className="p-1 text-stone-400 hover:text-charcoal-700 rounded transition-colors"
                        >
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronUp className="w-4 h-4" />
                          )}
                        </button>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm sm:text-base text-charcoal-900">
                              {cat.name}
                            </h3>
                            {urduCatName && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-urdu border border-emerald-200">
                                {urduCatName}
                              </span>
                            )}
                          </div>
                          {cat.description && (
                            <p className="text-[11px] text-charcoal-500 mt-0.5">{cat.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setDishModal({
                              isOpen: true,
                              categoryId: cat.id,
                              categoryName: cat.name,
                              initialData: null,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Dish</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setCategoryModal({ isOpen: true, initialData: cat })}
                          className="p-1.5 text-stone-400 hover:text-charcoal-700 hover:bg-stone-200/60 rounded-lg transition-colors"
                          title="Edit Category"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Dish List inside Category */}
                    {!isCollapsed && (
                      <div className="p-4 divide-y divide-stone-100">
                        {cat.dishes.length === 0 ? (
                          <div className="text-center py-6 text-xs text-charcoal-400">
                            No dishes in this category yet. Click "+ Add Dish" above.
                          </div>
                        ) : (
                          cat.dishes.map((dish) => {
                            const urduDishName = dish.translations?.ur?.name;
                            const urduDishDesc = dish.translations?.ur?.description;
                            const tags =
                              dish.parsed_dietary_tags ||
                              (() => {
                                try {
                                  return JSON.parse(dish.dietary_tags || '[]');
                                } catch {
                                  return [];
                                }
                              })();

                            return (
                              <div
                                key={dish.id}
                                className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                              >
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {dish.image_url ? (
                                    <img
                                      src={dish.image_url}
                                      alt={dish.name}
                                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-200 shadow-xs"
                                    />
                                  ) : (
                                    <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center shrink-0 text-stone-300">
                                      <Utensils className="w-5 h-5" />
                                    </div>
                                  )}

                                  <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-sm text-charcoal-900 truncate">
                                        {dish.name}
                                      </h4>
                                      {dish.is_available === 0 && (
                                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-100 text-stone-500">
                                          Unavailable
                                        </span>
                                      )}
                                    </div>

                                    {/* Urdu translation indicator */}
                                    {urduDishName && (
                                      <p className="text-xs font-urdu text-emerald-800 line-clamp-1">
                                        {urduDishName}
                                      </p>
                                    )}

                                    {dish.description && (
                                      <p className="text-xs text-charcoal-500 line-clamp-1 leading-relaxed">
                                        {dish.description}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap gap-1 pt-0.5">
                                      {tags.map((tag: string) => (
                                        <span
                                          key={tag}
                                          className="text-[9px] px-1.5 py-0.2 rounded bg-stone-100 text-charcoal-600 font-medium"
                                        >
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Price & Controls */}
                                <div className="flex flex-col items-end gap-2 shrink-0">
                                  <span className="text-xs sm:text-sm font-bold text-emerald-800 font-mono">
                                    {menu.restaurant?.currency || 'PKR'} {dish.price}
                                  </span>

                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setDishModal({
                                          isOpen: true,
                                          categoryId: cat.id,
                                          categoryName: cat.name,
                                          initialData: dish,
                                        })
                                      }
                                      className="p-1.5 text-stone-400 hover:text-charcoal-700 hover:bg-stone-100 rounded-lg transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteDish(dish.id)}
                                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Menu Metadata & Language Summary */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-base font-serif text-charcoal-900 border-b border-stone-100 pb-3">
              Menu Configuration
            </h3>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Menu Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-semibold text-charcoal-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                URL Slug
              </label>
              <div className="flex items-center px-3 py-2 text-xs rounded-xl border border-stone-300 bg-stone-50 text-charcoal-500">
                <span className="text-stone-400 select-none">/m/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="bg-transparent text-charcoal-800 font-mono flex-1 outline-none ml-0.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                Visual Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'classic' | 'modern')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="classic">Classic Warm & Serif (Traditional)</option>
                <option value="modern">Modern Crisp & Clean (Contemporary)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleSaveMetadata}
              disabled={savingMetadata}
              className="w-full py-2.5 rounded-xl bg-charcoal-900 hover:bg-black text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {savingMetadata ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Multilingual Translation Status Card */}
          <div className="bg-gradient-to-br from-emerald-50 via-cream-50 to-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <h4 className="font-bold text-sm text-charcoal-900">Bilingual Translation</h4>
            </div>
            <p className="text-xs text-charcoal-600 leading-relaxed">
              Google Gemma AI translates your dish names and descriptions into authentic Urdu Nastaliq typography with culinary context.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsGemmaModalOpen(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Launch Gemma Translation Studio
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Gemma AI Translation Modal */}
      <GemmaTranslationModal
        menu={menu}
        isOpen={isGemmaModalOpen}
        onClose={() => setIsGemmaModalOpen(false)}
        onSuccess={() => {
          loadMenuDetails();
        }}
      />

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        menuTitle={menu.title}
        restaurantName={menu.restaurant?.name || 'Saffron Garden'}
        slug={menu.slug}
        onClose={() => setIsQrModalOpen(false)}
      />

      {/* Category Modal */}
      <CategoryFormModal
        isOpen={categoryModal.isOpen}
        initialData={categoryModal.initialData}
        onClose={() => setCategoryModal({ isOpen: false })}
        onSubmit={handleCategorySubmit}
      />

      {/* Dish Modal */}
      <DishFormModal
        isOpen={dishModal.isOpen}
        categoryName={dishModal.categoryName}
        currency={menu.restaurant?.currency || 'PKR'}
        initialData={dishModal.initialData}
        onClose={() => setDishModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleDishSubmit}
      />
    </div>
  );
};

export default MenuBuilderPage;
