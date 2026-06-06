import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint to verify database state
 * GET /api/debug/db
 */
export async function GET() {
  try {
    // Get all events
    const events = await prisma.event.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Get all photos (regardless of status)
    const photos = await prisma.photo.findMany({
      select: {
        id: true,
        eventId: true,
        filename: true,
        originalUrl: true,
        thumbnail: true,
        status: true,
        uploadedAt: true,
        event: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
      take: 20,
    });

    // Get photo count by status
    const photoCounts = await prisma.photo.groupBy({
      by: ["status"],
      _count: true,
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      events: {
        count: events.length,
        items: events,
      },
      photos: {
        count: photos.length,
        byStatus: photoCounts,
        recent: photos,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Database query failed",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
