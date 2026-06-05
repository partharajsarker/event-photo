import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, jsonError } from "@/lib/api-utils";
import { photosQuerySchema } from "@/lib/validation";
import type { PaginatedPhotos } from "@/types";

export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    const { searchParams } = new URL(request.url);
    const parsed = photosQuerySchema.safeParse({
      eventSlug: searchParams.get("eventSlug"),
      cursor: searchParams.get("cursor") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      return jsonError("Invalid query parameters", 400, parsed.error.flatten());
    }

    const { eventSlug, cursor, limit } = parsed.data;

    const event = await prisma.event.findUnique({
      where: { slug: eventSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!event) {
      return jsonError("Event not found", 404);
    }

    // Cursor-based pagination
    const photos = await prisma.photo.findMany({
      where: {
        eventId: event.id,
        status: "ready", // Only return processed photos
      },
      orderBy: { uploadedAt: "desc" },
      take: limit + 1, // Fetch one extra to determine hasMore
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1, // Skip the cursor item
          }
        : {}),
    });

    const hasMore = photos.length > limit;
    const items = hasMore ? photos.slice(0, limit) : photos;

    const result: PaginatedPhotos = {
      photos: items.map((p) => ({
        id: p.id,
        filename: p.filename,
        thumbnail: p.thumbnail,
        originalUrl: p.originalUrl,
        uploadedAt: p.uploadedAt.toISOString(),
        downloadCount: p.downloadCount,
        status: p.status,
      })),
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
      hasMore,
    };

    return NextResponse.json({ event, ...result });
  });
}
