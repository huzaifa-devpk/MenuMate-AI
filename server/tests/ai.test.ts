import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Menu } from "@shared";
import { loadConfig } from "../src/config";
import { createApp } from "../src/app";
import { openDatabase, type Db } from "../src/db/connection";
import { applyTranslationOutput } from "../src/services/ai/service";
import { buildGoogleCall, parseGoogleResponse } from "../src/services/ai/google";
import { translationRequest } from "../src/services/ai/prompts";
import type { GemmaClient } from "../src/services/ai/types";

const open: Db[] = [];
afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

const env = loadConfig({
  NODE_ENV: "test",
  DATABASE_PATH: ":memory:",
  APP_BASE_URL: "http://localhost:5173",
  GEMMA_API_KEY: "super-secret-key",
  GEMMA_PROVIDER: "google",
  GEMMA_MODEL: "gemma-4-31b-it",
  GEMMA_API_BASE_URL: "https://generativelanguage.googleapis.com/v1beta",
  GEMMA_THINKING_LEVEL: "minimal",
});

async function seedMenu() {
  const db = openDatabase(":memory:");
  open.push(db);
  const appForSetup = createApp({ db, gemma: { provider: "google", model: "gemma-4-31b-it", complete: async () => "{}" } });
  await request(appForSetup).put("/api/restaurant").send({ name: "Saffron Garden", address: "Lahore" });
  const created = await request(appForSetup).post("/api/menus").send({ name: "Dinner", currency: "PKR", defaultLanguage: "en", theme: "classic" });
  const menu = created.body as Menu;
  const withCategory = await request(appForSetup).post(`/api/menus/${menu.id}/categories`).send({ name: "Main Course" });
  const categoryId = (withCategory.body as Menu).categories[0]!.id;
  const withDish = await request(appForSetup)
    .post(`/api/menus/${menu.id}/categories/${categoryId}/dishes`)
    .send({ name: "Chicken Karahi", description: "Serves 2 with ginger.", price: 1250, labels: ["spicy"] });
  const saved = withDish.body as Menu;
  const dish = saved.categories[0]!.dishes[0]!;
  return { db, menuId: saved.id, categoryId, dishId: dish.id };
}

function client(complete: GemmaClient["complete"]): GemmaClient {
  return { provider: "google", model: "gemma-4-31b-it", complete };
}

describe("Gemma request format", () => {
  it("calls the documented Gemini generateContent endpoint and keeps the key out of the URL and body", () => {
    const call = buildGoogleCall(env, { system: "sys", user: "hello", temperature: 0.2, maxOutputTokens: 128 });
    expect(call.url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent");
    expect(call.headers["x-goog-api-key"]).toBe("super-secret-key");
    expect(call.url).not.toContain("super-secret-key");
    expect(JSON.stringify(call.body)).not.toContain("super-secret-key");
    expect(call.body.generationConfig).toMatchObject({
      responseMimeType: "application/json",
      thinkingConfig: { thinkingLevel: "minimal" },
    });
  });

  it("ignores thinking parts and redacts the key from provider errors", () => {
    const text = parseGoogleResponse({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { text: "reasoning", thought: true },
              { text: "{\"items\":[]}" },
            ],
          },
        },
      ],
    });
    expect(text).toBe('{"items":[]}');

    expect(() => parseGoogleResponse({ error: { message: "bad key super-secret-key" } }, "super-secret-key")).toThrow(/\[redacted\]/);
  });

  it("does not put prices into the translation prompt", () => {
    const prompt = translationRequest(
      [{ id: "dish1", type: "dish", name: "Chicken Karahi", description: "Serves 2" }],
      "en",
      "ur",
    );
    expect(prompt.user).toContain("Chicken Karahi");
    expect(prompt.user).not.toMatch(/price|1250|PKR|categoryId/i);
    expect(prompt.system).toMatch(/Do not include prices/);
  });
});

describe("Gemma routes", () => {
  it("returns a configuration error and does not call the provider when the key is missing", async () => {
    const { db, menuId, dishId } = await seedMenu();
    let called = false;
    const { createGoogleClient } = await import("../src/services/ai/google");
    const keyless = createGoogleClient({ ...env, GEMMA_API_KEY: "" }, async () => {
      called = true;
      return new Response("no");
    });
    const app = createApp({ db, gemma: keyless });
    const res = await request(app).post("/api/ai/translate").send({ menuId, sourceLanguage: "en", targetLanguage: "ur" });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("AI_NOT_CONFIGURED");
    expect(called).toBe(false);
    const configured = createApp({ db });
    const fallback = await request(configured).post("/api/ai/translate").send({ menuId, sourceLanguage: "en", targetLanguage: "ur" });
    expect(fallback.status).toBe(503);
    expect(fallback.body.error.code).toBe("AI_NOT_CONFIGURED");
    const dish = db.prepare("SELECT price FROM dishes WHERE id = ?").get(dishId) as { price: number };
    expect(dish.price).toBe(1250);
  });

  it("rejects malformed JSON and leaves the dish untouched", async () => {
    const { db, menuId, dishId } = await seedMenu();
    const app = createApp({ db, gemma: client(async () => "Here is your translation!") });
    const res = await request(app).post("/api/ai/translate").send({ menuId, sourceLanguage: "en", targetLanguage: "ur" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("AI_INVALID_RESPONSE");
    const row = db.prepare("SELECT id, price, category_id FROM dishes WHERE id = ?").get(dishId) as { id: string; price: number; category_id: string };
    expect(row.price).toBe(1250);
    expect(db.prepare("SELECT COUNT(*) AS n FROM translations").get()).toEqual({ n: 0 });
  });

  it("reports a provider failure without substituting text", async () => {
    const { db, menuId } = await seedMenu();
    const app = createApp({
      db,
      gemma: client(async () => {
        throw new Error("socket hang up");
      }),
    });
    const res = await request(app).post("/api/ai/translate").send({ menuId, sourceLanguage: "en", targetLanguage: "ur" });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe("AI_PROVIDER_ERROR");
    expect(JSON.stringify(res.body)).not.toMatch(/Chicken Karahi|چکن/);
  });

  it("keeps prices, dish ids and categories when the model tries to change them", async () => {
    const { db, menuId, categoryId, dishId } = await seedMenu();
    const app = createApp({
      db,
      gemma: client(async () =>
        JSON.stringify({
          items: [
            { id: dishId, name: "چکن کڑاہی", description: "ادرک کے ساتھ 2 افراد۔", price: 1, categoryId: "elsewhere" },
            { id: "invented", name: "Fake dish", description: "no", price: 9 },
          ],
        }),
      ),
    });
    const res = await request(app).post("/api/ai/translate").send({ menuId, sourceLanguage: "en", targetLanguage: "ur" });
    expect(res.status).toBe(200);
    expect(res.body.model).toBe("gemma-4-31b-it");
    expect(res.body.missingIds).toContain(categoryId);
    const dishItem = res.body.items.find((item: { id: string }) => item.id === dishId);
    expect(dishItem.translated.name).toBe("چکن کڑاہی");
    expect(dishItem).not.toHaveProperty("price");
    expect(res.body.items.some((item: { id: string }) => item.id === "invented")).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("elsewhere");

    const row = db.prepare("SELECT id, price, category_id FROM dishes WHERE id = ?").get(dishId) as { id: string; price: number; category_id: string };
    expect(row).toEqual({ id: dishId, price: 1250, category_id: categoryId });

    const saved = await request(app).put(`/api/menus/${menuId}/translations`).send({
      language: "ur",
      entries: [
        { entityType: "dish", entityId: dishId, field: "name", text: dishItem.translated.name, price: 1 },
        { entityType: "dish", entityId: dishId, field: "description", text: dishItem.translated.description },
        { entityType: "category", entityId: categoryId, field: "name", text: "مین کورس" },
      ],
    });
    expect(saved.status).toBe(200);
    const menu = saved.body as Menu;
    const dish = menu.categories[0]!.dishes[0]!;
    expect(dish.id).toBe(dishId);
    expect(dish.price).toBe(1250);
    expect(dish.categoryId).toBe(categoryId);
    expect(dish.name).toBe("Chicken Karahi");
    expect(dish.translations.ur?.name).toBe("چکن کڑاہی");
    expect(menu.currency).toBe("PKR");
  });

  it("rejects a translation for a dish that is not on the menu", async () => {
    const { db, menuId } = await seedMenu();
    const app = createApp({ db });
    const res = await request(app).put(`/api/menus/${menuId}/translations`).send({
      language: "ur",
      entries: [{ entityType: "dish", entityId: "not-on-this-menu", field: "name", text: "چکن" }],
    });
    expect(res.status).toBe(400);
  });

  it("does not save an improved description and ignores a price sent by the client", async () => {
    const { db, dishId } = await seedMenu();
    let prompt = "";
    const app = createApp({
      db,
      gemma: client(async (req) => {
        prompt = req.user;
        return JSON.stringify({ description: "Wok-cooked chicken with ginger." });
      }),
    });
    const res = await request(app).post("/api/ai/improve-description").send({
      dishName: "Chicken Karahi",
      currentDescription: "Serves 2 with ginger.",
      labels: ["spicy"],
      language: "en",
      price: 999,
    });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe("Wok-cooked chicken with ginger.");
    expect(prompt).not.toContain("999");
    expect(prompt).not.toContain("1250");
    const row = db.prepare("SELECT description, price FROM dishes WHERE id = ?").get(dishId) as { description: string; price: number };
    expect(row.price).toBe(1250);
    expect(row.description).toBe("Serves 2 with ginger.");
  });

  it("drops numbers the model failed to preserve", () => {
    const applied = applyTranslationOutput(
      [{ id: "d1", type: "dish", name: "2 pc Chicken Karahi", description: null }],
      { items: [{ id: "d1", name: "چکن کڑاہی", description: "invented" }] },
    );
    expect(applied.items[0]?.translated.name).toBe("2 pc Chicken Karahi");
    expect(applied.items[0]?.translated.description).toBeNull();
  });
});
