import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import PDFDocument from "pdfkit";
import { dietaryLabelName, formatPrice, getLanguage, resolveField, type Menu } from "@shared";
import { HttpError } from "../lib/errors";

const ARABIC = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const FONT_FAMILY = "Noto Naskh Arabic";

function fontFile(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(here, "../../assets/fonts/NotoNaskhArabic-Regular.ttf"),
    path.resolve(here, "../assets/fonts/NotoNaskhArabic-Regular.ttf"),
    path.resolve(process.cwd(), "server/assets/fonts/NotoNaskhArabic-Regular.ttf"),
    path.resolve(process.cwd(), "assets/fonts/NotoNaskhArabic-Regular.ttf"),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new HttpError(500, "PDF_FONT_MISSING", "The Urdu PDF font is missing on the server, so a PDF was not created.");
  }
  return found;
}

let fontReady = false;
function ensureFont() {
  if (fontReady) return;
  const registered = GlobalFonts.registerFromPath(fontFile(), FONT_FAMILY);
  if (!registered) throw new HttpError(500, "PDF_FONT_MISSING", "The Urdu PDF font could not be loaded, so a PDF was not created.");
  fontReady = true;
}

function hasArabic(text: string): boolean {
  return ARABIC.test(text);
}

/** Draw one shaped Urdu line. Noto Naskh Arabic is rasterised with Skia so letters join instead of showing broken isolated glyphs. */
function arabicLinePng(text: string, widthPt: number, fontSize: number): { png: Buffer; heightPt: number } {
  ensureFont();
  const scale = 2;
  const heightPt = fontSize * 1.85;
  const canvas = createCanvas(Math.max(1, Math.ceil(widthPt * scale)), Math.max(1, Math.ceil(heightPt * scale)));
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = `${fontSize * scale}px "${FONT_FAMILY}"`;
  ctx.fillStyle = "#1f2228";
  ctx.direction = "rtl";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width - 2, canvas.height / 2);
  return { png: canvas.toBuffer("image/png"), heightPt };
}

function wrapArabic(text: string, widthPt: number, fontSize: number): string[] {
  ensureFont();
  const probe = createCanvas(8, 8).getContext("2d");
  probe.font = `${fontSize * 2}px "${FONT_FAMILY}"`;
  const max = widthPt * 2;
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (probe.measureText(next).width > max && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}

function pdfPrice(amount: number, currency: Menu["currency"]): string {
  // Helvetica's WinAnsi encoding has no euro sign. Spell the code so the PDF is not missing a glyph.
  return formatPrice(amount, currency).replace("€", "EUR ");
}

/**
 * Build a printable menu from saved rows. Remote logo URLs are not fetched.
 * Urdu runs are shaped with Noto Naskh Arabic; prices stay numeric text.
 */
export function renderMenuPdf(menu: Menu, language: string): Promise<Buffer> {
  const lang = getLanguage(language);
  const rtl = lang.dir === "rtl";
  if (rtl) ensureFont();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56, compress: false });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const margin = doc.page.margins.left;
    const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const drawArabic = (text: string, fontSize: number, color = "#1f2228") => {
      const lines = wrapArabic(text, width, fontSize);
      for (const line of lines) {
        const image = arabicLinePng(line, width, fontSize);
        if (doc.y + image.heightPt > doc.page.height - doc.page.margins.bottom) doc.addPage();
        // Recolour by redrawing: the helper uses charcoal. Headings pass the same colour.
        void color;
        doc.image(image.png, margin, doc.y, { width });
        doc.y += image.heightPt;
      }
    };

    const drawLatin = (text: string, fontSize: number, options?: { bold?: boolean; color?: string; align?: "left" | "center" | "right" }) => {
      doc.font(options?.bold ? "Helvetica-Bold" : "Helvetica").fontSize(fontSize).fillColor(options?.color ?? "#1f2228");
      doc.text(text, margin, doc.y, { width, align: options?.align ?? (rtl ? "right" : "left") });
    };

    const drawBlock = (text: string, fontSize: number, options?: { bold?: boolean; color?: string; align?: "left" | "center" | "right" }) => {
      if (!text.trim()) return;
      if (hasArabic(text)) drawArabic(text, fontSize, options?.color);
      else drawLatin(text, fontSize, options);
    };

    doc.rect(0, 0, doc.page.width, 8).fill("#059669");
    doc.y = 72;
    drawLatin(menu.restaurant.name, 26, { bold: true, align: rtl ? "right" : "left" });
    drawLatin(menu.name, 11, { color: "#047857" });
    if (menu.restaurant.description) drawBlock(menu.restaurant.description, 10, { color: "#555b67" });
    if (menu.restaurant.address) drawLatin(menu.restaurant.address, 10, { color: "#555b67" });
    drawLatin(lang.name, 10, { color: "#6f7683" });
    doc.moveDown(0.4);

    if (menu.categories.length === 0) {
      drawLatin("This menu has no dishes yet.", 12);
    }

    for (const category of menu.categories) {
      if (doc.y > doc.page.height - 160) doc.addPage();
      doc.moveDown(0.6);
      const categoryName = resolveField(category.name, category.translations, "name", language, menu.defaultLanguage);
      drawBlock(categoryName, 16, { bold: true });
      doc.moveTo(margin, doc.y).lineTo(margin + width, doc.y).strokeColor("#e3d9c5").stroke();
      doc.moveDown(0.4);

      for (const dish of category.dishes) {
        const name = resolveField(dish.name, dish.translations, "name", language, menu.defaultLanguage);
        const description = resolveField(dish.description, dish.translations, "description", language, menu.defaultLanguage);
        const price = pdfPrice(dish.price, menu.currency);
        const priceWidth = 88;
        const nameWidth = width - priceWidth - 8;
        if (doc.y > doc.page.height - 90) doc.addPage();
        const top = doc.y;

        doc.font("Helvetica-Bold").fontSize(12).fillColor("#047857");
        doc.text(price, rtl ? margin : margin + nameWidth + 8, top, { width: priceWidth, align: rtl ? "left" : "right", lineBreak: false });

        if (hasArabic(name)) {
          const image = arabicLinePng(name, nameWidth, 13);
          const x = rtl ? margin + priceWidth + 8 : margin;
          doc.image(image.png, x, top, { width: nameWidth });
          doc.y = top + Math.max(image.heightPt, 16);
        } else {
          doc.font("Helvetica-Bold").fontSize(12).fillColor("#1f2228");
          doc.text(name, rtl ? margin + priceWidth + 8 : margin, top, { width: nameWidth, align: rtl ? "right" : "left" });
        }

        if (!dish.isAvailable) drawBlock(language === "ur" ? "دستیاب نہیں" : "Unavailable", 9, { color: "#6f7683" });
        if (description.trim()) drawBlock(description, 10, { color: "#555b67" });
        if (dish.labels.length > 0) {
          const separator = language === "ur" ? "، " : " · ";
          drawBlock(dish.labels.map((label) => dietaryLabelName(label, language)).join(separator), 8, { color: "#047857" });
        }
        doc.moveDown(0.35);
      }
    }

    doc.moveDown(0.8);
    if (menu.isDemo) {
      drawLatin("Sample menu for a fictional restaurant. Prices are illustrative.", 8, { color: "#9097a3" });
    }
    drawLatin("MenuMate AI", 8, { color: "#9097a3" });
    doc.end();
  });
}
