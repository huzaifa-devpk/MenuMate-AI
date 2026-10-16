import QRCode from "qrcode";
import type { ShareInfo } from "@shared";
import { config } from "../config";
import type { Db } from "../db/connection";
import { requireMenu } from "../db/repository";
import { isLocalBaseUrl, publicMenuUrl } from "../lib/publicUrl";

const qrOptions = { margin: 1, width: 512, errorCorrectionLevel: "M" as const };

export async function shareInfo(db: Db, menuId: string, baseUrl = config.APP_BASE_URL): Promise<ShareInfo> {
  const menu = requireMenu(db, menuId);
  const publicUrl = publicMenuUrl(baseUrl, menu.slug);
  const qrDataUrl = await QRCode.toDataURL(publicUrl, qrOptions);
  return {
    slug: menu.slug,
    isPublished: menu.isPublished,
    publicUrl,
    isLocalUrl: isLocalBaseUrl(baseUrl),
    qrDataUrl,
  };
}

export async function sharePng(db: Db, menuId: string, baseUrl = config.APP_BASE_URL): Promise<{ filename: string; png: Buffer }> {
  const menu = requireMenu(db, menuId);
  const png = await QRCode.toBuffer(publicMenuUrl(baseUrl, menu.slug), { ...qrOptions, type: "png" });
  return { filename: `${menu.slug}-qr.png`, png };
}
