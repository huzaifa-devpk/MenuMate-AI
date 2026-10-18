import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Utensils,
  MapPin,
  Phone,
  Search,
  Sparkles,
  QrCode,
  Share2,
  Printer,
  ChevronDown,
  Info,
  Check,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';
import { MenuWithFullDetails, CategoryWithDishes, Dish } from '../types';
import { QRCodeModal } from '../components/QRCodeModal';

export const PublicMenuPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  const [menu, setMenu] = useState<MenuWithFullDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<'en' | 'ur'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [activeCategoryTab, setActiveCategoryTab] = useState<string>('all');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api
      .getPublicMenu(slug)
      .then((data) => {
        setMenu(data);
      })
      .catch((err) => {
        setError(err.message || 'Menu not found or not published.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  const isRtl = lang === 'ur';

  // Available tags across all dishes
  const allDietaryTags = useMemo(() => {
    if (!menu) return [];
    const tagSet = new Set<string>();
    for (const cat of menu.categories) {
      for (const dish of cat.dishes) {
        const tags =
          dish.parsed_dietary_tags ||
          (() => {
            try {
              return JSON.parse(dish.dietary_tags || '[]');
            } catch {
              return [];
            }
          })();
        tags.forEach((t: string) => tagSet.add(t));
      }
    }
    return Array.from(tagSet);
  }, [menu]);

  // Filtered categories and dishes
  const filteredCategories = useMemo(() => {
    if (!menu) return [];

    return menu.categories
      .map((cat) => {
        // Filter by category tab if selected
        if (activeCategoryTab !== 'all' && cat.id !== activeCategoryTab) {
          return null;
        }

        const filteredDishes = cat.dishes.filter((dish) => {
          // Dietary tag filter
          if (selectedTag !== 'all') {
            const tags =
              dish.parsed_dietary_tags ||
              (() => {
                try {
                  return JSON.parse(dish.dietary_tags || '[]');
                } catch {
                  return [];
                }
              })();
            if (!tags.includes(selectedTag)) return false;
          }

          // Search query filter (searches English name/desc & Urdu name/desc)
          if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            const enName = dish.name.toLowerCase();
            const enDesc = (dish.description || '').toLowerCase();
            const urName = (dish.translations?.ur?.name || '').toLowerCase();
            const urDesc = (dish.translations?.ur?.description || '').toLowerCase();

            return (
              enName.includes(query) ||
              enDesc.includes(query) ||
              urName.includes(query) ||
              urDesc.includes(query)
            );
          }

          return true;
        });

        if (filteredDishes.length === 0) return null;

        return {
          ...cat,
          dishes: filteredDishes,
        };
      })
      .filter(Boolean) as CategoryWithDishes[];
  }, [menu, activeCategoryTab, selectedTag, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs text-charcoal-500 mt-2 font-medium">Loading delicious menu...</p>
        </div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-6 text-charcoal-900">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="font-bold text-lg font-serif">Menu Not Available</h2>
          <p className="text-xs text-charcoal-500">
            {error || 'This digital menu is currently in draft mode or cannot be found.'}
          </p>
          <div className="pt-2">
            <Link
              to="/m/saffron-garden"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              View Demo Menu (Saffron Garden)
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const restaurant = menu.restaurant;
  const menuTitle =
    lang === 'ur' && menu.translations?.ur?.title ? menu.translations.ur.title : menu.title;
  const menuDesc =
    lang === 'ur' && menu.translations?.ur?.description
      ? menu.translations.ur.description
      : menu.description;

  return (
    <div
      className="min-h-screen bg-cream-50 text-charcoal-900 selection:bg-emerald-100 selection:text-emerald-900 pb-20"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Restaurant Hero Cover Banner */}
      <header className="relative bg-charcoal-950 text-white overflow-hidden no-print">
        {restaurant?.cover_url && (
          <div className="absolute inset-0 opacity-30 mix-blend-overlay">
            <img
              src={restaurant.cover_url}
              alt=""
              className="w-full h-full object-cover filter blur-[1px]"
            />
          </div>
        )}

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6">
            {restaurant?.logo_url && (
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl shrink-0 bg-white">
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-tight text-white">
                  {restaurant?.name || 'Restaurant'}
                </h1>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Open for Dine-In & Takeout
                </span>
              </div>

              <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
                {restaurant?.description}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-stone-300 pt-1">
                {restaurant?.address && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    {restaurant.address}
                  </span>
                )}
                {restaurant?.phone && (
                  <a
                    href={`tel:${restaurant.phone}`}
                    className="flex items-center gap-1.5 hover:text-emerald-300 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    {restaurant.phone}
                  </a>
                )}
              </div>
            </div>

            {/* Quick Actions (QR & Print) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(true)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors shadow-sm"
                title="Scan QR Code"
              >
                <QrCode className="w-5 h-5 text-emerald-300" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/20 transition-colors shadow-sm"
                title="Print Menu"
              >
                <Printer className="w-5 h-5 text-stone-300" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Language Switcher & Search Bar Floating Toolbar */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs no-print">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Menu Title Indicator */}
          <div className="min-w-0">
            <h2
              className={`font-bold text-sm sm:text-base text-charcoal-900 truncate ${
                isRtl ? 'font-urdu' : 'font-serif'
              }`}
            >
              {menuTitle}
            </h2>
            {menuDesc && (
              <p
                className={`text-[11px] text-charcoal-500 line-clamp-1 ${
                  isRtl ? 'font-urdu' : ''
                }`}
              >
                {menuDesc}
              </p>
            )}
          </div>

          {/* Bilingual Switcher Pill */}
          <div className="flex items-center p-1 rounded-xl bg-stone-100 border border-stone-300 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`px-3.5 py-1.5 rounded-lg transition-all ${
                lang === 'en'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('ur')}
              className={`px-3.5 py-1.5 rounded-lg transition-all font-urdu ${
                lang === 'ur'
                  ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                  : 'text-charcoal-600 hover:text-charcoal-900'
              }`}
            >
              اردو (Urdu)
            </button>
          </div>
        </div>

        {/* Category Navigation Tabs (Horizontal Scroll) */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-2 overflow-x-auto flex items-center gap-2 scrollbar-none border-t border-stone-100">
          <button
            type="button"
            onClick={() => setActiveCategoryTab('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              activeCategoryTab === 'all'
                ? 'bg-charcoal-900 text-white shadow-xs'
                : 'bg-stone-100 text-charcoal-700 hover:bg-stone-200'
            }`}
          >
            {isRtl ? 'تمام پکوان (All)' : 'All Items'}
          </button>

          {menu.categories.map((cat) => {
            const catName =
              isRtl && cat.translations?.ur?.name ? cat.translations.ur.name : cat.name;
            const isActive = activeCategoryTab === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategoryTab(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isRtl ? 'font-urdu' : ''
                } ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 text-charcoal-700 hover:bg-stone-200'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute top-1/2 -translate-y-1/2 left-3 rtl:left-auto rtl:right-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isRtl ? 'کھانے تلاش کریں...' : 'Search dishes...'}
              className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          {/* Dietary Tags Pill Bar */}
          {allDietaryTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto scrollbar-none py-1">
              <button
                type="button"
                onClick={() => setSelectedTag('all')}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedTag === 'all'
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold'
                    : 'bg-white border border-stone-200 text-charcoal-600 hover:bg-stone-50'
                }`}
              >
                {isRtl ? 'سب' : 'All'}
              </button>
              {allDietaryTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(tag === selectedTag ? 'all' : tag)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white border border-stone-200 text-charcoal-600 hover:bg-stone-50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Sections */}
        {filteredCategories.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 p-8 space-y-2">
            <Utensils className="w-8 h-8 text-stone-400 mx-auto" />
            <h3 className="font-bold text-sm text-charcoal-800">No dishes match your filter</h3>
            <p className="text-xs text-charcoal-500">
              Try adjusting your search query or dietary filters.
            </p>
          </div>
        ) : (
          filteredCategories.map((cat) => {
            const catName =
              isRtl && cat.translations?.ur?.name ? cat.translations.ur.name : cat.name;
            const catDesc =
              isRtl && cat.translations?.ur?.description
                ? cat.translations.ur.description
                : cat.description;

            return (
              <section key={cat.id} className="space-y-4 pt-4">
                {/* Category Title */}
                <div className="border-b border-stone-200 pb-2">
                  <h3
                    className={`text-lg sm:text-xl font-bold text-charcoal-900 flex items-center gap-2 ${
                      isRtl ? 'font-urdu' : 'font-serif'
                    }`}
                  >
                    <span>{catName}</span>
                    <span className="text-xs text-emerald-700 font-mono font-normal">
                      ({cat.dishes.length})
                    </span>
                  </h3>
                  {catDesc && (
                    <p
                      className={`text-xs text-charcoal-500 mt-0.5 leading-relaxed ${
                        isRtl ? 'font-urdu' : ''
                      }`}
                    >
                      {catDesc}
                    </p>
                  )}
                </div>

                {/* Dishes Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {cat.dishes.map((dish) => {
                    const dishName =
                      isRtl && dish.translations?.ur?.name
                        ? dish.translations.ur.name
                        : dish.name;
                    const dishDesc =
                      isRtl && dish.translations?.ur?.description
                        ? dish.translations.ur.description
                        : dish.description;
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
                        className="bg-white rounded-2xl border border-stone-200/90 p-4 shadow-sm hover:shadow-md transition-shadow flex gap-4 print-card"
                      >
                        {dish.image_url && (
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shrink-0 border border-stone-200 bg-stone-100">
                            <img
                              src={dish.image_url}
                              alt={dishName}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h4
                                className={`font-bold text-sm sm:text-base text-charcoal-900 leading-snug truncate ${
                                  isRtl ? 'font-urdu text-base sm:text-lg' : ''
                                }`}
                              >
                                {dishName}
                              </h4>
                              <span className="text-xs sm:text-sm font-bold text-emerald-800 font-mono shrink-0">
                                {restaurant?.currency || 'PKR'} {dish.price}
                              </span>
                            </div>

                            {dishDesc && (
                              <p
                                className={`text-xs text-charcoal-600 mt-1 line-clamp-2 leading-relaxed ${
                                  isRtl ? 'font-urdu text-xs leading-loose' : ''
                                }`}
                              >
                                {dishDesc}
                              </p>
                            )}
                          </div>

                          {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2.5 pt-1">
                              {tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 text-charcoal-600 font-medium"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Dine-in Footer */}
      <footer className="mt-16 py-8 border-t border-stone-200 bg-stone-100/70 text-center text-xs text-charcoal-500 space-y-2 no-print">
        <div className="flex items-center justify-center gap-2">
          <Utensils className="w-4 h-4 text-emerald-700" />
          <span className="font-semibold text-charcoal-800">{restaurant?.name}</span>
        </div>
        <p className="text-[11px] text-charcoal-400">
          Powered by <strong>MenuMate AI</strong> & <strong>Google Gemma 2</strong>
        </p>
      </footer>

      {/* QR Code Modal for sharing with table friends */}
      <QRCodeModal
        isOpen={isQrModalOpen}
        menuTitle={menu.title}
        restaurantName={restaurant?.name || 'Restaurant'}
        slug={menu.slug}
        onClose={() => setIsQrModalOpen(false)}
      />
    </div>
  );
};

export default PublicMenuPage;
