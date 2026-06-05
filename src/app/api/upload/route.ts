import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withRateLimit,
  withRateLimitAndAuth,
  jsonError,
} from "@/lib/api-utils";
import {
  uploadQuerySchema,
  presignedUrlSchema,
  uploadCallbackSchema,
} from "@/lib/validation";
import {
  generateSecureFilename,
  getMaxUploadBytes,
  preventPathTraversal,
  validateFileExtension,
  validateMimeType,
} from "@/lib/security";
import {
  uploadToR2,
  buildStorageKey,
  getPublicUrl,
  generatePresignedUploadUrl,
} from "@/lib/r2";
import { processThumbnail, validateImageBuffer } from "@/lib/thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET: Generate presigned upload URL for direct client-to-R2 upload
 * This bypasses Vercel body size limits for large files
 */
export async function GET(request: NextRequest) {
  return withRateLimitAndAuth(request, async () => {
    try {
      const { searchParams } = new URL(request.url);
      const parsed = presignedUrlSchema.safeParse({
        eventSlug: searchParams.get("eventSlug"),
        filename: searchParams.get("filename"),
        contentType: searchParams.get("contentType"),
      });

      if (!parsed.success) {
        return jsonError("Invalid parameters", 400, parsed.error.flatten());
      }

      const { eventSlug, filename, contentType } = parsed.data;
      const safeSlug = preventPathTraversal(eventSlug);

      const event = await prisma.event.findUnique({
        where: { slug: safeSlug },
      });

      if (!event) {
        return jsonError("Event not found", 404);
      }

      // Generate secure filename and storage key
      const secureFilename = generateSecureFilename(contentType);
      const originalKey = buildStorageKey(safeSlug, "original", secureFilename);

      // Create photo record in "processing" state
      const photo = await prisma.photo.create({
        data: {
          eventId: event.id,
          filename: filename || secureFilename,
          originalUrl: getPublicUrl(originalKey),
          status: "processing",
        },
      });

      // Generate presigned URL
      const uploadUrl = await generatePresignedUploadUrl(
        originalKey,
        contentType,
        3600,
      );

      const thumbnailKey = buildStorageKey(
        safeSlug,
        "thumbnail",
        secureFilename.replace(/\.[^.]+$/, ".jpg"),
      );

      return NextResponse.json({
        uploadUrl,
        photoId: photo.id,
        key: originalKey,
        publicUrl: getPublicUrl(originalKey),
        thumbnailKey,
      });
    } catch (error) {
      console.error("Presigned URL generation error:", error);
      return jsonError("Failed to generate upload URL", 500);
    }
  });
}

/**
 * POST: Upload callback after direct R2 upload OR direct file upload for smaller files
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      try {
        const contentType = request.headers.get("content-type") ?? "";

        // Check if this is a callback from presigned URL upload
        if (contentType.includes("application/json")) {
          return handleUploadCallback(request);
        }

        // Otherwise, handle direct file upload (backwards compatible)
        return handleDirectUpload(request);
      } catch (error) {
        console.error("Upload error:", error);
        const message =
          error instanceof Error ? error.message : "Upload failed";
        return jsonError(message, 500);
      }
    },
    "upload",
  );
}

/**
 * Handle callback after client uploads directly to R2
 */
async function handleUploadCallback(
  request: NextRequest,
): Promise<NextResponse> {
  const body = await request.json();
  const parsed = uploadCallbackSchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("Invalid callback data", 400, parsed.error.flatten());
  }

  const { photoId, originalUrl, filename } = parsed.data;

  const photo = await prisma.photo.findUnique({ where: { id: photoId } });

  if (!photo) {
    return jsonError("Photo not found", 404);
  }

  // Trigger background thumbnail generation
  const event = await prisma.event.findUnique({ where: { id: photo.eventId } });
  if (!event) {
    return jsonError("Event not found", 404);
  }

  const thumbnailKey = buildStorageKey(
    event.slug,
    "thumbnail",
    filename.replace(/\.[^.]+$/, ".jpg"),
  );

  // Start thumbnail processing (don't await - let it run in background)
  processThumbnail(photoId, originalUrl, thumbnailKey).catch((error) => {
    console.error(
      `Background thumbnail processing failed for photo ${photoId}:`,
      error,
    );
  });

  return NextResponse.json({
    success: true,
    photo: {
      id: photo.id,
      filename: photo.filename,
      originalUrl: photo.originalUrl,
      status: "processing",
      uploadedAt: photo.uploadedAt.toISOString(),
    },
  });
}

/**
 * Handle direct file upload (backwards compatible with camera uploads)
 */
async function handleDirectUpload(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const queryResult = uploadQuerySchema.safeParse({
    eventSlug: searchParams.get("eventSlug"),
  });

  if (!queryResult.success) {
    return jsonError("Invalid event slug", 400, queryResult.error.flatten());
  }

  const { eventSlug } = queryResult.data;
  const safeSlug = preventPathTraversal(eventSlug);

  const event = await prisma.event.findUnique({
    where: { slug: safeSlug },
  });

  if (!event) {
    return jsonError("Event not found", 404);
  }

  const contentLength = request.headers.get("content-length");
  const maxBytes = getMaxUploadBytes();

  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    return jsonError(
      `File too large. Maximum size is ${maxBytes / 1024 / 1024}MB`,
      413,
    );
  }

  const requestContentType = request.headers.get("content-type") ?? "";
  let imageBuffer: Buffer;
  let mimeType: string;
  let originalFilename: string;

  if (requestContentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file") ?? formData.get("image");

    if (!file || !(file instanceof File)) {
      return jsonError("No file provided. Use 'file' or 'image' field.", 400);
    }

    if (file.size > maxBytes) {
      return jsonError(
        `File too large. Maximum size is ${maxBytes / 1024 / 1024}MB`,
        413,
      );
    }

    mimeType = file.type || "application/octet-stream";
    originalFilename = file.name;
    imageBuffer = Buffer.from(await file.arrayBuffer());
  } else if (
    requestContentType.startsWith("image/") ||
    requestContentType === "application/octet-stream"
  ) {
    const arrayBuffer = await request.arrayBuffer();
    imageBuffer = Buffer.from(arrayBuffer);

    if (imageBuffer.length > maxBytes) {
      return jsonError(
        `File too large. Maximum size is ${maxBytes / 1024 / 1024}MB`,
        413,
      );
    }

    mimeType = requestContentType.startsWith("image/")
      ? requestContentType
      : "image/jpeg";
    originalFilename =
      request.headers.get("x-filename") ??
      request.headers
        .get("content-disposition")
        ?.match(/filename="?([^"]+)"?/)?.[1] ??
      "upload.jpg";
  } else {
    return jsonError(
      "Unsupported content type. Send multipart/form-data or raw image bytes.",
      415,
    );
  }

  if (!validateMimeType(mimeType)) {
    return jsonError("Invalid file type. Allowed: jpg, jpeg, png, webp", 400);
  }

  if (!validateFileExtension(originalFilename)) {
    return jsonError(
      "Invalid file extension. Allowed: jpg, jpeg, png, webp",
      400,
    );
  }

  await validateImageBuffer(imageBuffer);

  const secureFilename = generateSecureFilename(mimeType);
  const originalKey = buildStorageKey(safeSlug, "original", secureFilename);
  const thumbnailKey = buildStorageKey(
    safeSlug,
    "thumbnail",
    secureFilename.replace(/\.[^.]+$/, ".jpg"),
  );

  // Upload original to R2
  const originalUrl = await uploadToR2(originalKey, imageBuffer, mimeType);

  // Create photo record
  const photo = await prisma.photo.create({
    data: {
      eventId: event.id,
      filename: secureFilename,
      originalUrl,
      status: "processing",
    },
  });

  // Process thumbnail (can run in background)
  processThumbnail(photo.id, originalUrl, thumbnailKey).catch((error) => {
    console.error(`Thumbnail processing failed for photo ${photo.id}:`, error);
  });

  return NextResponse.json(
    {
      success: true,
      photo: {
        id: photo.id,
        filename: photo.filename,
        originalUrl,
        status: "processing",
        uploadedAt: photo.uploadedAt.toISOString(),
      },
    },
    { status: 201 },
  );
}
