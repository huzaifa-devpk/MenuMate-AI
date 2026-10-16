import type { TranslatableField } from "./schemas";

/**
 * Pick the text to show for a menu field.
 * The default language always uses the source column. Other languages use an
 * approved translation when one exists, and fall back to the source text.
 */
export function resolveField(
  source: string | null | undefined,
  translations: Record<string, Partial<Record<TranslatableField, string>>> | undefined,
  field: TranslatableField,
  language: string,
  defaultLanguage: string,
): string {
  const original = source ?? "";
  if (language === defaultLanguage) return original;
  const value = translations?.[language]?.[field];
  if (typeof value === "string" && value.trim()) return value;
  return original;
}
