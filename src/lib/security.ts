import { v4 as uuidv4 } from "uuid";
import xss from "xss";

const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function getMaxUploadBytes(): number {
  const mb = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "50", 10);
  return mb * 1024 * 1024;
}

export function sanitizeFilename(originalName: string): string {
  // Remove path components
  const basename = originalName.split(/[\\/]/).pop() ?? originalName;
  // Remove dangerous characters and limit length
  const sanitized = basename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .slice(0, 200);

  if (!sanitized || sanitized === "." || sanitized === "..") {
    return `${uuidv4()}.jpg`;
  }

  return sanitized;
}

export function validateFileExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.has(ext) : false;
}

export function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType);
}

export function getExtensionFromMime(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null;
}

export function generateSecureFilename(mimeType: string): string {
  const ext = getExtensionFromMime(mimeType) ?? "jpg";
  return `${uuidv4()}.${ext}`;
}

export function preventPathTraversal(input: string): string {
  // Remove any path traversal attempts
  return input
    .replace(/\.\./g, "")
    .replace(/[\\/]/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/+/, "");
}

export function sanitizeString(input: string, maxLength: number = 200): string {
  // Use xss library to sanitize HTML/script tags
  const cleaned = xss(input, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script", "style"],
  });
  // Remove control characters and limit length
  return cleaned
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

export function getClientIp(request: Request): string {
  // Vercel-specific headers
  const vercelIp = request.headers.get("x-real-ip");
  if (vercelIp) return vercelIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return "unknown";
}
