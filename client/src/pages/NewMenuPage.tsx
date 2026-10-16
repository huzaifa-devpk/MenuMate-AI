import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CURRENCIES, LANGUAGES, menuInputSchema, type Menu } from "@shared";
import { ApiClientError, api, errorMessage } from "../lib/api";
import { fieldErrors } from "../lib/format";
import { Alert, Button, ButtonLink, PageHeader, Select, Spinner, Input } from "../components/ui";

export function NewMenuPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [defaultLanguage, setDefaultLanguage] = useState("en");
  const [theme, setTheme] = useState("classic");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Create a menu · MenuMate AI";
    api("/api/restaurant")
      .then(() => setNeedsProfile(false))
      .catch((err: unknown) => {
        if (err instanceof ApiClientError && err.status === 404) setNeedsProfile(true);
        else setError(errorMessage(err, "Could not check your restaurant profile."));
      })
      .finally(() => setLoading(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = menuInputSchema.safeParse({ name, currency, defaultLanguage, theme });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setSaving(true);
    setError(null);
    try {
      const menu = await api<Menu>("/api/menus", { method: "POST", body: JSON.stringify(parsed.data) });
      navigate(`/menu/${menu.id}/edit`);
    } catch (err) {
      setError(errorMessage(err, "Could not create the menu."));
      setSaving(false);
    }
  }

  if (loading) return <Spinner label="Preparing the editor…" />;

  return (
    <div className="container-page animate-rise py-10">
      <PageHeader eyebrow="New menu" title="Create a menu" description="Choose the currency and the language you will write the dishes in. You can translate into another language later." />
      {needsProfile && (
        <Alert tone="warn" title="Restaurant profile needed" className="mb-6">
          Save your restaurant name and details on the dashboard before creating a menu.{" "}
          <ButtonLink to="/dashboard" size="sm" variant="secondary" className="mt-3">
            Go to dashboard
          </ButtonLink>
        </Alert>
      )}
      {error && (
        <Alert tone="error" className="mb-6">
          {error}
        </Alert>
      )}
      {!needsProfile && (
        <form onSubmit={submit} className="card mx-auto grid max-w-xl gap-4 p-6">
          <Input label="Menu name" name="name" required value={name} error={errors.name} placeholder="Dinner menu" onChange={(e) => setName(e.target.value)} maxLength={120} />
          <Select label="Currency" name="currency" value={currency} error={errors.currency} hint="Changing this later does not convert existing prices." onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.code} — {item.name}
              </option>
            ))}
          </Select>
          <Select label="Language you will write in" name="defaultLanguage" value={defaultLanguage} error={errors.defaultLanguage} onChange={(e) => setDefaultLanguage(e.target.value)}>
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select label="Theme" name="theme" value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="classic">Classic — elegant restaurant style</option>
            <option value="modern">Modern — clean and minimal</option>
          </Select>
          <div className="flex gap-2 pt-2">
            <Button type="submit" loading={saving}>
              Create menu
            </Button>
            <ButtonLink to="/dashboard" variant="ghost">
              Cancel
            </ButtonLink>
          </div>
        </form>
      )}
    </div>
  );
}
