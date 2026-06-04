import QRCode from "qrcode";
import { uploadToStorage, buildStorageKey } from "./storage";

export async function generateAndStoreQrCode(
  eventSlug: string,
  publicUrl: string
): Promise<string> {
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
  return uploadToStorage(key, qrBuffer, "image/png");
}

export function getEventPublicUrl(slug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/event/${slug}`;
}
