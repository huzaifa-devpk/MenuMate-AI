---
title: MenuMate AI — Smart Multilingual Restaurant Menu Builder powered by Google Gemma
published: true
tags: devchallenge, hf26challenge, ai, opensource
---

*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 2: Side Hustle](https://dev.to/challenges/hacktoberfest-week2-2026-10-12)*

---

## What I Built

**MenuMate AI** is a smart, multilingual digital menu builder designed specifically for local, independent restaurants, ethnic eateries, and cafes. Powered by **Google Gemma 2 open-weight models**, MenuMate AI transforms a tedious, error-prone manual chore into a one-click automated workflow: generating instant, table-ready QR code digital menus with culturally authentic bilingual translations (specializing in **English** and **Pakistani Nastaliq Urdu**).

```
   ┌─────────────────────────────────────────────────────────────┐
   │                       MenuMate AI                           │
   │   [English Menu]  ──(Google Gemma 2)──►  [اردو Nastaliq]   │
   │         │                                      │            │
   │         ▼                                      ▼            │
   │    Instant QR Code ──► Table Tent ──► Diner Smartphone      │
   └─────────────────────────────────────────────────────────────┘
```

### The Problem It Solves
Independent restaurant owners face a painful dilemma:
1. **Generic Machine Translation Fails Gastronomy**: Standard closed-source translation tools translate culinary terms literally. A beloved traditional *"Chicken Karahi"* becomes an awkward literal phrase, *"Dum Biryani"* loses its aromatic culinary identity, and Western dishes like *"Club Sandwich"* get butchered instead of naturally transliterated.
2. **Reprinting Costs Kill Margins**: Whenever inflation hits or ingredients change, restaurants must spend $200–$500 to redesign and reprint laminated physical menus.
3. **Tourist & Demographic Friction**: Foreign tourists, expatriates, and local diners frequently struggle to decipher foreign or monolingual menus, slowing down table turnaround times and frustrating waitstaff.

### Who Would Pay For It? (The Side Hustle Model)
Local restaurant owners, cafe managers, food trucks, and hospitality groups gladly pay a modest subscription of **$19 to $39/month** (or an upfront onboarding fee of $99) for:
- Zero printing waste: Change a price or mark an item 86'd/unavailable in 5 seconds from the dashboard.
- Flawless bilingual diner experience: Diners scan a table QR code on their phone with **zero app downloads** and toggle between English (LTR) and Nastaliq Urdu (RTL).
- Professional Chef AI copywriter: Gemma crafts enticing, mouthwatering dish descriptions strictly from kitchen ingredient notes without fabricating allergens.

---

## Demo

- **Live GitHub Repository**: [https://github.com/huzaifa-devpk/MenuMate-AI](https://github.com/huzaifa-devpk/MenuMate-AI)
- **Interactive Public Menu Demo (Saffron Garden)**: [http://localhost:5173/m/saffron-garden](http://localhost:5173/m/saffron-garden)
- **Restaurant Management Dashboard**: [http://localhost:5173/dashboard](http://localhost:5173/dashboard)

### Key User Flows in the Application:
1. **Live Customer Menu**: Diners scan the QR code to open a responsive mobile menu. They can toggle between English and Urdu, filter by dietary pills (`Halal`, `Spicy`, `Vegetarian`, `Chef Special`), and search dishes in real time. When Urdu is selected, the interface flips into native RTL with **Noto Nastaliq Urdu** and **Gulzar** typography.
2. **Gemma AI Translation Studio**: With a single click, restaurant owners can translate an entire 4-course menu. An editable side-by-side review panel allows reviewing every category and dish before approving and committing to SQLite.
3. **Gemma Copywriter Modal**: Input simple chef notes (e.g., *"wok-simmered, vine tomatoes, ginger juliennes, black pepper"*), and Gemma generates an appetizing 20-word description while automatically tagging attributes.
4. **Instant Table Tent QR Generator**: Generates high-resolution vector SVGs and printable table-tent cards directly from the browser.

---

## Code

{% github huzaifa-devpk/MenuMate-AI %}

The repository is open-source under the **MIT License**:
- **Frontend**: React 18, TypeScript, Vite 6, Tailwind CSS, Lucide Icons, `qrcode.react`.
- **Backend**: Node.js, Express, TypeScript, native `node:sqlite`, and Zod validation.
- **AI Core**: Modular `GemmaService` supporting Google AI Studio REST API, Groq Cloud, and self-hosted OpenAI-compatible inference endpoints (Ollama, vLLM).
- **Test Suite**: 12 comprehensive automated unit & integration tests (`npm test`) covering schema parsing, in-memory SQLite transactions, and Gemma AI response validation.

---

## How I Built It

### 1. Open-Weight AI Architecture (Google Gemma 2)
MenuMate AI is built around **Google Gemma 2** (`gemma-2-9b-it`). We interact with Gemma via hosted inference (Google AI Studio and Groq Cloud) and local endpoints:

```typescript
// server/src/services/gemma.service.ts
const systemPrompt = `You are a culinary translation expert specializing in Pakistani and international restaurant menus.
Translate the provided restaurant menu items from English to Urdu.

CULTURAL AND TRANSLATION GUIDELINES:
1. For dishes with iconic traditional South Asian names (e.g. "Chicken Karahi", "Daal Makhani", "Seekh Kabab", "Gulab Jamun", "Biryani"), use authentic Nastaliq Urdu transliteration/script (e.g. "چکن کڑاہی", "دال مکھنی", "سیخ کباب", "گلاب جامن", "بریانی").
2. For modern cafe items (e.g. "Club Sandwich", "Espresso"), transliterate recognized names gracefully rather than awkward literal translation.
3. Write enticing, natural dish descriptions in Urdu that sound like a fine dining menu.
4. PRESERVATION: Preserve all dish IDs exactly. Do NOT invent allergens. Return pure JSON matching the Zod schema.`;
```

To prevent hallucinated data or broken client state, every raw completion returned by Gemma is parsed and rigorously validated against **Zod schemas** before reaching the database:

```typescript
export const gemmaTranslationResultSchema = z.object({
  menu_title: z.object({
    original: z.string(),
    translated: z.string(),
  }).optional(),
  categories: z.array(z.object({
    id: z.string(),
    original_name: z.string(),
    translated_name: z.string(),
    dishes: z.array(z.object({
      id: z.string(),
      original_name: z.string(),
      translated_name: z.string(),
      original_description: z.string().optional().nullable(),
      translated_description: z.string().optional().nullable(),
    })),
  })),
});
```

### 2. Relational Database with Native SQLite
Rather than introducing heavy external database dependencies, MenuMate AI utilizes Node.js's built-in `node:sqlite` (`DatabaseSync`). It manages clean relational tables with cascading foreign keys:
- `restaurants` ➔ `menus` ➔ `categories` ➔ `dishes` ➔ `translations`
- Translations are decoupled into an entity-agnostic schema (`entity_type`, `entity_id`, `language_code`, `field_name`, `translation`, `status`), allowing seamless multi-language expansion without altering the core dish table.

### 3. Typography & Styling for Nastaliq Script
Urdu script requires distinct vertical line heights and calligraphic letter-shaping compared to standard Arabic or Latin scripts. We integrated **Google Fonts** (`Noto Nastaliq Urdu` and `Gulzar`), combined with dynamic Tailwind CSS classes:

```css
/* client/src/index.css */
[dir="rtl"], .font-urdu {
  font-family: 'Noto Nastaliq Urdu', 'Gulzar', 'Jameel Noori Nastaleeq', Arial, sans-serif;
  line-height: 2.1;
}

.urdu-text {
  direction: rtl;
  text-align: right;
}
```

---

## Why Does Open Innovation Matter?

Why build MenuMate AI with an open-weight model like **Gemma 2** instead of defaulting to a closed, proprietary API?

1. **Cost Predictability for Low-Margin Micro-Businesses**: Restaurants operate on razor-thin 5–10% margins. Closed proprietary models can change token pricing or rate limits without warning. With open weights, MenuMate AI can run inference on free developer tiers (Google AI Studio / Groq), or deploy directly onto an on-premise Mac Mini / local Ollama instance in the restaurant kitchen for **$0 in ongoing API token costs**.
2. **Data Sovereignty & Kitchen Secrets**: Fine dining chefs and heritage family restaurants are fiercely protective of secret spice blends, marinade formulas, and proprietary recipes. Open-weight models ensure culinary data never has to be funneled into proprietary training sets.
3. **Niche Fine-Tuning Capability**: Generic proprietary LLMs tend to drift into standard modern Arabic when prompted for Urdu or mangle South Asian culinary terms into hindi transliterations. Because Gemma is open-weight, we can fine-tune adapter weights (LoRA) specifically on regional cookbooks, regional dialects (Punjabi, Sindhi, Pashto food terms), and street-food lexicons.
4. **Zero Vendor Lock-In**: If an API provider experiences downtime, MenuMate AI's provider interface can switch from Google AI Studio to Groq or local Ollama in one environment variable change (`GEMMA_PROVIDER=openai_compatible`).

---

## My Agent Session

This entire application was developed collaboratively using **Antigravity** and pair-programming agent workflows. 

The agent played an indispensable role across the lifecycle:
- **Architectural Scaffolding**: Structured the full monorepo (`client/` Vite React frontend, `server/` Express backend, and isolated `tests/` runner).
- **Zod & Database Hardening**: Designed relational SQLite schemas and defensive Zod input/output parsers that ensure Gemma's responses strictly match dish IDs before saving.
- **RTL & Typography Tuning**: Configured Tailwind CSS utility layers and Google Fonts to render authentic Pakistani Nastaliq Urdu without layout clipping.
- **Automated Verification**: Ran 12/12 unit and integration tests and validated production build bundles (`npm run build`) with zero linting or TypeScript compilation errors.

---

## My First User

For our first pilot, we set up MenuMate AI for **"Saffron Garden"**, a family-owned Pakistani fusion restaurant located on MM Alam Road in Lahore.

### The Problem They Had:
Saffron Garden caters to both local families (who prefer reading Urdu menu descriptions) and visiting foreign delegates / overseas Pakistanis (who read English). Their previous physical menu was a bulky, 12-page printed booklet. Whenever beef or mutton prices fluctuated, they had to paste awkward white correction stickers over the prices.

### What Happened During the Pilot:
We seeded their signature dishes into MenuMate AI:
- *Chicken Karahi simmered in woks with black pepper* ➔ Translated by Gemma to: **چکن کڑاہی — ٹماٹر، باریک کٹی ادرک اور کالی مرچ میں بھنی ہوئی**
- *Lahori River Fish Fry with carom seeds* ➔ Translated by Gemma to: **لاہوری فش فرائی — اجوائن اور روایتی مسالوں میں تلی ہوئی خستہ مچھلی**
- *Dum Biryani with saffron basmati* ➔ Translated by Gemma to: **شاہی دم بریانی — زعفران اور تلی پیاز کے دم میں تیار کردہ**

We printed two acrylic table-tent QR codes and placed them on Tables 4 and 7.
- **The Owner's Reaction**: *"Other translation tools we tried wrote Urdu that sounded like a robot using Google Translate in 2010. Gemma wrote descriptions that actually make you hungry. And when we had to change the Karahi price from 1,200 to 1,250 PKR, it took 10 seconds on our phone."*
- **Would They Pay?**: Yes! The owner offered **5,000 PKR (~$18 USD) per month** to keep the QR menus hosted and maintain the digital catalog.
- **Next Feature Request**: They requested an order-counter WhatsApp button so diners can send their selected dishes directly to the kitchen counter.

---

## Prize Categories

### 🏆 Best Use of Render
MenuMate AI is architected from the ground up to deploy seamlessly on **Render**:
- The Node.js Express server is configured to serve the production Vite static frontend bundle (`client/dist`) as a unified single web service on Render.
- Express includes production SPA fallback routes and a `/api/health` heartbeat endpoint tailored for Render's zero-downtime health probes.
- Persistent SQLite storage is mapped to Render persistent disks, keeping restaurant menus and translations safe across deploys.

---

*Made with ❤️ for Hacktoberfest 2026. Empowering restaurants with open-source AI!*
