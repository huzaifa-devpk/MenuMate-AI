import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Menu } from "@shared";
import { MenuDisplay } from "../components/MenuDisplay";
import { Alert, ButtonLink, Spinner } from "../components/ui";
import { api, errorMessage } from "../lib/api";

export function PreviewPage() {
  const { id = "" } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [language, setLanguage] = useState("en");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<Menu>(`/api/menus/${id}`)
      .then((data) => {
        if (cancelled) return;
        setMenu(data);
        setLanguage(data.defaultLanguage);
        document.title = `Preview · ${data.name} · MenuMate AI`;
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, "Could not open this menu."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <Spinner label="Loading preview…" />;
  if (error || !menu) {
    return (
      <div className="container-page py-16">
        <Alert tone="error" title="Preview unavailable">
          {error ?? "This menu does not exist."}
        </Alert>
        <ButtonLink to="/dashboard" className="mt-6" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="bg-cream-100/40 py-8">
      <div className="container-page">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-charcoal-600">
            Preview of <span className="font-semibold text-charcoal-900">{menu.name}</span>
            {menu.isPublished ? " · published" : " · not published yet"}
          </p>
          <div className="flex gap-2">
            <ButtonLink to={`/menu/${menu.id}/edit`} size="sm" variant="outline">
              Back to editor
            </ButtonLink>
            <Link to="/dashboard" className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-charcoal-600 hover:bg-charcoal-900/6">
              Dashboard
            </Link>
          </div>
        </div>
        <MenuDisplay menu={menu} language={language} onLanguageChange={setLanguage} />
      </div>
    </div>
  );
}
