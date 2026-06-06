import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_BUCKET = "photos";

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration is incomplete");
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabase;
}

/**
 * Check if Supabase Storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Get the public URL for a file in storage
 */
export function getPublicUrl(path: string): string | null {
  if (!isStorageConfigured()) {
    console.warn("[Storage] Cannot get public URL - storage not configured");
    return null;
  }

  const { data } = getClient().storage.from(SUPABASE_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  console.log("[Storage] Generated public URL:", {
    path,
    bucket: SUPABASE_BUCKET,
    publicUrl,
  });
  return publicUrl;
}

/**
 * Upload a file to Supabase Storage
 */
export async function uploadToStorage(
  path: string,
  body: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!isStorageConfigured()) {
    console.warn("[Storage] Not configured, skipping upload for:", path);
    return null;
  }

  const client = getClient();

  const { error } = await client.storage
    .from(SUPABASE_BUCKET)
    .upload(path, body, {
      contentType,
      cacheControl: "31536000",
      upsert: true,
    });

  if (error) {
    console.error("[Storage] Upload failed:", error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  return getPublicUrl(path);
}

/**
 * Delete a file from Supabase Storage
 */
export async function deleteFromStorage(path: string): Promise<void> {
  if (!isStorageConfigured()) {
    console.warn("[Storage] Not configured, skipping delete for:", path);
    return;
  }

  const client = getClient();

  const { error } = await client.storage.from(SUPABASE_BUCKET).remove([path]);

  if (error) {
    console.error("[Storage] Delete failed:", error);
  }
}

/**
 * Download a file from Supabase Storage
 */
export async function getFromStorage(path: string): Promise<Buffer | null> {
  if (!isStorageConfigured()) {
    console.warn("[Storage] Not configured, skipping fetch for:", path);
    return null;
  }

  const client = getClient();

  const { data, error } = await client.storage
    .from(SUPABASE_BUCKET)
    .download(path);

  if (error) {
    console.error("[Storage] Download failed:", error);
    throw new Error(`Download failed: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Extract the storage path from a public URL
 */
export function extractPathFromUrl(url: string): string | null {
  if (!SUPABASE_URL) return null;

  // URL format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
  const prefix = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
  if (!url.startsWith(prefix)) {
    return null;
  }
  return url.slice(prefix.length);
}

/**
 * Build a storage path for an event's files
 */
export function buildStoragePath(
  eventSlug: string,
  type: "original" | "thumbnail" | "qr",
  filename: string,
): string {
  return `events/${eventSlug}/${type}/${filename}`;
}

// Legacy alias for backwards compatibility
export const buildStorageKey = buildStoragePath;
