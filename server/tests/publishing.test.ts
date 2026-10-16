import { afterEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { Menu, ShareInfo } from "@shared";
import { createApp } from "../src/app";
import { openDatabase, type Db } from "../src/db/connection";
import { isLocalBaseUrl, publicMenuUrl } from "../src/lib/publicUrl";

const open: Db[] = [];
afterEach(() => {
  for (const db of open.splice(0)) db.close();
});

async function seed() {
  const db = openDatabase(":memory:");
  open.push(db);
  const app = createApp({ db });
  await request(app).put("/api/restaurant").send({ name: "Saffron Garden" });
  const created = await request(app).post("/api/menus").send({ name: "Dinner", currency: "PKR", defaultLanguage: "en", theme: "modern" });
  const menu = created.body as Menu;
  const withCategory = await request(app).post(`/api/menus/${menu.id}/categories`).send({ name: "Drinks" });
  const categoryId = (withCategory.body as Menu).categories[0]!.id;
  await request(app).post(`/api/menus/${menu.id}/categories/${categoryId}/dishes`).send({ name: "Fresh Lime", description: "Cold lime drink.", price: 200 });
  return { app, db, menuId: menu.id, slug: menu.slug };
}

describe("public URL and QR construction", () => {
  it("builds the public path from the configured base URL", () => {
    expect(publicMenuUrl("http://localhost:5173", "saffron-garden")).toBe("http://localhost:5173/m/saffron-garden");
    expect(publicMenuUrl("https://menu.example.com/", "saffron-garden")).toBe("https://menu.example.com/m/saffron-garden");
    expect(isLocalBaseUrl("http://localhost:5173")).toBe(true);
    expect(isLocalBaseUrl("http://192.168.1.20:3001")).toBe(true);
    expect(isLocalBaseUrl("http://10.0.0.4")).toBe(true);
    expect(isLocalBaseUrl("https://menu.example.com")).toBe(false);
  });
});

describe("publishing", () => {
  it("hides an unpublished menu and serves it after publish", async () => {
    const { app, menuId, slug } = await seed();
    const hidden = await request(app).get(`/api/public/menus/${slug}`);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe("NOT_PUBLISHED");
    expect(JSON.stringify(hidden.body)).not.toContain("Fresh Lime");

    const published = await request(app).post(`/api/menus/${menuId}/publish`);
    expect(published.status).toBe(200);
    expect((published.body as Menu).isPublished).toBe(true);
    expect((published.body as Menu).publishedAt).toBeTruthy();

    const visible = await request(app).get(`/api/public/menus/${slug}`);
    expect(visible.status).toBe(200);
    expect(visible.body.restaurant.name).toBe("Saffron Garden");
    expect(visible.body.categories[0].dishes[0].name).toBe("Fresh Lime");
    expect(visible.body.categories[0].dishes[0].price).toBe(200);

    const share = await request(app).get(`/api/menus/${menuId}/share`);
    expect(share.status).toBe(200);
    const info = share.body as ShareInfo;
    expect(info.publicUrl).toBe(`http://localhost:5173/m/${slug}`);
    expect(info.isLocalUrl).toBe(true);
    expect(info.isPublished).toBe(true);
    expect(info.qrDataUrl.startsWith("data:image/png;base64,")).toBe(true);

    const png = await request(app).get(`/api/menus/${menuId}/qr.png`);
    expect(png.status).toBe(200);
    expect(png.headers["content-type"]).toMatch(/image\/png/);
    expect(png.body.length).toBeGreaterThan(100);

    const unpublished = await request(app).post(`/api/menus/${menuId}/unpublish`);
    expect(unpublished.status).toBe(200);
    expect((unpublished.body as Menu).isPublished).toBe(false);
    const gone = await request(app).get(`/api/public/menus/${slug}`);
    expect(gone.status).toBe(404);
    expect(gone.body.error.code).toBe("NOT_PUBLISHED");
  });

  it("says when a public slug does not exist and blocks sample-menu unpublish", async () => {
    const { app, db, menuId } = await seed();
    const missing = await request(app).get("/api/public/menus/does-not-exist");
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
    expect(missing.body.error.message).toMatch(/does not exist/);

    db.prepare("UPDATE menus SET is_demo = 1, is_published = 1 WHERE id = ?").run(menuId);
    const blocked = await request(app).post(`/api/menus/${menuId}/unpublish`);
    expect(blocked.status).toBe(403);
  });
});
