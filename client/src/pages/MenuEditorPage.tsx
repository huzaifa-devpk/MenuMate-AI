import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, Plus, Trash2 } from "lucide-react";
import {
  CURRENCIES,
  LANGUAGES,
  categoryInputSchema,
  formatPrice,
  menuUpdateSchema,
  type Dish,
  type DishInput,
  type Menu,
} from "@shared";
import { DishForm, emptyDishDraft, type DishDraft } from "../components/editor/DishForm";
import { TranslatePanel } from "../components/editor/TranslatePanel";
import { Alert, Badge, Button, ButtonLink, Input, PageHeader, Select, Spinner } from "../components/ui";
import { api, errorMessage } from "../lib/api";
import { fieldErrors } from "../lib/format";

function dishToDraft(dish: Dish): DishDraft {
  return {
    name: dish.name,
    description: dish.description ?? "",
    price: String(dish.price),
    imageUrl: dish.imageUrl ?? "",
    labels: dish.labels,
    isAvailable: dish.isAvailable,
  };
}

function moveId(ids: string[], index: number, direction: -1 | 1): string[] | null {
  const next = index + direction;
  if (next < 0 || next >= ids.length) return null;
  const copy = ids.slice();
  const [item] = copy.splice(index, 1);
  copy.splice(next, 0, item!);
  return copy;
}

export function MenuEditorPage() {
  const { id = "" } = useParams();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settings, setSettings] = useState({ name: "", currency: "PKR", defaultLanguage: "en", theme: "classic" });
  const [settingErrors, setSettingErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [addingDish, setAddingDish] = useState(false);
  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const pendingSelection = useRef<string | null>(null);

  const applyMenu = useCallback((next: Menu, keepSelection?: string | null) => {
    setMenu(next);
    setSettings({
      name: next.name,
      currency: next.currency,
      defaultLanguage: next.defaultLanguage,
      theme: next.theme,
    });
    setSelectedId((current) => {
      const preferred = keepSelection ?? current;
      if (preferred && next.categories.some((category) => category.id === preferred)) return preferred;
      return next.categories[0]?.id ?? null;
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await api<Menu>(`/api/menus/${id}`);
      applyMenu(data);
      document.title = `Edit ${data.name} · MenuMate AI`;
    } catch (err) {
      setLoadError(errorMessage(err, "Could not open this menu."));
    } finally {
      setLoading(false);
    }
  }, [applyMenu, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = menu?.categories.find((category) => category.id === selectedId) ?? null;

  useEffect(() => {
    setCategoryName(selected?.name ?? "");
    setAddingDish(false);
    setEditingDishId(null);
  }, [selected?.id, selected?.name]);

  async function run(key: string, action: () => Promise<Menu | void>, success?: string): Promise<boolean> {
    setBusy(key);
    setActionError(null);
    setNotice(null);
    try {
      const next = await action();
      if (next) {
        const select = pendingSelection.current;
        pendingSelection.current = null;
        applyMenu(next, select ?? selectedId);
      }
      if (success) setNotice(success);
      return true;
    } catch (err) {
      pendingSelection.current = null;
      setActionError(errorMessage(err));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    const parsed = menuUpdateSchema.safeParse(settings);
    if (!parsed.success) {
      setSettingErrors(fieldErrors(parsed.error));
      return;
    }
    setSettingErrors({});
    await run("settings", () => api<Menu>(`/api/menus/${id}`, { method: "PATCH", body: JSON.stringify(parsed.data) }), "Menu settings saved.");
  }

  async function addCategory(event: FormEvent) {
    event.preventDefault();
    const parsed = categoryInputSchema.safeParse({ name: newCategory });
    if (!parsed.success) {
      setActionError(parsed.error.issues[0]?.message ?? "Category name is required");
      return;
    }
    const ok = await run(
      "add-category",
      async () => {
        const next = await api<Menu>(`/api/menus/${id}/categories`, { method: "POST", body: JSON.stringify(parsed.data) });
        const created = next.categories.find((category) => !menu?.categories.some((existing) => existing.id === category.id));
        if (created) pendingSelection.current = created.id;
        return next;
      },
      "Category added.",
    );
    if (ok) setNewCategory("");
  }

  if (loading) return <Spinner label="Loading menu editor…" />;
  if (loadError || !menu) {
    return (
      <div className="container-page py-16">
        <Alert tone="error" title="Menu unavailable">
          {loadError ?? "This menu does not exist."}
        </Alert>
        <ButtonLink to="/dashboard" className="mt-6" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>
    );
  }

  const readOnly = menu.isDemo;

  return (
    <div className="container-page animate-rise py-10">
      <PageHeader
        eyebrow="Menu editor"
        title={menu.name}
        description="Add categories and dishes. Prices stay numeric and are never rewritten by translation."
        actions={
          <>
            {menu.isDemo && <Badge tone="warn">Sample</Badge>}
            <Badge tone={menu.isPublished ? "brand" : "neutral"}>{menu.isPublished ? "Published" : "Draft"}</Badge>
            <ButtonLink to={`/menu/${menu.id}/preview`} variant="outline" icon={Eye}>
              Preview
            </ButtonLink>
          </>
        }
      />

      {readOnly && (
        <Alert tone="warn" title="Sample menu" className="mb-6">
          Saffron Garden is a fictional demo. It stays read-only so the public sample is not overwritten.
        </Alert>
      )}
      {actionError && (
        <Alert tone="error" className="mb-6">
          {actionError}
        </Alert>
      )}
      {notice && (
        <Alert tone="success" className="mb-6">
          {notice}
        </Alert>
      )}

      <form onSubmit={saveSettings} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Input label="Menu name" name="menu-name" value={settings.name} error={settingErrors.name} disabled={readOnly} onChange={(e) => setSettings({ ...settings, name: e.target.value })} />
        <Select label="Currency" name="currency" value={settings.currency} disabled={readOnly} hint="Does not convert prices." onChange={(e) => setSettings({ ...settings, currency: e.target.value })}>
          {CURRENCIES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.code}
            </option>
          ))}
        </Select>
        <Select label="Written in" name="defaultLanguage" value={settings.defaultLanguage} disabled={readOnly} onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}>
          {LANGUAGES.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select label="Theme" name="theme" value={settings.theme} disabled={readOnly} onChange={(e) => setSettings({ ...settings, theme: e.target.value })}>
          <option value="classic">Classic</option>
          <option value="modern">Modern</option>
        </Select>
        {!readOnly && (
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" loading={busy === "settings"}>
              Save settings
            </Button>
          </div>
        )}
      </form>

      {!readOnly && <TranslatePanel menu={menu} onSaved={(next) => applyMenu(next, selectedId)} />}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card p-4">
          <h2 className="text-sm font-semibold tracking-wide text-charcoal-500 uppercase">Categories</h2>
          {menu.categories.length === 0 ? (
            <p className="mt-3 text-sm text-charcoal-500">Add a category such as Starters, Main Course or Drinks.</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {menu.categories.map((category, index) => (
                <li key={category.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(category.id)}
                    className={`min-w-0 flex-1 truncate rounded-lg px-2.5 py-2 text-left text-sm font-medium ${selectedId === category.id ? "bg-brand-50 text-brand-800" : "text-charcoal-700 hover:bg-charcoal-900/5"}`}
                  >
                    {category.name}
                    <span className="ml-1 text-xs font-normal text-charcoal-400">{category.dishes.length}</span>
                  </button>
                  {!readOnly && (
                    <>
                      <button type="button" className="rounded-md p-1 text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30" aria-label={`Move ${category.name} up`} disabled={index === 0 || busy !== null} onClick={() => {
                        const ordered = moveId(menu.categories.map((item) => item.id), index, -1);
                        if (ordered) void run("reorder-cat", () => api<Menu>(`/api/menus/${id}/categories/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds: ordered }) }));
                      }}>
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button type="button" className="rounded-md p-1 text-charcoal-400 hover:text-charcoal-800 disabled:opacity-30" aria-label={`Move ${category.name} down`} disabled={index === menu.categories.length - 1 || busy !== null} onClick={() => {
                        const ordered = moveId(menu.categories.map((item) => item.id), index, 1);
                        if (ordered) void run("reorder-cat", () => api<Menu>(`/api/menus/${id}/categories/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds: ordered }) }));
                      }}>
                        <ArrowDown className="size-3.5" />
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!readOnly && (
            <form onSubmit={addCategory} className="mt-4 flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Input name="new-category" aria-label="New category name" placeholder="New category" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} maxLength={80} />
              </div>
              <Button type="submit" size="md" loading={busy === "add-category"} aria-label="Add category">
                <Plus className="size-4" />
              </Button>
            </form>
          )}
        </aside>

        <section className="card p-5">
          {!selected ? (
            <p className="text-sm text-charcoal-500">Select or create a category to add dishes.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {readOnly ? (
                    <h2 className="text-2xl font-semibold text-charcoal-900">{selected.name}</h2>
                  ) : (
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const parsed = categoryInputSchema.safeParse({ name: categoryName });
                        if (!parsed.success) {
                          setActionError(parsed.error.issues[0]?.message ?? "Category name is required");
                          return;
                        }
                        void run("rename-category", () => api<Menu>(`/api/menus/${id}/categories/${selected.id}`, { method: "PATCH", body: JSON.stringify(parsed.data) }), "Category renamed.");
                      }}
                    >
                      <div className="min-w-[200px] flex-1">
                        <Input label="Category name" name="category-name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} maxLength={80} />
                      </div>
                      <Button type="submit" variant="secondary" loading={busy === "rename-category"}>
                        Rename
                      </Button>
                    </form>
                  )}
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={Trash2}
                    loading={busy === "delete-category"}
                    onClick={() => {
                      if (!window.confirm(`Delete “${selected.name}” and its dishes?`)) return;
                      void run("delete-category", () => api<Menu>(`/api/menus/${id}/categories/${selected.id}`, { method: "DELETE" }), "Category deleted.");
                    }}
                  >
                    Delete category
                  </Button>
                )}
              </div>

              {selected.dishes.length === 0 && !addingDish ? (
                <p className="mt-6 text-sm text-charcoal-500">No dishes in this category yet.</p>
              ) : (
                <ul className="mt-6 space-y-3">
                  {selected.dishes.map((dish, index) => (
                    <li key={dish.id} className="rounded-2xl border border-charcoal-900/8 bg-white p-4">
                      {editingDishId === dish.id ? (
                        <DishForm
                          initial={dishToDraft(dish)}
                          submitLabel="Save dish"
                          busy={busy === `dish-${dish.id}`}
                          assist={{ language: menu.defaultLanguage, categoryName: selected.name }}
                          onCancel={() => setEditingDishId(null)}
                          onSubmit={async (input: DishInput) => {
                            const ok = await run(`dish-${dish.id}`, () => api<Menu>(`/api/menus/${id}/dishes/${dish.id}`, { method: "PATCH", body: JSON.stringify(input) }), "Dish saved.");
                            if (ok) setEditingDishId(null);
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-charcoal-900">{dish.name}</p>
                            {dish.description && <p className="mt-1 text-sm text-charcoal-500">{dish.description}</p>}
                            <p className="price mt-1 text-sm font-semibold text-brand-700">{formatPrice(dish.price, menu.currency)}</p>
                          </div>
                          {!readOnly && (
                            <div className="flex flex-wrap gap-1">
                              <Button size="sm" variant="outline" onClick={() => setEditingDishId(dish.id)}>
                                Edit
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`Move ${dish.name} up`} disabled={index === 0 || busy !== null} onClick={() => {
                                const ordered = moveId(selected.dishes.map((item) => item.id), index, -1);
                                if (ordered) void run("reorder-dish", () => api<Menu>(`/api/menus/${id}/categories/${selected.id}/dishes/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds: ordered }) }));
                              }}>
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button size="sm" variant="ghost" aria-label={`Move ${dish.name} down`} disabled={index === selected.dishes.length - 1 || busy !== null} onClick={() => {
                                const ordered = moveId(selected.dishes.map((item) => item.id), index, 1);
                                if (ordered) void run("reorder-dish", () => api<Menu>(`/api/menus/${id}/categories/${selected.id}/dishes/reorder`, { method: "PUT", body: JSON.stringify({ orderedIds: ordered }) }));
                              }}>
                                <ArrowDown className="size-4" />
                              </Button>
                              <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Delete ${dish.name}`} loading={busy === `delete-${dish.id}`} onClick={() => {
                                if (!window.confirm(`Delete “${dish.name}”?`)) return;
                                void run(`delete-${dish.id}`, () => api<Menu>(`/api/menus/${id}/dishes/${dish.id}`, { method: "DELETE" }), "Dish deleted.");
                              }}>
                                Delete
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {!readOnly && (
                <div className="mt-5">
                  {addingDish ? (
                    <DishForm
                      initial={emptyDishDraft}
                      submitLabel="Add dish"
                      busy={busy === "add-dish"}
                      assist={{ language: menu.defaultLanguage, categoryName: selected.name }}
                      onCancel={() => setAddingDish(false)}
                      onSubmit={async (input) => {
                        const ok = await run("add-dish", () => api<Menu>(`/api/menus/${id}/categories/${selected.id}/dishes`, { method: "POST", body: JSON.stringify(input) }), "Dish added.");
                        if (ok) setAddingDish(false);
                      }}
                    />
                  ) : (
                    <Button variant="secondary" icon={Plus} onClick={() => setAddingDish(true)}>
                      Add dish
                    </Button>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
