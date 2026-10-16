import { z } from "zod";
import { CURRENCY_CODES } from "./currency";
import { LANGUAGE_CODES } from "./languages";

/* ---------------------------------------------------------------------------
 * Primitive helpers
 * ------------------------------------------------------------------------- */

const trimmed = (max: number) => z.string().trim().max(max);

/** Only http(s) URLs are accepted; everything else is rejected. */
export const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === "" || /^https?:\/\/[^\s]+$/i.test(v), { message: "Must be an http(s) URL" })
  .optional()
  .nullable()
  .transform((v) => (v ? v : null));

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const idSchema = z.string().min(1).max(64);

export const currencySchema = z.enum(CURRENCY_CODES);
export const languageSchema = z.enum(LANGUAGE_CODES);
export const themeSchema = z.enum(["classic", "modern"]);

/** Prices are numeric, non-negative, and limited to two decimals. */
export const priceSchema = z
  .number({ message: "Price must be a number" })
  .finite()
  .min(0, "Price cannot be negative")
  .max(10_000_000, "Price is too large")
  .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, {
    message: "Price can have at most two decimals",
  });

export const DIETARY_LABELS = [
  "vegetarian",
  "vegan",
  "spicy",
  "halal",
  "gluten-free",
  "nut-free",
  "chef-special",
] as const;
export type DietaryLabel = (typeof DIETARY_LABELS)[number];
export const dietaryLabelSchema = z.enum(DIETARY_LABELS);

/* ---------------------------------------------------------------------------
 * Restaurant
 * ------------------------------------------------------------------------- */

export const restaurantInputSchema = z.object({
  name: trimmed(120).min(1, "Restaurant name is required"),
  description: optionalText(600),
  logoUrl: optionalUrl,
  coverImageUrl: optionalUrl,
  phone: optionalText(40),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || z.email().safeParse(v).success, { message: "Invalid email" })
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  address: optionalText(240),
  website: optionalUrl,
});
export type RestaurantInput = z.infer<typeof restaurantInputSchema>;

export interface Restaurant extends RestaurantInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/* ---------------------------------------------------------------------------
 * Menu, categories, dishes
 * ------------------------------------------------------------------------- */

export const menuInputSchema = z.object({
  name: trimmed(120).min(1, "Menu name is required"),
  currency: currencySchema,
  defaultLanguage: languageSchema,
  theme: themeSchema.default("classic"),
});
export type MenuInput = z.infer<typeof menuInputSchema>;

export const menuUpdateSchema = z.object({
  name: trimmed(120).min(1, "Menu name is required").optional(),
  currency: currencySchema.optional(),
  defaultLanguage: languageSchema.optional(),
  theme: themeSchema.optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug may contain lowercase letters, numbers and hyphens")
    .optional(),
});
export type MenuUpdate = z.infer<typeof menuUpdateSchema>;

export const categoryInputSchema = z.object({
  name: trimmed(80).min(1, "Category name is required"),
});
export type CategoryInput = z.infer<typeof categoryInputSchema>;

export const dishInputSchema = z.object({
  name: trimmed(120).min(1, "Dish name is required"),
  description: optionalText(600),
  price: priceSchema,
  imageUrl: optionalUrl,
  labels: z.array(dietaryLabelSchema).max(DIETARY_LABELS.length).default([]),
  isAvailable: z.boolean().default(true),
});
export type DishInput = z.infer<typeof dishInputSchema>;

export const reorderSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(500),
});

/* ---------------------------------------------------------------------------
 * Translations
 * ------------------------------------------------------------------------- */

export const translatableEntitySchema = z.enum(["category", "dish"]);
export type TranslatableEntity = z.infer<typeof translatableEntitySchema>;

export const translatableFieldSchema = z.enum(["name", "description"]);
export type TranslatableField = z.infer<typeof translatableFieldSchema>;

/** A single approved translation stored in the database. */
export interface Translation {
  entityType: TranslatableEntity;
  entityId: string;
  language: string;
  field: TranslatableField;
  text: string;
  status: "ai_draft" | "approved";
}

export const saveTranslationsSchema = z.object({
  language: languageSchema,
  entries: z
    .array(
      z.object({
        entityType: translatableEntitySchema,
        entityId: idSchema,
        field: translatableFieldSchema,
        text: z.string().trim().max(1000),
      }),
    )
    .max(1000),
});
export type SaveTranslationsInput = z.infer<typeof saveTranslationsSchema>;

/* ---------------------------------------------------------------------------
 * Full menu shape returned by the API
 * ------------------------------------------------------------------------- */

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  labels: DietaryLabel[];
  isAvailable: boolean;
  sortOrder: number;
  /** language -> field -> translated text (approved only). */
  translations: Record<string, Partial<Record<TranslatableField, string>>>;
}

export interface Category {
  id: string;
  menuId: string;
  name: string;
  sortOrder: number;
  translations: Record<string, Partial<Record<TranslatableField, string>>>;
  dishes: Dish[];
}

export interface Menu {
  id: string;
  restaurantId: string;
  name: string;
  slug: string;
  currency: import("./currency").CurrencyCode;
  defaultLanguage: import("./languages").LanguageCode;
  theme: "classic" | "modern";
  isPublished: boolean;
  publishedAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  /** Languages that have at least one approved translation, plus the default. */
  availableLanguages: string[];
  categories: Category[];
  restaurant: Restaurant;
}

export interface MenuSummary {
  id: string;
  name: string;
  slug: string;
  currency: string;
  defaultLanguage: string;
  theme: string;
  isPublished: boolean;
  isDemo: boolean;
  categoryCount: number;
  dishCount: number;
  updatedAt: string;
}

/* ---------------------------------------------------------------------------
 * AI requests / responses
 * ------------------------------------------------------------------------- */

export const translateRequestSchema = z
  .object({
    menuId: idSchema,
    sourceLanguage: languageSchema,
    targetLanguage: languageSchema,
  })
  .refine((v) => v.sourceLanguage !== v.targetLanguage, {
    message: "Source and target languages must differ",
    path: ["targetLanguage"],
  });
export type TranslateRequest = z.infer<typeof translateRequestSchema>;

/** One text item sent to the model. Prices and category links are never included. */
export interface TranslatableItem {
  id: string;
  type: TranslatableEntity;
  name: string;
  description: string | null;
}

/** Strict schema for what the model must return. Anything else is rejected. */
export const modelTranslationOutputSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(300),
        description: z.string().trim().max(1200).nullable().optional(),
      }),
    )
    .min(1),
});
export type ModelTranslationOutput = z.infer<typeof modelTranslationOutputSchema>;

export interface TranslatedItem {
  id: string;
  type: TranslatableEntity;
  original: { name: string; description: string | null };
  translated: { name: string; description: string | null };
}

export interface TranslateResponse {
  sourceLanguage: string;
  targetLanguage: string;
  items: TranslatedItem[];
  provider: string;
  model: string;
  /** IDs the model failed to return; the owner can translate these manually. */
  missingIds: string[];
}

export const improveDescriptionRequestSchema = z.object({
  dishName: trimmed(120).min(1),
  currentDescription: optionalText(600),
  categoryName: optionalText(80),
  labels: z.array(dietaryLabelSchema).max(DIETARY_LABELS.length).default([]),
  language: languageSchema.default("en"),
  /** Optional facts from the owner (ingredients, style). Never invented by the model. */
  notes: optionalText(400),
});
export type ImproveDescriptionRequest = z.infer<typeof improveDescriptionRequestSchema>;

export const modelImproveOutputSchema = z.object({
  description: z.string().trim().min(1).max(600),
});

export interface ImproveDescriptionResponse {
  description: string;
  provider: string;
  model: string;
}

/* ---------------------------------------------------------------------------
 * Sharing / publishing
 * ------------------------------------------------------------------------- */

export interface ShareInfo {
  slug: string;
  isPublished: boolean;
  publicUrl: string;
  /** True when APP_BASE_URL points at localhost / a private address. */
  isLocalUrl: boolean;
  qrDataUrl: string;
}

export interface AiStatus {
  configured: boolean;
  provider: string;
  model: string;
}

/** Standard error envelope returned by the API. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
