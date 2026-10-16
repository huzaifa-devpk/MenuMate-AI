import { describe, expect, it } from "vitest";
import { dishInputSchema, menuInputSchema, priceSchema, resolveField, restaurantInputSchema } from "@shared";

describe("menu validation", () => {
  it("rejects an empty dish name and a negative price", () => {
    const emptyName = dishInputSchema.safeParse({ name: "   ", price: 100 });
    expect(emptyName.success).toBe(false);

    const negative = priceSchema.safeParse(-1);
    expect(negative.success).toBe(false);
    if (!negative.success) {
      expect(negative.error.issues.some((issue) => issue.message.includes("negative"))).toBe(true);
    }
  });

  it("accepts zero and two-decimal prices, and rejects a third decimal", () => {
    expect(priceSchema.safeParse(0).success).toBe(true);
    expect(priceSchema.safeParse(1250).success).toBe(true);
    expect(priceSchema.safeParse(10.5).success).toBe(true);
    expect(priceSchema.safeParse(1.1).success).toBe(true);
    expect(priceSchema.safeParse(10.555).success).toBe(false);
  });

  it("rejects unsupported currency and unsafe URLs", () => {
    const menu = menuInputSchema.safeParse({ name: "Lunch", currency: "JPY", defaultLanguage: "en" });
    expect(menu.success).toBe(false);

    const restaurant = restaurantInputSchema.safeParse({
      name: "Cafe",
      logoUrl: "javascript:alert(1)",
      email: "not-an-email",
    });
    expect(restaurant.success).toBe(false);
  });

  it("accepts an http logo and a blank optional email", () => {
    const restaurant = restaurantInputSchema.safeParse({
      name: "Saffron Garden",
      logoUrl: "https://example.com/logo.png",
      email: "",
      website: "",
    });
    expect(restaurant.success).toBe(true);
    if (restaurant.success) {
      expect(restaurant.data.logoUrl).toBe("https://example.com/logo.png");
      expect(restaurant.data.email).toBeNull();
      expect(restaurant.data.website).toBeNull();
    }
  });

  it("keeps source text for the default language and uses an approved translation otherwise", () => {
    const translations = { ur: { name: "چکن کڑاہی", description: "مصالحہ دار" } };
    expect(resolveField("Chicken Karahi", translations, "name", "en", "en")).toBe("Chicken Karahi");
    expect(resolveField("Chicken Karahi", translations, "name", "ur", "en")).toBe("چکن کڑاہی");
    expect(resolveField("Fresh Lime", { ur: { name: "  " } }, "name", "ur", "en")).toBe("Fresh Lime");
  });
});
