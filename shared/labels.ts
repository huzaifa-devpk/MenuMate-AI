import type { DietaryLabel } from "./schemas";

/** English names for dietary labels. These are interface labels, not AI output. */
export const DIETARY_LABEL_NAMES: Record<DietaryLabel, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  spicy: "Spicy",
  halal: "Halal",
  "gluten-free": "Gluten-free",
  "nut-free": "Nut-free",
  "chef-special": "Chef's special",
};

/** Urdu names for the same labels, for the public menu language switcher. */
export const DIETARY_LABEL_NAMES_UR: Record<DietaryLabel, string> = {
  vegetarian: "سبزی خور",
  vegan: "ویگن",
  spicy: "مرچ دار",
  halal: "حلال",
  "gluten-free": "گلوٹین سے پاک",
  "nut-free": "مغزیات سے پاک",
  "chef-special": "شیف کا خاص",
};

export function dietaryLabelName(label: DietaryLabel, language: string): string {
  if (language === "ur") return DIETARY_LABEL_NAMES_UR[label];
  return DIETARY_LABEL_NAMES[label];
}
