import {
  modelImproveOutputSchema,
  modelTranslationOutputSchema,
  resolveField,
  type ImproveDescriptionRequest,
  type ImproveDescriptionResponse,
  type Menu,
  type TranslatableItem,
  type TranslateRequest,
  type TranslateResponse,
  type TranslatedItem,
} from "@shared";
import type { Db } from "../../db/connection";
import { requireMenu } from "../../db/repository";
import { badRequest } from "../../lib/errors";
import { HttpError } from "../../lib/errors";
import { AiInvalidResponseError, AiProviderError } from "./errors";
import { numbersPreserved, parseModelJson } from "./json";
import { assertTranslationSize, improveRequest, translationRequest } from "./prompts";
import type { GemmaClient } from "./types";

export function collectTranslatableItems(menu: Menu, sourceLanguage: string): TranslatableItem[] {
  const items: TranslatableItem[] = [];
  for (const category of menu.categories) {
    const name = resolveField(category.name, category.translations, "name", sourceLanguage, menu.defaultLanguage).trim();
    if (name) items.push({ id: category.id, type: "category", name, description: null });
    for (const dish of category.dishes) {
      const dishName = resolveField(dish.name, dish.translations, "name", sourceLanguage, menu.defaultLanguage).trim();
      const description = resolveField(dish.description, dish.translations, "description", sourceLanguage, menu.defaultLanguage).trim();
      if (!dishName) continue;
      items.push({ id: dish.id, type: "dish", name: dishName, description: description || null });
    }
  }
  return items;
}

/**
 * Keep only name and description for ids the owner actually sent.
 * Prices, category links and unknown ids from the model are discarded.
 */
export function applyTranslationOutput(items: TranslatableItem[], raw: unknown): { items: TranslatedItem[]; missingIds: string[] } {
  const parsed = modelTranslationOutputSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiInvalidResponseError("The model JSON did not match the menu translation schema. Nothing was saved.");
  }
  const byId = new Map(items.map((item) => [item.id, item]));
  const seen = new Set<string>();
  const translated: TranslatedItem[] = [];

  for (const row of parsed.data.items) {
    const source = byId.get(row.id);
    if (!source || seen.has(row.id)) continue;
    seen.add(row.id);

    let name = row.name.trim();
    let description = row.description?.trim() ? row.description.trim() : null;
    if (!source.description) description = null;
    if (!numbersPreserved(source.name, name)) name = source.name;
    if (source.description && description && !numbersPreserved(source.description, description)) {
      description = source.description;
    }

    translated.push({
      id: source.id,
      type: source.type,
      original: { name: source.name, description: source.description },
      translated: { name, description },
    });
  }

  if (translated.length === 0) {
    throw new AiInvalidResponseError("The model response did not match any dishes on this menu. Nothing was saved.");
  }

  return {
    items: translated,
    missingIds: items.filter((item) => !seen.has(item.id)).map((item) => item.id),
  };
}

async function completeText(client: GemmaClient, request: { system: string; user: string; temperature: number; maxOutputTokens: number }) {
  try {
    return await client.complete(request);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new AiProviderError("The Gemma provider could not complete the request. Nothing was changed. You can retry or edit the text yourself.");
  }
}

export async function translateMenu(db: Db, body: TranslateRequest, client: GemmaClient): Promise<TranslateResponse> {
  const menu = requireMenu(db, body.menuId);
  const items = collectTranslatableItems(menu, body.sourceLanguage);
  if (items.length === 0) throw badRequest("Add at least one dish before translating.");
  try {
    assertTranslationSize(items);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TOO_MANY_ITEMS" || code === "TOO_MUCH_TEXT") {
      throw badRequest("This menu is too large to translate in one request. Split it into smaller menus.");
    }
    throw error;
  }

  const prompt = translationRequest(items, body.sourceLanguage, body.targetLanguage);
  const text = await completeText(client, { ...prompt, temperature: 0.2, maxOutputTokens: 8192 });
  const applied = applyTranslationOutput(items, parseModelJson(text));
  return {
    sourceLanguage: body.sourceLanguage,
    targetLanguage: body.targetLanguage,
    items: applied.items,
    missingIds: applied.missingIds,
    provider: client.provider,
    model: client.model,
  };
}

export async function improveDescription(input: ImproveDescriptionRequest, client: GemmaClient): Promise<ImproveDescriptionResponse> {
  const prompt = improveRequest(input);
  const text = await completeText(client, { system: prompt.system, user: prompt.user, temperature: 0.4, maxOutputTokens: 1024 });
  const parsed = modelImproveOutputSchema.safeParse(parseModelJson(text));
  if (!parsed.success) {
    throw new AiInvalidResponseError("The model did not return a description. Nothing was saved.");
  }
  const description = parsed.data.description.trim();
  const inventedNumbers = (description.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((value) => !prompt.factsText.includes(value));
  if (inventedNumbers.length > 0) {
    throw new AiInvalidResponseError("The model added numbers that were not in your notes. Nothing was saved.");
  }
  return { description, provider: client.provider, model: client.model };
}
