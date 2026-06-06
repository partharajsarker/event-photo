import QRCode from "qrcode";
import {
  uploadToStorage,
  buildStoragePath,
  isStorageConfigured,
} from "./storage";

/**
 * Generate and store QR code image.
 * Returns null if storage is not configured.
 */
export async function generateAndStoreQrCode(
  eventSlug: string,
  publicUrl: string,
): Promise<string | null> {
  if (!isStorageConfigured()) {
    console.warn(
      "[QR] Storage not configured, skipping QR code generation for event:",
      eventSlug,
    );
    return null;
  }

  const qrBuffer = await QRCode.toBuffer(publicUrl, {
    type: "png",
    width: 512,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });

  const path = buildStoragePath(eventSlug, "qr", "qr-code.png");
  return uploadToStorage(path, qrBuffer, "image/png");
}

export function getEventPublicUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/event/${slug}`;
}
