import sharp from "sharp";
import { prisma } from "./prisma";
import {
  getFromStorage,
  uploadToStorage,
  extractPathFromUrl,
  isStorageConfigured,
} from "./storage";

const THUMBNAIL_WIDTH = 400;

export async function generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .rotate()
    .resize({
      width: THUMBNAIL_WIDTH,
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

export async function validateImageBuffer(buffer: Buffer): Promise<{
  width: number;
  height: number;
  format: string;
}> {
  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error("Invalid image file");
  }

  return {
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
  };
}

/**
 * Background thumbnail generation for a photo.
 * Downloads original from storage, generates thumbnail, uploads to storage, updates DB.
 * Skips processing if storage is not configured.
 */
export async function processThumbnail(
  photoId: string,
  originalUrl: string,
  thumbnailPath: string,
): Promise<void> {
  if (!isStorageConfigured()) {
    console.warn("[Thumbnail] Storage not configured, skipping for:", photoId);
    await prisma.photo
      .update({
        where: { id: photoId },
        data: { status: "ready" },
      })
      .catch(console.error);
    return;
  }

  try {
    // Extract path from original URL to download from storage
    const originalPath = extractPathFromUrl(originalUrl);
    if (!originalPath) {
      throw new Error("Could not extract path from original URL");
    }

    // Download original from storage
    const originalBuffer = await getFromStorage(originalPath);
    if (!originalBuffer) {
      throw new Error("Failed to retrieve original image from storage");
    }

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(originalBuffer);

    // Upload thumbnail to storage
    const thumbnailUrl = await uploadToStorage(
      thumbnailPath,
      thumbnailBuffer,
      "image/jpeg",
    );

    // Update photo record with thumbnail URL and status
    await prisma.photo.update({
      where: { id: photoId },
      data: {
        thumbnail: thumbnailUrl,
        status: "ready",
      },
    });
  } catch (error) {
    console.error(`Thumbnail processing failed for photo ${photoId}:`, error);

    // Mark as failed
    await prisma.photo
      .update({
        where: { id: photoId },
        data: { status: "failed" },
      })
      .catch(console.error);

    throw error;
  }
}
