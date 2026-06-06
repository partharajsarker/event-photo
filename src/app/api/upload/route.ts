import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, jsonError } from "@/lib/api-utils";
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
  isStorageConfigured,
} from "@/lib/storage";
import { processThumbnail, validateImageBuffer } from "@/lib/thumbnail";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET: Returns API documentation for the upload endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: "POST /api/upload",
    description: "Upload photos to an event",
    usage: {
      method: "POST",
      url: "/api/upload?eventSlug=<event-slug>",
      contentType: "multipart/form-data",
      body: {
        file: "Image file (jpg, png, webp)",
      },
    },
    supportedFormats: ["jpg", "jpeg", "png", "webp"],
    maxSizeMB: getMaxUploadBytes() / 1024 / 1024,
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

        console.log("[Upload] Step 1: Looking up event:", {
          eventSlug,
          safeSlug,
        });

        const event = await prisma.event.findUnique({
          where: { slug: safeSlug },
        });

        if (!event) {
          console.error("[Upload] Event not found:", { safeSlug });
          return jsonError("Event not found", 404);
        }

        console.log("[Upload] Step 2: Event found:", {
          eventId: event.id,
          eventName: event.name,
        });

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

        console.log("[Upload] Step 3: File received:", {
          originalFilename,
          mimeType,
          size: imageBuffer.length,
        });

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

        console.log("[Upload] Step 4: Uploading to storage:", {
          originalPath,
          thumbnailPath,
        });

        // Upload original to Supabase Storage
        const originalUrl = await uploadToStorage(
          originalPath,
          imageBuffer,
          mimeType,
        );

        if (!originalUrl) {
          console.error("[Upload] Storage upload returned null");
          return jsonError("Failed to upload file to storage", 503);
        }

        console.log("[Upload] Step 5: Storage upload success:", {
          originalUrl,
        });

        // Create photo record
        console.log("[Upload] Step 6: Creating Photo record:", {
          eventId: event.id,
          filename: secureFilename,
        });

        let photo;
        try {
          photo = await prisma.photo.create({
            data: {
              eventId: event.id,
              filename: secureFilename,
              originalUrl,
              status: "processing",
            },
          });
          console.log("[Upload] Step 7: Photo record created:", {
            photoId: photo.id,
            eventId: photo.eventId,
          });
        } catch (dbError) {
          console.error("[Upload] Database error creating photo:", {
            error: dbError instanceof Error ? dbError.message : String(dbError),
            stack: dbError instanceof Error ? dbError.stack : undefined,
            eventId: event.id,
            filename: secureFilename,
            originalUrl,
          });

          // Attempt to delete the uploaded file since DB write failed
          await import("@/lib/storage").then(({ deleteFromStorage }) =>
            deleteFromStorage(originalPath).catch(console.error),
          );

          return jsonError(
            `Database error: ${dbError instanceof Error ? dbError.message : "Unknown error"}`,
            500,
          );
        }

        // Process thumbnail in background
        processThumbnail(photo.id, originalUrl, thumbnailPath).catch(
          (error) => {
            console.error(
              `[Upload] Thumbnail processing failed for photo ${photo.id}:`,
              error,
            );
          },
        );

        console.log("[Upload] Step 8: Upload complete:", { photoId: photo.id });

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
        console.error("[Upload] Unexpected error:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        const message =
          error instanceof Error ? error.message : "Upload failed";
        return jsonError(message, 500);
      }
    },
    "upload",
  );
}
