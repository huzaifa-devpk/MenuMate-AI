import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { LANGUAGES, type AiStatus, type Menu, type TranslateResponse } from "@shared";
import { api, errorMessage } from "../../lib/api";
import { Alert, Badge, Button, Select } from "../ui";

interface DraftItem {
  id: string;
  type: "category" | "dish";
  originalName: string;
  originalDescription: string | null;
  name: string;
  description: string;
}

export function TranslatePanel({ menu, onSaved }: { menu: Menu; onSaved: (menu: Menu) => void }) {
  const other = LANGUAGES.find((language) => language.code !== menu.defaultLanguage)?.code ?? "ur";
  const [sourceLanguage, setSourceLanguage] = useState(menu.defaultLanguage);
  const [targetLanguage, setTargetLanguage] = useState(other);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [busy, setBusy] = useState<"translate" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TranslateResponse | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<AiStatus>("/api/ai/status")
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    setSourceLanguage(menu.defaultLanguage);
    setTargetLanguage(LANGUAGES.find((language) => language.code !== menu.defaultLanguage)?.code ?? "ur");
    setResult(null);
    setDrafts([]);
    setSaved(false);
  }, [menu.id, menu.defaultLanguage]);

  async function translate() {
    setBusy("translate");
    setError(null);
    setSaved(false);
    try {
      const response = await api<TranslateResponse>("/api/ai/translate", {
        method: "POST",
        body: JSON.stringify({ menuId: menu.id, sourceLanguage, targetLanguage }),
      });
      setResult(response);
      setDrafts(
        response.items.map((item) => ({
          id: item.id,
          type: item.type,
          originalName: item.original.name,
          originalDescription: item.original.description,
          name: item.translated.name,
          description: item.translated.description ?? "",
        })),
      );
    } catch (err) {
      setResult(null);
      setDrafts([]);
      setError(errorMessage(err, "Gemma could not translate this menu. You can retry or edit the dishes yourself."));
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    setBusy("save");
    setError(null);
    try {
      const entries = drafts.flatMap((item) => {
        const rows: Array<{ entityType: "category" | "dish"; entityId: string; field: "name" | "description"; text: string }> = [
          { entityType: item.type, entityId: item.id, field: "name", text: item.name },
        ];
        if (item.type === "dish" && item.description.trim()) {
          rows.push({ entityType: item.type, entityId: item.id, field: "description", text: item.description });
        }
        return rows;
      });
      const next = await api<Menu>(`/api/menus/${menu.id}/translations`, {
        method: "PUT",
        body: JSON.stringify({ language: targetLanguage, entries }),
      });
      onSaved(next);
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, "Could not save the translations."));
    } finally {
      setBusy(null);
    }
  }

  const targetIsOriginal = targetLanguage === menu.defaultLanguage;

  return (
    <section className="card mt-6 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold text-charcoal-900">
            <Sparkles className="size-5 text-brand-600" aria-hidden /> Translate with Gemma
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-charcoal-500">
            Gemma drafts names and descriptions only. Prices, currency and which dish sits in which category stay as you saved them. Nothing is published until you review it.
          </p>
        </div>
        {result && (
          <Badge tone="info">
            AI draft · {result.model}
          </Badge>
        )}
      </div>

      {status && !status.configured && (
        <Alert tone="warn" title="API key needed" className="mt-4">
          Set <code className="font-mono">GEMMA_API_KEY</code> in the server <code className="font-mono">.env</code> file and restart. The demo menu, PDF and QR code still work without it. Create a key in Google AI Studio and keep it on the server only.
        </Alert>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <Select label="From" name="source-language" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value as typeof sourceLanguage)}>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </Select>
        <Select label="To" name="target-language" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value as typeof targetLanguage)}>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.name}
            </option>
          ))}
        </Select>
        <Button icon={Sparkles} loading={busy === "translate"} disabled={sourceLanguage === targetLanguage} onClick={() => void translate()}>
          Translate with Gemma
        </Button>
      </div>
      {sourceLanguage === targetLanguage && <p className="mt-2 text-xs text-charcoal-500">Choose two different languages.</p>}

      {error && (
        <Alert tone="error" className="mt-4">
          {error}
        </Alert>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <Alert tone="info" title="Review this AI-generated draft">
            Compare each line with your original and edit it before saving. Unsaved drafts are discarded when you leave this page.
            {result.missingIds.length > 0 ? ` ${result.missingIds.length} item${result.missingIds.length === 1 ? "" : "s"} came back unmatched and were left unchanged.` : ""}
          </Alert>
          <ul className="space-y-3">
            {drafts.map((item, index) => (
              <li key={item.id} className="grid gap-3 rounded-2xl border border-charcoal-900/8 p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-charcoal-400 uppercase">Original {item.type}</p>
                  <p className="mt-1 font-semibold text-charcoal-900">{item.originalName}</p>
                  {item.originalDescription && <p className="mt-1 text-sm text-charcoal-500">{item.originalDescription}</p>}
                </div>
                <div className="space-y-2">
                  <label className="label" htmlFor={`tr-name-${item.id}`}>
                    Gemma suggestion
                  </label>
                  <input
                    id={`tr-name-${item.id}`}
                    className="input"
                    dir={targetLanguage === "ur" ? "rtl" : "ltr"}
                    value={item.name}
                    onChange={(e) => setDrafts((current) => current.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)))}
                  />
                  {item.type === "dish" && (
                    <textarea
                      className="input min-h-[72px]"
                      dir={targetLanguage === "ur" ? "rtl" : "ltr"}
                      aria-label={`Description for ${item.originalName}`}
                      value={item.description}
                      onChange={(e) => setDrafts((current) => current.map((row, i) => (i === index ? { ...row, description: e.target.value } : row)))}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {targetIsOriginal ? (
            <Alert tone="warn">This menu is already written in that language. Edit the dishes above to change the original text. Saving a translation would not replace it.</Alert>
          ) : (
            <Button loading={busy === "save"} onClick={() => void save()} disabled={drafts.length === 0}>
              Save approved translations
            </Button>
          )}
          {saved && <Alert tone="success">Approved translations saved. Open the preview and switch language to see them on the menu.</Alert>}
        </div>
      )}
    </section>
  );
}
