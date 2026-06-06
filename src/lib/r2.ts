import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET ?? "event-photos";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

/**
 * Check if R2 is fully configured
 */
export function isR2Configured(): boolean {
  return !!(
    R2_ACCOUNT_ID &&
    R2_ACCESS_KEY_ID &&
    R2_SECRET_ACCESS_KEY &&
    R2_PUBLIC_URL
  );
}

function getClient(): S3Client {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 configuration is incomplete");
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
}

let client: S3Client | null = null;

function s3(): S3Client {
  if (!client) {
    client = getClient();
  }
  return client;
}

export function getPublicUrl(key: string): string | null {
  if (!R2_PUBLIC_URL) {
    return null;
  }
  const base = R2_PUBLIC_URL.replace(/\/$/, "");
  return `${base}/${key}`;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!isR2Configured()) {
    console.warn("[R2] Storage not configured, skipping upload for:", key);
    return null;
  }

  await s3().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return getPublicUrl(key);
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!isR2Configured()) {
    console.warn("[R2] Storage not configured, skipping delete for:", key);
    return;
  }

  await s3().send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );
}

export async function getFromR2(key: string): Promise<Buffer | null> {
  if (!isR2Configured()) {
    console.warn("[R2] Storage not configured, skipping fetch for:", key);
    return null;
  }

  const response = await s3().send(
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
    }),
  );

  if (!response.Body) {
    throw new Error("Failed to retrieve object from R2");
  }

  const chunks: Uint8Array[] = [];
  for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds: number = 3600,
): Promise<string | null> {
  if (!isR2Configured()) {
    console.warn("[R2] Storage not configured, cannot generate presigned URL");
    return null;
  }

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  return getSignedUrl(s3(), command, { expiresIn: expiresInSeconds });
}

export function extractKeyFromUrl(url: string): string | null {
  if (!R2_PUBLIC_URL) return null;
  const prefix = `${R2_PUBLIC_URL.replace(/\/$/, "")}/`;
  if (!url.startsWith(prefix)) {
    return null;
  }
  return url.slice(prefix.length);
}

export function buildStorageKey(
  eventSlug: string,
  type: "original" | "thumbnail" | "qr",
  filename: string,
): string {
  return `events/${eventSlug}/${type}/${filename}`;
}
