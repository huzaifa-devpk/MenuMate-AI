import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Menu } from "@shared";
import { createApp } from "../src/app";
import { openDatabase, type Db } from "../src/db/connection";
import { seedDemo } from "../src/db/seed";
import { errorHandler } from "../src/lib/errors";

const open: Db[] = [];
afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

/** PDFKit writes standard-font text as WinAnsi hex inside TJ, not as literal strings. */
function pdfText(body: unknown): string {
  const raw = Buffer.isBuffer(body) ? body.toString("latin1") : String(body);
  const chunks: string[] = [];
  for (const array of raw.matchAll(/\[([\s\S]*?)\]\s*TJ/g)) {
    for (const token of array[1].matchAll(/<([0-9A-Fa-f]+)>/g)) {
      const hex = token[1];
      for (let i = 0; i + 1 < hex.length; i += 2) {
        chunks.push(String.fromCharCode(Number.parseInt(hex.slice(i, i + 2), 16)));
      }
    }
  }
  return chunks.join("");
}

function pdfBytes(body: unknown): string {
  return Buffer.isBuffer(body) ? body.toString("latin1") : String(body);
}

describe("sample menu", () => {
  it("seeds Saffron Garden once, with the sample prices, and serves it without an API key", async () => {
    const db = openDatabase(":memory:");
    open.push(db);
    expect(seedDemo(db).created).toBe(true);
    expect(seedDemo(db).created).toBe(false);
    const app = createApp({ db });
    const res = await request(app).get("/api/public/menus/saffron-garden");
    expect(res.status).toBe(200);
    const menu = res.body as Menu;
    expect(menu.isDemo).toBe(true);
    expect(menu.restaurant.name).toBe("Saffron Garden");
    expect(menu.restaurant.description).toMatch(/fictional/i);
    const dishes = menu.categories.flatMap((category) => category.dishes);
    const prices = Object.fromEntries(dishes.map((dish) => [dish.name, dish.price]));
    expect(prices).toMatchObject({
      "Chicken Karahi": 1250,
      "Chicken Biryani": 450,
      "Daal Makhani": 550,
      "Fresh Lime": 200,
      "Gulab Jamun": 180,
    });
    expect(dishes.find((dish) => dish.name === "Chicken Karahi")?.translations.ur?.name).toBe("چکن کڑاہی");
    expect(menu.availableLanguages).toEqual(["en", "ur"]);
  });

  it("copies the sample onto the owner's restaurant without changing prices", async () => {
    const db = openDatabase(":memory:");
    open.push(db);
    seedDemo(db);
    const app = createApp({ db });
    const blocked = await request(app).post("/api/menus/missing/duplicate");
    expect(blocked.status).toBe(404);

    const demo = await request(app).get("/api/public/menus/saffron-garden");
    const demoId = (demo.body as Menu).id;
    const needsProfile = await request(app).post(`/api/menus/${demoId}/duplicate`);
    expect(needsProfile.status).toBe(400);

    await request(app).put("/api/restaurant").send({ name: "My Kitchen", address: "Karachi" });
    const copyRes = await request(app).post(`/api/menus/${demoId}/duplicate`);
    expect(copyRes.status).toBe(201);
    const copy = copyRes.body as Menu;
    expect(copy.isDemo).toBe(false);
    expect(copy.isPublished).toBe(false);
    expect(copy.restaurant.name).toBe("My Kitchen");
    expect(copy.categories.flatMap((category) => category.dishes).find((dish) => dish.name === "Chicken Karahi")?.price).toBe(1250);
    const original = await request(app).get("/api/public/menus/saffron-garden");
    expect((original.body as Menu).restaurant.name).toBe("Saffron Garden");
    expect((original.body as Menu).categories[0]?.dishes[0]?.price).toBe(1250);
  });
});

describe("PDF export", () => {
  it("builds the PDF from saved dishes and prices", async () => {
    const db = openDatabase(":memory:");
    open.push(db);
    const app = createApp({ db });
    await request(app).put("/api/restaurant").send({ name: "Test Kitchen" });
    const created = await request(app).post("/api/menus").send({ name: "Lunch", currency: "USD", defaultLanguage: "en", theme: "classic" });
    const menu = created.body as Menu;
    const withCategory = await request(app).post(`/api/menus/${menu.id}/categories`).send({ name: "Mains" });
    const categoryId = (withCategory.body as Menu).categories[0]!.id;
    const withDish = await request(app).post(`/api/menus/${menu.id}/categories/${categoryId}/dishes`).send({
      name: "Chicken Karahi",
      description: "Tomatoes and ginger.",
      price: 12.5,
    });
    const dishId = (withDish.body as Menu).categories[0]!.dishes[0]!.id;

    const pdf = await request(app).get(`/api/menus/${menu.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toMatch(/application\/pdf/);
    const raw = pdfBytes(pdf.body);
    const text = pdfText(pdf.body);
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(text).toContain("Test Kitchen");
    expect(text).toContain("Chicken Karahi");
    expect(text).toContain("$12.50");

    await request(app).patch(`/api/menus/${menu.id}/dishes/${dishId}`).send({
      name: "Special Karahi",
      description: "Tomatoes and ginger.",
      price: 12.5,
      labels: [],
      isAvailable: true,
    });
    const updated = pdfText((await request(app).get(`/api/menus/${menu.id}/pdf`)).body);
    expect(updated).toContain("Special Karahi");
    expect(updated).not.toContain("Chicken Karahi");
    expect(updated).toContain("$12.50");
  });

  it("renders the Urdu sample menu without throwing and keeps the rupee prices", async () => {
    const db = openDatabase(":memory:");
    open.push(db);
    seedDemo(db);
    const app = createApp({ db });
    const menu = (await request(app).get("/api/public/menus/saffron-garden")).body as Menu;
    const pdf = await request(app).get(`/api/menus/${menu.id}/pdf?language=ur`);
    expect(pdf.status).toBe(200);
    const raw = pdfBytes(pdf.body);
    const text = pdfText(pdf.body);
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(text).toContain("Rs 1,250");
    expect(text).toContain("Rs 450");
    expect(text).toContain("Saffron Garden");
    expect(raw.length).toBeGreaterThan(5000);
    const bad = await request(app).get(`/api/menus/${menu.id}/pdf?language=fr`);
    expect(bad.status).toBe(400);
  });
});

describe("error responses", () => {
  it("does not put stack traces in the JSON body", () => {
    const res = {
      statusCode: 0,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(body: unknown) {
        this.body = body;
        return this;
      },
    };
    const error = new Error("boom");
    error.stack = "secret-stack-frame at function";
    errorHandler(error, {} as never, res as never, () => undefined);
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("secret-stack-frame");
    expect(JSON.stringify(res.body)).toContain("boom");
  });
});
