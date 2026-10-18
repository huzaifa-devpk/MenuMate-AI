import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  QrCode,
  Languages,
  Utensils,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Smartphone,
  Eye,
  Layers,
  Zap,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const [activeDemoLang, setActiveDemoLang] = useState<'en' | 'ur'>('ur');

  return (
    <div className="min-h-screen bg-cream-50 text-charcoal-900 flex flex-col selection:bg-emerald-100 selection:text-emerald-900">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:py-24 border-b border-stone-200/60 bg-gradient-to-b from-emerald-50/40 via-cream-50 to-cream-50">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Gemma Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300/80 text-emerald-900 text-xs font-semibold shadow-sm animate-fade-in">
              <Sparkles className="w-4 h-4 text-emerald-700 animate-pulse" />
              <span>Powered by Google Gemma 2 Open Weights</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span className="text-emerald-800 font-mono">Bilingual AI</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-charcoal-950 font-serif leading-tight">
              Smart Multilingual Menus for{' '}
              <span className="bg-gradient-to-r from-emerald-800 via-emerald-600 to-teal-700 bg-clip-text text-transparent italic">
                Modern Restaurants
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg text-charcoal-700 font-normal leading-relaxed max-w-2xl mx-auto">
              Build stunning digital restaurant menus in minutes. Use <strong>Google Gemma</strong> to translate effortlessly into authentic <strong>Pakistani Nastaliq Urdu</strong> and generate table-ready QR codes for your diners.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                to="/m/saffron-garden"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm sm:text-base shadow-lg shadow-emerald-700/25 active:scale-95 transition-all group"
              >
                <Eye className="w-5 h-5 text-emerald-200" />
                <span>Explore Saffron Garden Demo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-stone-50 border border-stone-300 text-charcoal-800 font-semibold text-sm sm:text-base shadow-sm active:scale-95 transition-all"
              >
                <span>Restaurant Dashboard</span>
              </Link>
            </div>

            {/* Feature Checklist */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 pt-4 text-xs sm:text-sm text-charcoal-600 font-medium">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Fast & Mobile-First
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Authentic Urdu Nastaliq
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Table QR Codes
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Zero Diner App Installs
              </span>
            </div>
          </div>

          {/* Interactive Live Translation Demo Card */}
          <div className="mt-14 max-w-4xl mx-auto rounded-3xl glass-panel p-6 sm:p-8 shadow-xl border border-stone-200/80">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-stone-200 gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Live Gemma Translation Preview
                </span>
                <h3 className="text-xl sm:text-2xl font-bold font-serif text-charcoal-900 mt-1">
                  How Gemma Understands Culinary Nuance
                </h3>
              </div>

              {/* Language Switcher Pill */}
              <div className="flex items-center p-1 rounded-xl bg-stone-200/70 border border-stone-300 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setActiveDemoLang('en')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all ${
                    activeDemoLang === 'en'
                      ? 'bg-white text-charcoal-950 shadow-sm'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  English View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDemoLang('ur')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all font-urdu ${
                    activeDemoLang === 'ur'
                      ? 'bg-emerald-700 text-white shadow-sm font-semibold'
                      : 'text-charcoal-600 hover:text-charcoal-900'
                  }`}
                >
                  اردو ویو (Urdu)
                </button>
              </div>
            </div>

            {/* Demo Dish Cards */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 transition-all"
              dir={activeDemoLang === 'ur' ? 'rtl' : 'ltr'}
            >
              {/* Dish 1 */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                <img
                  src="https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=300&q=80"
                  alt="Chicken Karahi"
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold text-base text-charcoal-900 truncate ${
                        activeDemoLang === 'ur' ? 'font-urdu text-lg' : ''
                      }`}
                    >
                      {activeDemoLang === 'en' ? 'Chicken Karahi' : 'چکن کڑاہی'}
                    </h4>
                    <span className="text-xs font-bold text-emerald-800 font-mono">PKR 1,250</span>
                  </div>
                  <p
                    className={`text-xs text-charcoal-600 mt-1 line-clamp-2 leading-relaxed ${
                      activeDemoLang === 'ur' ? 'font-urdu text-sm leading-loose' : ''
                    }`}
                  >
                    {activeDemoLang === 'en'
                      ? 'Tender bone-in chicken simmered in rich tomato gravy, fresh ginger, green chillies, and freshly cracked black pepper.'
                      : 'ٹماٹر، باریک کٹی ادرک، ہری مرچ اور تازہ کالی مرچ میں بھنی ہوئی لاجواب روایتی چکن کڑاہی۔'}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      Chef Special
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
                      Spicy
                    </span>
                  </div>
                </div>
              </div>

              {/* Dish 2 */}
              <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                <img
                  src="https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80"
                  alt="Dum Biryani"
                  className="w-20 h-20 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4
                      className={`font-bold text-base text-charcoal-900 truncate ${
                        activeDemoLang === 'ur' ? 'font-urdu text-lg' : ''
                      }`}
                    >
                      {activeDemoLang === 'en' ? 'Chicken Biryani' : 'چکن بریانی'}
                    </h4>
                    <span className="text-xs font-bold text-emerald-800 font-mono">PKR 450</span>
                  </div>
                  <p
                    className={`text-xs text-charcoal-600 mt-1 line-clamp-2 leading-relaxed ${
                      activeDemoLang === 'ur' ? 'font-urdu text-sm leading-loose' : ''
                    }`}
                  >
                    {activeDemoLang === 'en'
                      ? 'Fragrant long-grain aged basmati layered with marinated chicken, saffron milk, caramelized onions, and whole spices.'
                      : 'زعفران، تلی ہوئی پیاز اور خوشبودار مسالوں میں دم دی گئی شاہی چکن بریانی۔'}
                  </p>
                  <div className="flex gap-1.5 mt-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                      Halal
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                      Popular
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-charcoal-500 gap-3">
              <p>
                Notice how Gemma preserves proper culinary terminology instead of crude literal word-for-word translation.
              </p>
              <Link
                to="/m/saffron-garden"
                className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center gap-1 shrink-0"
              >
                View Complete 4-Course Menu <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="py-16 md:py-24 bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs uppercase font-bold text-emerald-700 tracking-wider">
              Built for Hospitality
            </span>
            <h2 className="text-3xl font-extrabold font-serif text-charcoal-900">
              Everything Your Restaurant Needs to Go Multilingual
            </h2>
            <p className="text-sm text-charcoal-600">
              From street-side food stalls to high-end fine dining, MenuMate AI solves the multilingual menu hurdle without agencies or expensive printing costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-cream-50/70 border border-stone-200/80 space-y-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-sm">
                <Sparkles className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-bold text-lg text-charcoal-900 font-serif">
                Gemma 2 Open Weight AI
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Powered by Google Gemma 2 models (via Google AI Studio or Groq Cloud). Gemma is trained to understand contextual culinary concepts, local idioms, and Nastaliq script.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-cream-50/70 border border-stone-200/80 space-y-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-sm">
                <QrCode className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-bold text-lg text-charcoal-900 font-serif">
                Instant Table QR Codes
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Generate custom high-resolution SVG & PNG QR codes for table tents and coasters. Diners scan with their default camera app to open an instantaneous digital menu.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-cream-50/70 border border-stone-200/80 space-y-4 hover:border-emerald-300 transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-sm">
                <ChefHat className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="font-bold text-lg text-charcoal-900 font-serif">
                Gemma Chef Copywriter
              </h3>
              <p className="text-xs sm:text-sm text-charcoal-600 leading-relaxed">
                Stuck on dish descriptions? Input a few key spices and cooking techniques, and Gemma generates concise, mouthwatering descriptions without hallucinating fake ingredients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-charcoal-950 text-stone-300 text-xs border-t border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Utensils className="w-4 h-4" />
            </div>
            <span className="font-bold text-sm text-white">MenuMate AI</span>
            <span className="text-stone-500">| Powered by Google Gemma</span>
          </div>

          <div className="flex items-center gap-4 text-stone-400">
            <Link to="/m/saffron-garden" className="hover:text-emerald-400 transition-colors">
              Saffron Garden Demo
            </Link>
            <Link to="/dashboard" className="hover:text-emerald-400 transition-colors">
              Dashboard
            </Link>
            <Link to="/menu/new" className="hover:text-emerald-400 transition-colors">
              Create Menu
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
