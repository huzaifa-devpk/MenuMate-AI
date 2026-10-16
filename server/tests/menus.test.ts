import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Menu, MenuSummary, Restaurant } from "@shared";
import { createApp } from "../src/app";
import { openDatabase, type Db } from "../src/db/connection";

function setup() {
  const db = openDatabase(":memory:");
  const app = createApp({ db });
  return { app, db };
}

const open: Db[] = [];

afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

async function createRestaurant(app: ReturnType<typeof createApp>) {
  const res = await request(app).put("/api/restaurant").send({
    name: "Saffron Garden",
    description: "A fictional sample kitchen.",
    address: "Lahore",
    phone: "+92 300 0000000",
  });
  expect(res.status).toBe(200);
  return res.body as Restaurant;
}

async function createMenu(app: ReturnType<typeof createApp>, name = "Dinner") {
  const res = await request(app).post("/api/menus").send({
    name,
    currency: "PKR",
    defaultLanguage: "en",
    theme: "classic",
  });
  expect(res.status).toBe(201);
  return res.body as Menu;
}

describe("restaurant and menu API", () => {
  it("requires a restaurant before a menu can be created", async () => {
    const ctx = setup();
    open.push(ctx.db);
    const res = await request(ctx.app).post("/api/menus").send({ name: "Dinner", currency: "PKR", defaultLanguage: "en" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/restaurant profile/i);
  });

  it("creates, lists, updates and deletes menus, categories and dishes", async () => {
    const ctx = setup();
    open.push(ctx.db);
    await createRestaurant(ctx.app);
    const created = await createMenu(ctx.app, "Dinner");
    const again = await createMenu(ctx.app, "Dinner");
    expect(again.slug).not.toBe(created.slug);

    const withCategory = await request(ctx.app).post(`/api/menus/${created.id}/categories`).send({ name: "Main Course" });
    expect(withCategory.status).toBe(201);
    const categoryId = (withCategory.body as Menu).categories[0]?.id;
    expect(categoryId).toBeTruthy();

    const withDish = await request(ctx.app).post(`/api/menus/${created.id}/categories/${categoryId}/dishes`).send({
      name: "Chicken Karahi",
      description: "Tomatoes, ginger and green chillies.",
      price: 1250,
      labels: ["spicy", "halal"],
    });
    expect(withDish.status).toBe(201);
    const dish = (withDish.body as Menu).categories[0]?.dishes[0];
    expect(dish?.price).toBe(1250);
    expect(dish?.categoryId).toBe(categoryId);

    const renamed = await request(ctx.app).patch(`/api/menus/${created.id}/dishes/${dish!.id}`).send({
      name: "Chicken Karahi",
      description: "Wok-cooked chicken with tomatoes.",
      price: 1250,
      labels: ["spicy"],
      isAvailable: true,
    });
    expect(renamed.status).toBe(200);
    const updatedDish = (renamed.body as Menu).categories[0]?.dishes[0];
    expect(updatedDish?.description).toMatch(/Wok-cooked/);
    expect(updatedDish?.price).toBe(1250);
    expect(updatedDish?.id).toBe(dish?.id);
    expect(updatedDish?.categoryId).toBe(categoryId);

    const listed = await request(ctx.app).get("/api/menus");
    expect(listed.status).toBe(200);
    const summaries = listed.body as MenuSummary[];
    expect(summaries).toHaveLength(2);
    expect(summaries.find((menu) => menu.id === created.id)?.dishCount).toBe(1);

    const removed = await request(ctx.app).delete(`/api/menus/${created.id}`);
    expect(removed.status).toBe(204);
    const missing = await request(ctx.app).get(`/api/menus/${created.id}`);
    expect(missing.status).toBe(404);
  });

  it("rejects an empty dish name, a negative price and malformed JSON", async () => {
    const ctx = setup();
    open.push(ctx.db);
    await createRestaurant(ctx.app);
    const menu = await createMenu(ctx.app);
    const category = await request(ctx.app).post(`/api/menus/${menu.id}/categories`).send({ name: "Drinks" });
    const categoryId = (category.body as Menu).categories[0]!.id;

    const empty = await request(ctx.app).post(`/api/menus/${menu.id}/categories/${categoryId}/dishes`).send({ name: "  ", price: 200 });
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("VALIDATION_ERROR");

    const negative = await request(ctx.app).post(`/api/menus/${menu.id}/categories/${categoryId}/dishes`).send({ name: "Lime", price: -5 });
    expect(negative.status).toBe(400);

    const badJson = await request(ctx.app)
      .put("/api/restaurant")
      .set("Content-Type", "application/json")
      .send("{");
    expect(badJson.status).toBe(400);
    expect(badJson.body.error.code).toBe("INVALID_JSON");
  });

  it("reorders categories without changing dish prices", async () => {
    const ctx = setup();
    open.push(ctx.db);
    await createRestaurant(ctx.app);
    const menu = await createMenu(ctx.app);
    const first = await request(ctx.app).post(`/api/menus/${menu.id}/categories`).send({ name: "Starters" });
    const second = await request(ctx.app).post(`/api/menus/${first.body.id}/categories`).send({ name: "Mains" });
    const categories = (second.body as Menu).categories;
    const starters = categories.find((category) => category.name === "Starters")!;
    const mains = categories.find((category) => category.name === "Mains")!;
    await request(ctx.app).post(`/api/menus/${menu.id}/categories/${mains.id}/dishes`).send({ name: "Biryani", price: 450 });

    const reordered = await request(ctx.app).put(`/api/menus/${menu.id}/categories/reorder`).send({ orderedIds: [mains.id, starters.id] });
    expect(reordered.status).toBe(200);
    const body = reordered.body as Menu;
    expect(body.categories.map((category) => category.name)).toEqual(["Mains", "Starters"]);
    expect(body.categories[0]?.dishes[0]?.price).toBe(450);

    const invalid = await request(ctx.app).put(`/api/menus/${menu.id}/categories/reorder`).send({ orderedIds: [mains.id] });
    expect(invalid.status).toBe(400);
  });

  it("blocks edits to a sample menu", async () => {
    const ctx = setup();
    open.push(ctx.db);
    await createRestaurant(ctx.app);
    const menu = await createMenu(ctx.app);
    ctx.db.prepare("UPDATE menus SET is_demo = 1 WHERE id = ?").run(menu.id);

    const update = await request(ctx.app).patch(`/api/menus/${menu.id}`).send({ name: "Changed" });
    expect(update.status).toBe(403);

    const del = await request(ctx.app).delete(`/api/menus/${menu.id}`);
    expect(del.status).toBe(403);

    const still = await request(ctx.app).get(`/api/menus/${menu.id}`);
    expect(still.status).toBe(200);
    expect((still.body as Menu).name).toBe("Dinner");
    expect((still.body as Menu).isDemo).toBe(true);
  });

  it("serves a health check without exposing secrets", async () => {
    const ctx = setup();
    open.push(ctx.db);
    const res = await request(ctx.app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.database).toBe("ok");
    expect(res.body.ai.configured).toBe(false);
    expect(res.body.ai).not.toHaveProperty("apiKey");
    expect(JSON.stringify(res.body)).not.toMatch(/GEMMA_API_KEY|AIza/);
  });
});
