import sharp from "sharp";
import { prisma } from "./prisma";
import { getFromR2, uploadToR2, extractKeyFromUrl, isR2Configured } from "./r2";

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
 * This can be called asynchronously after the original is uploaded.
 * Downloads original from R2, generates thumbnail, uploads to R2, updates DB.
 * Skips processing if R2 is not configured.
 */
export async function processThumbnail(
  photoId: string,
  originalUrl: string,
  thumbnailKey: string,
): Promise<void> {
  if (!isR2Configured()) {
    console.warn(
      "[Thumbnail] R2 not configured, skipping thumbnail processing for:",
      photoId,
    );
    // Mark as ready even without thumbnail (gallery will show placeholder)
    await prisma.photo
      .update({
        where: { id: photoId },
        data: { status: "ready" },
      })
      .catch(console.error);
    return;
  }

  try {
    // Extract key from original URL to download from R2
    const originalKey = extractKeyFromUrl(originalUrl);
    if (!originalKey) {
      throw new Error("Could not extract key from original URL");
    }

    // Download original from R2
    const originalBuffer = await getFromR2(originalKey);
    if (!originalBuffer) {
      throw new Error("Failed to retrieve original image from storage");
    }

    // Generate thumbnail
    const thumbnailBuffer = await generateThumbnail(originalBuffer);

    // Upload thumbnail to R2
    const thumbnailUrl = await uploadToR2(
      thumbnailKey,
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
