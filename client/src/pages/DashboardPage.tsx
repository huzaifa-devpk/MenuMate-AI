import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Utensils,
  Plus,
  QrCode,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Globe,
  Settings,
  Share2,
} from 'lucide-react';
import { api } from '../api/client';
import { Menu, Restaurant, AIProviderStatus } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [stats, setStats] = useState<{
    totalMenus: number;
    publishedMenus: number;
    totalDishes: number;
    totalTranslations: number;
  } | null>(null);
  const [aiStatus, setAiStatus] = useState<AIProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QR Modal state
  const [qrModalData, setQrModalData] = useState<{
    isOpen: boolean;
    menuTitle: string;
    slug: string;
  }>({
    isOpen: false,
    menuTitle: '',
    slug: '',
  });

  // Create menu modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMenuTitle, setNewMenuTitle] = useState('');
  const [newMenuDescription, setNewMenuDescription] = useState('');
  const [newMenuTheme, setNewMenuTheme] = useState<'classic' | 'modern'>('classic');
  const [creatingMenu, setCreatingMenu] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [menusData, restaurantData, statsData, aiData] = await Promise.all([
        api.getMenus(),
        api.getRestaurant().catch(() => null),
        api.getStats().catch(() => null),
        api.getAIStatus().catch(() => null),
      ]);
      setMenus(menusData);
      if (restaurantData) setRestaurant(restaurantData);
      if (statsData) setStats(statsData);
      if (aiData) setAiStatus(aiData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTogglePublish = async (menu: Menu) => {
    try {
      const targetState = menu.is_published === 1 ? false : true;
      await api.publishMenu(menu.id, targetState);
      setMenus((prev) =>
        prev.map((m) =>
          m.id === menu.id ? { ...m, is_published: targetState ? 1 : 0 } : m
        )
      );
      if (stats) {
        setStats({
          ...stats,
          publishedMenus: targetState
            ? stats.publishedMenus + 1
            : Math.max(0, stats.publishedMenus - 1),
        });
      }
    } catch (err: any) {
      alert(`Failed to update publish state: ${err.message}`);
    }
  };

  const handleDeleteMenu = async (menuId: string) => {
    if (!window.confirm('Are you sure you want to delete this menu? This will remove all associated categories and dishes.')) {
      return;
    }
    try {
      await api.deleteMenu(menuId);
      setMenus((prev) => prev.filter((m) => m.id !== menuId));
    } catch (err: any) {
      alert(`Failed to delete menu: ${err.message}`);
    }
  };

  const handleCreateMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuTitle.trim()) return;

    setCreatingMenu(true);
    try {
      const created = await api.createMenu({
        restaurant_id: restaurant?.id || 'rest-saffron-garden',
        title: newMenuTitle.trim(),
        description: newMenuDescription.trim() || undefined,
        theme: newMenuTheme,
        source_language: 'en',
        supported_languages: ['en', 'ur'],
      });
      setIsCreateModalOpen(false);
      navigate(`/menu/${created.id}`);
    } catch (err: any) {
      alert(`Failed to create menu: ${err.message}`);
    } finally {
      setCreatingMenu(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 text-charcoal-900 pb-20">
      {/* Top Banner / Restaurant Profile */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0 shadow-sm">
                <img
                  src={
                    restaurant?.logo_url ||
                    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=300&q=80'
                  }
                  alt={restaurant?.name || 'Restaurant'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold font-serif text-charcoal-900">
                    {restaurant?.name || 'Saffron Garden (Demo)'}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300">
                    {restaurant?.currency || 'PKR'}
                  </span>
                </div>
                <p className="text-xs text-charcoal-500 mt-1 max-w-xl">
                  {restaurant?.description ||
                    'Authentic Pakistani & Desi Fusion Cuisine featuring handis, dum biryanis, and clay-oven breads.'}
                </p>
                {restaurant?.address && (
                  <p className="text-[11px] text-charcoal-400 mt-0.5">{restaurant.address}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <Link
                to="/m/saffron-garden"
                target="_blank"
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-charcoal-700 font-semibold text-xs transition-colors shadow-sm"
              >
                <Eye className="w-4 h-4 text-emerald-600" />
                Live Demo Menu
              </Link>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
                New Menu
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-stone-200">
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                Total Menus
              </span>
              <p className="text-2xl font-bold text-charcoal-900 mt-1">
                {stats?.totalMenus ?? menus.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                Published & Active
              </span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {stats?.publishedMenus ?? menus.filter((m) => m.is_published === 1).length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200">
              <span className="text-xs font-medium text-charcoal-500 uppercase tracking-wider">
                Total Dishes
              </span>
              <p className="text-2xl font-bold text-charcoal-900 mt-1">
                {stats?.totalDishes ?? 8}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-xs font-medium text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Gemma Translations
              </span>
              <p className="text-2xl font-bold text-emerald-900 mt-1">
                {stats?.totalTranslations ?? 16}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Gemma Status Alert */}
        <div className="p-4 rounded-2xl glass-panel border border-stone-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-charcoal-900 flex items-center gap-2">
                Gemma 2 AI Engine
                <span
                  className={`w-2 h-2 rounded-full ${
                    aiStatus?.isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
              </p>
              <p className="text-[11px] text-charcoal-500">
                {aiStatus?.hint || 'Gemma is configured and ready for automatic menu translations.'}
              </p>
            </div>
          </div>

          <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
            Model: {aiStatus?.model || 'gemma-2-9b-it'}
          </div>
        </div>

        {/* Menus Section Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-serif text-charcoal-900">Your Restaurant Menus</h2>
            <p className="text-xs text-charcoal-500">Manage categories, dishes, prices, and bilingual translations</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="p-2 text-stone-500 hover:text-charcoal-800 hover:bg-stone-100 rounded-lg transition-colors text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Menu Cards Grid */}
        {loading && menus.length === 0 ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-xs text-charcoal-500 mt-2">Loading menus...</p>
          </div>
        ) : menus.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-charcoal-900">No Menus Found</h3>
            <p className="text-xs text-charcoal-500 max-w-sm mx-auto">
              Get started by creating your first restaurant menu. You can add dishes and translate them with Gemma AI.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Menu
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menus.map((menu) => {
              const isPublished = menu.is_published === 1;
              return (
                <div
                  key={menu.id}
                  className="bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-5 border-b border-stone-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                          isPublished
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPublished ? 'bg-emerald-600' : 'bg-stone-400'
                          }`}
                        />
                        {isPublished ? 'Published' : 'Draft'}
                      </span>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-charcoal-700 font-mono font-semibold">
                          EN
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-urdu font-semibold">
                          اردو
                        </span>
                      </div>
                    </div>

                    <h3 className="font-bold text-lg text-charcoal-900 line-clamp-1">{menu.title}</h3>
                    <p className="text-xs text-charcoal-500 line-clamp-2 leading-relaxed">
                      {menu.description || 'No description provided'}
                    </p>
                  </div>

                  {/* Card Meta Stats */}
                  <div className="px-5 py-3 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between text-xs text-charcoal-600 font-medium">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-stone-400" />
                      {menu.category_count || 0} Categories
                    </span>
                    <span className="flex items-center gap-1">
                      <Utensils className="w-3.5 h-3.5 text-stone-400" />
                      {menu.dish_count || 0} Dishes
                    </span>
                    <span className="text-[11px] font-mono text-charcoal-400">/{menu.slug}</span>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="p-4 mt-auto grid grid-cols-2 gap-2">
                    <Link
                      to={`/menu/${menu.id}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs border border-emerald-200 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      Edit Menu
                    </Link>

                    {isPublished ? (
                      <Link
                        to={`/m/${menu.slug}`}
                        target="_blank"
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-800 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-stone-600" />
                        View Live
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(menu)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-charcoal-800 font-semibold text-xs transition-colors"
                      >
                        <Globe className="w-3.5 h-3.5 text-stone-600" />
                        Publish Now
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setQrModalData({
                          isOpen: true,
                          menuTitle: menu.title,
                          slug: menu.slug,
                        })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-charcoal-700 font-semibold text-xs transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5 text-stone-500" />
                      QR Code
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePublish(menu)}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border font-semibold text-xs transition-colors ${
                        isPublished
                          ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
                          : 'border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      {isPublished ? 'Unpublish' : 'Publish'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <QRCodeModal
        isOpen={qrModalData.isOpen}
        menuTitle={qrModalData.menuTitle}
        restaurantName={restaurant?.name || 'Saffron Garden'}
        slug={qrModalData.slug}
        onClose={() => setQrModalData((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Create New Menu Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden my-auto">
            <div className="p-5 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <h3 className="font-bold text-base text-charcoal-900">Create New Restaurant Menu</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-stone-400 hover:text-charcoal-700 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMenuSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Menu Title *
                </label>
                <input
                  type="text"
                  required
                  value={newMenuTitle}
                  onChange={(e) => setNewMenuTitle(e.target.value)}
                  placeholder="e.g. Lunch & Dinner Menu"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newMenuDescription}
                  onChange={(e) => setNewMenuDescription(e.target.value)}
                  placeholder="e.g. Specialty seasonal curries and appetizers"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1">
                  Design Theme
                </label>
                <select
                  value={newMenuTheme}
                  onChange={(e) => setNewMenuTheme(e.target.value as 'classic' | 'modern')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="classic">Classic Fine Dining (Serif + Warm Tones)</option>
                  <option value="modern">Modern Minimalist (Clean + High Contrast)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-charcoal-700 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMenu}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs shadow-md shadow-emerald-700/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {creatingMenu ? 'Creating...' : 'Create & Open Builder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
