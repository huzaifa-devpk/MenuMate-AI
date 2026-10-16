import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Menu } from "@shared";
import { MenuDisplay } from "../components/MenuDisplay";
import { Logo } from "../components/Layout";
import { ApiClientError, api, errorMessage } from "../lib/api";

export function PublicMenuPage() {
  const { slug = "" } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api<Menu>(`/api/public/menus/${encodeURIComponent(slug)}`)
      .then((data) => {
        if (cancelled) return;
        setMenu(data);
        setLanguage(data.defaultLanguage);
        document.title = `${data.restaurant.name} · Menu`;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) setError(err.message);
        else setError(errorMessage(err, "This menu could not be opened."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream-50 text-sm text-charcoal-500">
        Loading menu…
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="flex min-h-screen flex-col bg-cream-50">
        <div className="container-page py-6">
          <Logo />
        </div>
        <div className="container-page flex flex-1 items-center justify-center pb-20">
          <div className="card max-w-md px-8 py-12 text-center">
            <h1 className="text-2xl font-semibold text-charcoal-900">Menu unavailable</h1>
            <p className="mt-3 text-sm text-charcoal-600">{error ?? "This menu does not exist."}</p>
            <Link to="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-brand-600 px-4 text-sm font-medium text-white">
              MenuMate AI home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="container-page py-6 sm:py-10">
        <MenuDisplay menu={menu} language={language} onLanguageChange={setLanguage} />
        <footer className="mt-10 text-center text-xs text-charcoal-400">
          <Link to="/" className="hover:text-brand-700">
            Made with MenuMate AI
          </Link>
        </footer>
      </div>
    </div>
  );
}
