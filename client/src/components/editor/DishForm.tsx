import { useEffect, useState, type FormEvent } from "react";
import { DIETARY_LABELS, DIETARY_LABEL_NAMES, dishInputSchema, type DietaryLabel, type DishInput } from "@shared";
import { fieldErrors } from "../../lib/format";
import { Button, Input, Textarea, cx } from "../ui";

export interface DishDraft {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  labels: DietaryLabel[];
  isAvailable: boolean;
}

export const emptyDishDraft: DishDraft = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  labels: [],
  isAvailable: true,
};

export function DishForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: DishDraft;
  submitLabel: string;
  busy?: boolean;
  onSubmit: (input: DishInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [draft, setDraft] = useState<DishDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const initialKey = JSON.stringify(initial);

  useEffect(() => {
    setDraft(initial);
    setErrors({});
    // Reset only when the saved values change, not on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  function toggleLabel(label: DietaryLabel) {
    setDraft((d) => ({
      ...d,
      labels: d.labels.includes(label) ? d.labels.filter((item) => item !== label) : [...d.labels, label],
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (draft.price.trim() === "") {
      setErrors({ price: "Price is required" });
      return;
    }
    const parsed = dishInputSchema.safeParse({
      name: draft.name,
      description: draft.description,
      price: Number(draft.price),
      imageUrl: draft.imageUrl,
      labels: draft.labels,
      isAvailable: draft.isAvailable,
    });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    await onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-charcoal-900/8 bg-cream-50 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Dish name" name="dish-name" required value={draft.name} error={errors.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} />
        <Input
          label="Price"
          name="dish-price"
          type="number"
          min={0}
          step="0.01"
          required
          value={draft.price}
          error={errors.price}
          hint="Stored as a number. Translation never changes it."
          onChange={(e) => setDraft({ ...draft, price: e.target.value })}
        />
      </div>
      <Textarea
        label="Description"
        name="dish-description"
        value={draft.description}
        error={errors.description}
        hint="Optional. Describe only what you actually serve."
        onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        maxLength={600}
      />
      <Input
        label="Image URL"
        name="dish-image"
        value={draft.imageUrl}
        error={errors.imageUrl}
        placeholder="https://"
        hint="Optional direct link. Leave blank to show a simple placeholder."
        onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
      />
      <fieldset>
        <legend className="label">Dietary labels</legend>
        <div className="flex flex-wrap gap-2">
          {DIETARY_LABELS.map((label) => {
            const on = draft.labels.includes(label);
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLabel(label)}
                className={cx(
                  "rounded-full border px-3 py-1 text-xs font-medium transition",
                  on ? "border-brand-600 bg-brand-50 text-brand-800" : "border-charcoal-900/12 bg-white text-charcoal-600 hover:border-charcoal-900/25",
                )}
              >
                {DIETARY_LABEL_NAMES[label]}
              </button>
            );
          })}
        </div>
      </fieldset>
      <label className="flex items-center gap-2 text-sm text-charcoal-700">
        <input type="checkbox" checked={draft.isAvailable} onChange={(e) => setDraft({ ...draft, isAvailable: e.target.checked })} className="size-4 accent-brand-600" />
        Available on the menu
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={busy}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
