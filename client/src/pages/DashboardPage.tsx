import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, FileDown, Plus, Store, Trash2 } from "lucide-react";
import { CURRENCIES, LANGUAGES, restaurantInputSchema, type Menu, type MenuSummary, type Restaurant } from "@shared";
import { ApiClientError, api, downloadPdf, errorMessage } from "../lib/api";
import { fieldErrors, formatWhen } from "../lib/format";
import { Alert, Badge, Button, ButtonLink, EmptyState, Input, PageHeader, Spinner, Textarea } from "../components/ui";

interface RestaurantForm {
  name: string;
  description: string;
  logoUrl: string;
  coverImageUrl: string;
  phone: string;
  email: string;
  address: string;
  website: string;
}

const emptyForm: RestaurantForm = {
  name: "",
  description: "",
  logoUrl: "",
  coverImageUrl: "",
  phone: "",
  email: "",
  address: "",
  website: "",
};

function toForm(restaurant: Restaurant): RestaurantForm {
  return {
    name: restaurant.name,
    description: restaurant.description ?? "",
    logoUrl: restaurant.logoUrl ?? "",
    coverImageUrl: restaurant.coverImageUrl ?? "",
    phone: restaurant.phone ?? "",
    email: restaurant.email ?? "",
    address: restaurant.address ?? "",
    website: restaurant.website ?? "",
  };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RestaurantForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [menus, setMenus] = useState<MenuSummary[]>([]);
  const [hasRestaurant, setHasRestaurant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [restaurantResult, menuResult] = await Promise.allSettled([api<Restaurant>("/api/restaurant"), api<MenuSummary[]>("/api/menus")]);
      if (restaurantResult.status === "fulfilled") {
        setForm(toForm(restaurantResult.value));
        setHasRestaurant(true);
      } else if (restaurantResult.reason instanceof ApiClientError && restaurantResult.reason.status === 404) {
        setHasRestaurant(false);
      } else {
        throw restaurantResult.reason;
      }
      if (menuResult.status === "fulfilled") setMenus(menuResult.value);
      else throw menuResult.reason;
    } catch (err) {
      setError(errorMessage(err, "Could not load the dashboard."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = "Dashboard · MenuMate AI";
    void load();
  }, []);

  function update<K extends keyof RestaurantForm>(key: K, value: RestaurantForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const parsed = restaurantInputSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const saved = await api<Restaurant>("/api/restaurant", { method: "PUT", body: JSON.stringify(parsed.data) });
      setForm(toForm(saved));
      setHasRestaurant(true);
      setNotice("Restaurant profile saved.");
    } catch (err) {
      setError(errorMessage(err, "Could not save the restaurant profile."));
    } finally {
      setSaving(false);
    }
  }

  async function duplicateMenu(menu: MenuSummary) {
    setError(null);
    try {
      const copy = await api<Menu>(`/api/menus/${menu.id}/duplicate`, { method: "POST" });
      navigate(`/menu/${copy.id}/edit`);
    } catch (err) {
      setError(errorMessage(err, "Could not duplicate that menu."));
    }
  }

  async function downloadMenu(menu: MenuSummary) {
    setError(null);
    try {
      await downloadPdf(menu.id, menu.defaultLanguage, `${menu.slug}-${menu.defaultLanguage}.pdf`);
    } catch (err) {
      setError(errorMessage(err, "Could not download the PDF."));
    }
  }

  async function deleteMenu(menu: MenuSummary) {
    if (!window.confirm(`Delete “${menu.name}”? Dishes and translations on this menu will be removed.`)) return;
    setDeletingId(menu.id);
    setError(null);
    try {
      await api<void>(`/api/menus/${menu.id}`, { method: "DELETE" });
      setMenus((current) => current.filter((item) => item.id !== menu.id));
    } catch (err) {
      setError(errorMessage(err, "Could not delete that menu."));
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <Spinner label="Loading your dashboard…" />;

  return (
    <div className="container-page animate-rise py-10">
      <PageHeader
        eyebrow="Workspace"
        title="Your restaurant"
        description="One local profile for your menus. This copy of MenuMate AI does not have user accounts, so do not put it on the public internet until you add authentication."
        actions={
          hasRestaurant ? (
            <ButtonLink to="/menu/new" icon={Plus}>
              Create a menu
            </ButtonLink>
          ) : undefined
        }
      />

      {error && (
        <Alert tone="error" title="Something went wrong" className="mb-6">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-6">
          {notice}
        </Alert>
      )}

      <form onSubmit={saveProfile} className="card grid gap-4 p-6">
        <div>
          <h2 className="text-xl font-semibold text-charcoal-900">Restaurant profile</h2>
          <p className="mt-1 text-sm text-charcoal-500">Shown at the top of your digital menu, PDF and QR page.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Restaurant name" name="name" required value={form.name} error={errors.name} onChange={(e) => update("name", e.target.value)} maxLength={120} />
          <Input label="Phone" name="phone" value={form.phone} error={errors.phone} onChange={(e) => update("phone", e.target.value)} maxLength={40} />
          <div className="sm:col-span-2">
            <Textarea label="Short description" name="description" value={form.description} error={errors.description} onChange={(e) => update("description", e.target.value)} maxLength={600} />
          </div>
          <Input label="Location" name="address" value={form.address} error={errors.address} placeholder="Lahore" onChange={(e) => update("address", e.target.value)} maxLength={240} />
          <Input label="Email" name="email" type="email" value={form.email} error={errors.email} onChange={(e) => update("email", e.target.value)} />
          <Input label="Logo URL" name="logoUrl" value={form.logoUrl} error={errors.logoUrl} placeholder="https://" hint="Optional http(s) image link." onChange={(e) => update("logoUrl", e.target.value)} />
          <Input label="Cover image URL" name="coverImageUrl" value={form.coverImageUrl} error={errors.coverImageUrl} placeholder="https://" onChange={(e) => update("coverImageUrl", e.target.value)} />
          <div className="sm:col-span-2">
            <Input label="Website" name="website" value={form.website} error={errors.website} placeholder="https://" onChange={(e) => update("website", e.target.value)} />
          </div>
        </div>
        <div>
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>

      <section className="mt-12">
        <div className="mb-4 flex items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold text-charcoal-900">Menus</h2>
          <p className="text-sm text-charcoal-500">{menus.length === 0 ? "None yet" : `${menus.length} saved`}</p>
        </div>
        {menus.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No menus yet"
            description={hasRestaurant ? "Create your first menu, then add categories, dishes and prices." : "Save a restaurant profile first, then create a menu."}
            action={hasRestaurant ? <ButtonLink to="/menu/new" icon={Plus}>Create a menu</ButtonLink> : undefined}
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {menus.map((menu) => {
              const language = LANGUAGES.find((item) => item.code === menu.defaultLanguage)?.name ?? menu.defaultLanguage;
              const currency = CURRENCIES.find((item) => item.code === menu.currency)?.code ?? menu.currency;
              return (
                <li key={menu.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-semibold text-charcoal-900">{menu.name}</h3>
                    <div className="flex gap-1.5">
                      {menu.isDemo && <Badge tone="warn">Sample</Badge>}
                      <Badge tone={menu.isPublished ? "brand" : "neutral"}>{menu.isPublished ? "Published" : "Draft"}</Badge>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-charcoal-600">
                    {currency} · {language} · {menu.theme === "modern" ? "Modern" : "Classic"}
                  </p>
                  <p className="mt-1 text-sm text-charcoal-500">
                    {menu.categoryCount} {menu.categoryCount === 1 ? "category" : "categories"} · {menu.dishCount} {menu.dishCount === 1 ? "dish" : "dishes"}
                  </p>
                  <p className="mt-1 text-xs text-charcoal-400">Updated {formatWhen(menu.updatedAt)}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <ButtonLink to={`/menu/${menu.id}/edit`} size="sm">
                      Edit
                    </ButtonLink>
                    <ButtonLink to={`/menu/${menu.id}/preview`} size="sm" variant="outline">
                      Preview
                    </ButtonLink>
                    <ButtonLink to={`/menu/${menu.id}/qr`} size="sm" variant="outline">
                      QR code
                    </ButtonLink>
                    <Button size="sm" variant="outline" icon={FileDown} onClick={() => void downloadMenu(menu)}>
                      PDF
                    </Button>
                    {menu.isDemo && (
                      <Button size="sm" variant="secondary" icon={Copy} onClick={() => void duplicateMenu(menu)}>
                        Duplicate
                      </Button>
                    )}
                    {!menu.isDemo && (
                      <Button size="sm" variant="ghost" icon={Trash2} loading={deletingId === menu.id} onClick={() => void deleteMenu(menu)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
