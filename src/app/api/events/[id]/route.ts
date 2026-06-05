import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimitAndAuth, jsonError } from "@/lib/api-utils";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withRateLimitAndAuth(request, async () => {
    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        photos: {
          orderBy: { uploadedAt: "desc" },
        },
        _count: { select: { photos: true } },
      },
    });

    if (!event) {
      return jsonError("Event not found", 404);
    }

    const totalDownloads = event.photos.reduce(
      (sum, p) => sum + p.downloadCount,
      0,
    );

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        qrCodeUrl: event.qrCodeUrl,
        createdAt: event.createdAt.toISOString(),
        photoCount: event._count.photos,
        totalDownloads,
        photos: event.photos.map((p) => ({
          id: p.id,
          filename: p.filename,
          thumbnail: p.thumbnail,
          originalUrl: p.originalUrl,
          uploadedAt: p.uploadedAt.toISOString(),
          downloadCount: p.downloadCount,
          status: p.status,
        })),
      },
    });
  });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimitAndAuth(request, async () => {
    const { id } = await context.params;

    const event = await prisma.event.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!event) {
      return jsonError("Event not found", 404);
    }

    const urlsToDelete = [
      event.qrCodeUrl,
      ...event.photos.flatMap((p) => [p.originalUrl, p.thumbnail]),
    ].filter(Boolean) as string[];

    // Delete from database first
    await prisma.event.delete({ where: { id } });

    // Then delete from R2
    await Promise.allSettled(
      urlsToDelete.map(async (url) => {
        const key = extractKeyFromUrl(url);
        if (key) {
          await deleteFromR2(key);
        }
      }),
    );

    return NextResponse.json({ success: true });
  });
}
