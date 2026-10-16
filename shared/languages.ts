/**
 * Language registry. Add a new language here and it becomes available in the
 * editor, translation workflow, public menu switcher and PDF export.
 */
export type LanguageCode = "en" | "ur";

export interface LanguageInfo {
  code: LanguageCode;
  /** English name shown in selectors. */
  name: string;
  /** Name written in the language itself. */
  nativeName: string;
  /** Text direction used for layout. */
  dir: "ltr" | "rtl";
  /** Hint passed to the model so it can pick culturally natural wording. */
  promptName: string;
}

export const LANGUAGES: readonly LanguageInfo[] = [
  { code: "en", name: "English", nativeName: "English", dir: "ltr", promptName: "English" },
  { code: "ur", name: "Urdu", nativeName: "اردو", dir: "rtl", promptName: "Urdu (اردو), written in Perso-Arabic script" },
] as const;

export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code) as [LanguageCode, ...LanguageCode[]];

export function getLanguage(code: string): LanguageInfo {
  const found = LANGUAGES.find((l) => l.code === code);
  if (!found) throw new Error(`Unsupported language: ${code}`);
  return found;
}

export function isRtl(code: string): boolean {
  return LANGUAGES.find((l) => l.code === code)?.dir === "rtl";
}
