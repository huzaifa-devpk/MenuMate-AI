import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Utensils, Sparkles, LayoutDashboard, Eye } from 'lucide-react';

export const Navbar: React.FC = () => {
  const location = useLocation();

  const isPublicMenu = location.pathname.startsWith('/m/');

  if (isPublicMenu) {
    return null; // Public digital menus have their own dedicated clean restaurant header
  }

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-700 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-emerald-700/20 group-hover:scale-105 transition-transform">
            <Utensils className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-charcoal-900 tracking-tight">MenuMate</span>
              <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300/60 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Gemma AI
              </span>
            </div>
            <p className="text-[10px] text-charcoal-500 font-medium tracking-wide">Smart Multilingual Restaurant Menu Builder</p>
          </div>
        </Link>

        {/* Center / Right Links */}
        <nav className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/m/saffron-garden"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-charcoal-700 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50/60 transition-colors"
          >
            <Eye className="w-4 h-4 text-emerald-600" />
            Live Demo
          </Link>

          <Link
            to="/dashboard"
            className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl border transition-all ${
              location.pathname === '/dashboard'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
                : 'bg-white text-charcoal-800 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-emerald-600" />
            Dashboard
          </Link>

          <Link
            to="/menu/new"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800 active:scale-95 shadow-sm shadow-emerald-800/20 transition-all"
          >
            + Create Menu
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
