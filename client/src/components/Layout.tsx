import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { Github, Menu as MenuIcon, X } from "lucide-react";
import { cx } from "./ui";

export const GITHUB_URL = "https://github.com/huzaifa-devpk/MenuMate-AI";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cx("flex items-center gap-2.5", className)} aria-label="MenuMate AI home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 shadow-sm">
        <svg viewBox="0 0 64 64" className="size-6" aria-hidden>
          <path d="M18 44V22l8 12 8-12v22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="46" cy="24" r="4.5" fill="#fff" />
          <path d="M42 44c0-6 2-10 4-12 2 2 4 6 4 12" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />
        </svg>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-charcoal-900">
        MenuMate <span className="text-brand-600">AI</span>
      </span>
    </Link>
  );
}

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/m/saffron-garden", label: "Demo menu" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-charcoal-900/6 bg-cream-50/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cx("rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-charcoal-900/6 text-charcoal-900" : "text-charcoal-600 hover:text-charcoal-900")
              }
            >
              {item.label}
            </NavLink>
          ))}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="ml-1 rounded-lg p-2 text-charcoal-600 hover:text-charcoal-900" aria-label="GitHub repository">
            <Github className="size-5" />
          </a>
          <Link to="/menu/new" className="ml-2 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700">
            Create Your Menu
          </Link>
        </nav>
        <button className="rounded-lg p-2 text-charcoal-700 md:hidden" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-charcoal-900/6 bg-cream-50 px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-charcoal-900/6">
                {item.label}
              </NavLink>
            ))}
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2 text-sm font-medium text-charcoal-700 hover:bg-charcoal-900/6">
              GitHub
            </a>
            <Link to="/menu/new" onClick={() => setOpen(false)} className="mt-2 inline-flex h-10 items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white">
              Create Your Menu
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-auto border-t border-charcoal-900/6 bg-cream-100/60">
      <div className="container-page grid gap-8 py-12 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-charcoal-500">
            Smart multilingual menu builder for small restaurants, cafés and home-based food businesses. Powered by the open-weight Gemma model.
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-charcoal-900">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
            <li><Link to="/dashboard" className="hover:text-brand-700">Dashboard</Link></li>
            <li><Link to="/menu/new" className="hover:text-brand-700">Create a menu</Link></li>
            <li><Link to="/m/saffron-garden" className="hover:text-brand-700">Demo menu — Saffron Garden</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold text-charcoal-900">Open source</h4>
          <ul className="mt-3 space-y-2 text-sm text-charcoal-600">
            <li>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand-700">
                <Github className="size-4" /> GitHub repository
              </a>
            </li>
            <li><a href={`${GITHUB_URL}/blob/main/README.md`} target="_blank" rel="noreferrer" className="hover:text-brand-700">Documentation</a></li>
            <li><a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="hover:text-brand-700">MIT License</a></li>
          </ul>
          <p className="mt-4 text-xs text-charcoal-400">Built for the Hacktoberfest 2026 DEV Open-Source AI Challenge.</p>
        </div>
      </div>
    </footer>
  );
}

/** Standard app shell with navbar and footer. Public menu pages use their own layout. */
export function AppLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
