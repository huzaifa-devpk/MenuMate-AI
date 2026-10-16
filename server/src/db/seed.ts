import type { DietaryLabel } from "@shared";
import type { Db } from "./connection";
import { newId, nowIso } from "../lib/ids";

/**
 * Hand-written sample content for the fictional restaurant Saffron Garden.
 * These Urdu lines are starter content so the demo works without an API key.
 * They are not presented as live Gemma output.
 */
const DEMO_SLUG = "saffron-garden";

interface SampleDish {
  name: string;
  urduName: string;
  description: string;
  urduDescription: string;
  price: number;
  labels?: DietaryLabel[];
}

interface SampleCategory {
  name: string;
  urduName: string;
  dishes: SampleDish[];
}

const SAMPLE: SampleCategory[] = [
  {
    name: "Main Course",
    urduName: "مین کورس",
    dishes: [
      {
        name: "Chicken Karahi",
        urduName: "چکن کڑاہی",
        description: "Wok-cooked chicken with tomatoes, ginger and green chillies.",
        urduDescription: "ٹماٹر، ادرک اور ہری مرچوں کے ساتھ تیار کردہ چکن۔",
        price: 1250,
        labels: ["spicy"],
      },
      {
        name: "Chicken Biryani",
        urduName: "چکن بریانی",
        description: "Fragrant basmati rice layered with spiced chicken.",
        urduDescription: "مصالحہ دار چکن کے ساتھ خوشبودار باسمتی چاول۔",
        price: 450,
      },
      {
        name: "Daal Makhani",
        urduName: "دال مکھنی",
        description: "Slow-simmered black lentils finished with butter.",
        urduDescription: "مکھن کے ساتھ آہستہ پکی ہوئی دال۔",
        price: 550,
        labels: ["vegetarian"],
      },
    ],
  },
  {
    name: "Drinks",
    urduName: "مشروبات",
    dishes: [
      {
        name: "Fresh Lime",
        urduName: "تازہ لیموں",
        description: "Fresh lime juice.",
        urduDescription: "تازہ لیموں کا رس۔",
        price: 200,
      },
    ],
  },
  {
    name: "Desserts",
    urduName: "میٹھائی",
    dishes: [
      {
        name: "Gulab Jamun",
        urduName: "گلاب جامن",
        description: "Soft milk dumplings in cardamom syrup.",
        urduDescription: "الائچی کے شیرے میں نرم مٹھائی۔",
        price: 180,
        labels: ["vegetarian"],
      },
    ],
  },
];

export function seedDemo(db: Db): { created: boolean; slug: string } {
  const existing = db.prepare("SELECT id FROM menus WHERE slug = ?").get(DEMO_SLUG) as { id: string } | undefined;
  if (existing) return { created: false, slug: DEMO_SLUG };

  const now = nowIso();
  const restaurantId = newId();
  const menuId = newId();
  const insertTranslation = db.prepare(
    `INSERT INTO translations (entity_type, entity_id, language, field, text, status, created_at, updated_at)
     VALUES (?, ?, 'ur', ?, ?, 'approved', ?, ?)`,
  );

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO restaurants
        (id, name, description, logo_url, cover_image_url, phone, email, address, website, is_demo, created_at, updated_at)
       VALUES (?, ?, ?, NULL, NULL, NULL, NULL, ?, NULL, 1, ?, ?)`,
    ).run(
      restaurantId,
      "Saffron Garden",
      "A fictional sample restaurant used to demonstrate MenuMate AI. These dishes and prices are illustrative, not a real business.",
      "Lahore (sample)",
      now,
      now,
    );
    db.prepare(
      `INSERT INTO menus
        (id, restaurant_id, name, slug, currency, default_language, theme, is_published, published_at, is_demo, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'PKR', 'en', 'classic', 1, ?, 1, ?, ?)`,
    ).run(menuId, restaurantId, "Saffron Garden", DEMO_SLUG, now, now, now);

    SAMPLE.forEach((category, categoryIndex) => {
      const categoryId = newId();
      db.prepare("INSERT INTO categories (id, menu_id, name, sort_order) VALUES (?, ?, ?, ?)").run(categoryId, menuId, category.name, categoryIndex);
      insertTranslation.run("category", categoryId, "name", category.urduName, now, now);
      category.dishes.forEach((dish, dishIndex) => {
        const dishId = newId();
        db.prepare(
          `INSERT INTO dishes (id, category_id, name, description, price, image_url, labels, is_available, sort_order)
           VALUES (?, ?, ?, ?, ?, NULL, ?, 1, ?)`,
        ).run(dishId, categoryId, dish.name, dish.description, dish.price, JSON.stringify(dish.labels ?? []), dishIndex);
        insertTranslation.run("dish", dishId, "name", dish.urduName, now, now);
        insertTranslation.run("dish", dishId, "description", dish.urduDescription, now, now);
      });
    });
  });
  tx();
  return { created: true, slug: DEMO_SLUG };
}
