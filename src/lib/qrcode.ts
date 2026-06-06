import QRCode from "qrcode";
import { uploadToR2, buildStorageKey, isR2Configured } from "./r2";

/**
 * Generate and store QR code image.
 * Returns null if R2 is not configured.
 */
export async function generateAndStoreQrCode(
  eventSlug: string,
  publicUrl: string,
): Promise<string | null> {
  if (!isR2Configured()) {
    console.warn(
      "[QR] R2 not configured, skipping QR code generation for event:",
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

  const key = buildStorageKey(eventSlug, "qr", "qr-code.png");
  return uploadToR2(key, qrBuffer, "image/png");
}

export function getEventPublicUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/event/${slug}`;
}
