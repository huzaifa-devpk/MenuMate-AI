import { getLanguage, type ImproveDescriptionRequest, type TranslatableItem } from "@shared";

const MAX_ITEMS = 200;
const MAX_CHARS = 24_000;

export function assertTranslationSize(items: TranslatableItem[]) {
  if (items.length > MAX_ITEMS) {
    throw new Error("TOO_MANY_ITEMS");
  }
  const chars = items.reduce((total, item) => total + item.name.length + (item.description?.length ?? 0), 0);
  if (chars > MAX_CHARS) throw new Error("TOO_MUCH_TEXT");
}

export function translationRequest(items: TranslatableItem[], sourceLanguage: string, targetLanguage: string) {
  const source = getLanguage(sourceLanguage);
  const target = getLanguage(targetLanguage);
  const payload = {
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      description: item.description,
    })),
  };
  const system = [
    "You translate restaurant menu text.",
    'Return only a JSON object with this exact shape: {"items":[{"id":"string","name":"string","description":"string or null"}]}',
    "Use each id exactly as given. Do not invent, drop, or renumber ids.",
    `Translate names and descriptions from ${source.promptName} into ${target.promptName}.`,
    "Keep recognizable dish names natural for the target language. You may transliterate a proper dish name. Do not replace it with a different dish.",
    "Preserve every quantity and number exactly, including digits.",
    "Do not include prices, currency, category ids, or any field other than id, name and description.",
    "If a description is null, return null. Do not invent a description, ingredient, allergen, health claim, or cooking method.",
    "For Urdu, write in Perso-Arabic script.",
    "No markdown fences and no commentary.",
  ].join(" ");
  const user = `Translate this menu JSON from ${source.name} to ${target.name}:\n${JSON.stringify(payload)}`;
  return { system, user };
}

export function improveRequest(input: ImproveDescriptionRequest) {
  const language = getLanguage(input.language);
  const facts = {
    dishName: input.dishName,
    categoryName: input.categoryName,
    currentDescription: input.currentDescription,
    labels: input.labels,
    notes: input.notes,
  };
  const system = [
    "You write a short restaurant menu description.",
    'Return only JSON: {"description":"string"}',
    "Use ONLY the facts in the user message.",
    "Do not invent ingredients, allergens, health benefits, portion sizes, prices, or cooking methods.",
    "If the notes and current description do not support a detail, leave it out.",
    `Write one or two sentences, under 280 characters, in ${language.promptName}.`,
    "No markdown and no commentary.",
  ].join(" ");
  const user = `Write a menu description from these owner-supplied facts:\n${JSON.stringify(facts)}`;
  return { system, user, factsText: JSON.stringify(facts) };
}
