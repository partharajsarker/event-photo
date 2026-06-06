import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  withRateLimit,
  withRateLimitAndAuth,
  jsonError,
} from "@/lib/api-utils";
import { uploadQuerySchema } from "@/lib/validation";
import {
  generateSecureFilename,
  getMaxUploadBytes,
  preventPathTraversal,
  validateFileExtension,
  validateMimeType,
} from "@/lib/security";
import {
  uploadToStorage,
  buildStoragePath,
  getPublicUrl,
  isStorageConfigured,
} from "@/lib/storage";
import { processThumbnail, validateImageBuffer } from "@/lib/thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET: Not used with Supabase Storage (no presigned URLs needed)
 * Direct upload via POST is supported
 */
export async function GET(request: NextRequest) {
  return withRateLimitAndAuth(request, async () => {
    return jsonError(
      "Direct upload via POST is supported. Presigned URLs not available.",
      400,
    );
  });
}

/**
 * POST: Upload photos to Supabase Storage
 */
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    async () => {
      if (!isStorageConfigured()) {
        return jsonError(
          "Storage not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
          503,
        );
      }

      try {
        const { searchParams } = new URL(request.url);
        const queryResult = uploadQuerySchema.safeParse({
          eventSlug: searchParams.get("eventSlug"),
        });

        if (!queryResult.success) {
          return jsonError(
            "Invalid event slug",
            400,
            queryResult.error.flatten(),
          );
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
            return jsonError(
              "No file provided. Use 'file' or 'image' field.",
              400,
            );
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
          return jsonError(
            "Invalid file type. Allowed: jpg, jpeg, png, webp",
            400,
          );
        }

        if (!validateFileExtension(originalFilename)) {
          return jsonError(
            "Invalid file extension. Allowed: jpg, jpeg, png, webp",
            400,
          );
        }

        await validateImageBuffer(imageBuffer);

        const secureFilename = generateSecureFilename(mimeType);
        const originalPath = buildStoragePath(
          safeSlug,
          "original",
          secureFilename,
        );
        const thumbnailPath = buildStoragePath(
          safeSlug,
          "thumbnail",
          secureFilename.replace(/\.[^.]+$/, ".jpg"),
        );

        // Upload original to Supabase Storage
        const originalUrl = await uploadToStorage(
          originalPath,
          imageBuffer,
          mimeType,
        );

        if (!originalUrl) {
          return jsonError("Failed to upload file to storage", 503);
        }

        // Create photo record
        const photo = await prisma.photo.create({
          data: {
            eventId: event.id,
            filename: secureFilename,
            originalUrl,
            status: "processing",
          },
        });

        // Process thumbnail in background
        processThumbnail(photo.id, originalUrl, thumbnailPath).catch(
          (error) => {
            console.error(
              `Thumbnail processing failed for photo ${photo.id}:`,
              error,
            );
          },
        );

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
