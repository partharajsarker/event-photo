import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimitAndAuth, jsonError } from "@/lib/api-utils";
import { createEventSchema } from "@/lib/validation";
import { generateSlug, ensureUniqueSlug } from "@/lib/slug";
import { generateAndStoreQrCode, getEventPublicUrl } from "@/lib/qrcode";
import { sanitizeString } from "@/lib/security";
import type { EventWithStats } from "@/types";

export async function GET(request: NextRequest) {
  return withRateLimitAndAuth(request, async () => {
    const events = await prisma.event.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        photos: {
          select: { downloadCount: true },
        },
        _count: { select: { photos: true } },
      },
    });

    const result: EventWithStats[] = events.map((event) => ({
      id: event.id,
      name: event.name,
      slug: event.slug,
      qrCodeUrl: event.qrCodeUrl,
      createdAt: event.createdAt.toISOString(),
      photoCount: event._count.photos,
      totalDownloads: event.photos.reduce((sum, p) => sum + p.downloadCount, 0),
    }));

    return NextResponse.json({ events: result });
  });
}

export async function POST(request: NextRequest) {
  return withRateLimitAndAuth(request, async () => {
    try {
      const body = await request.json();
      const parsed = createEventSchema.safeParse(body);

      if (!parsed.success) {
        return jsonError("Validation failed", 400, parsed.error.flatten());
      }

      // Sanitize event name
      const sanitizedName = sanitizeString(parsed.data.name);
      if (!sanitizedName) {
        return jsonError("Invalid event name", 400);
      }

      const baseSlug = generateSlug(sanitizedName);
      if (!baseSlug) {
        return jsonError("Could not generate slug from event name", 400);
      }

      const slug = await ensureUniqueSlug(baseSlug);
      const publicUrl = getEventPublicUrl(slug);

      const event = await prisma.event.create({
        data: {
          name: sanitizedName,
          slug,
        },
      });

      const qrCodeUrl = await generateAndStoreQrCode(slug, publicUrl);

      const updated = await prisma.event.update({
        where: { id: event.id },
        data: { qrCodeUrl },
      });

      return NextResponse.json(
        {
          event: {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            qrCodeUrl: updated.qrCodeUrl,
            publicUrl,
            createdAt: updated.createdAt.toISOString(),
          },
        },
        { status: 201 },
      );
    } catch (error) {
      console.error("Create event error:", error);
      return jsonError("Failed to create event", 500);
    }
  });
}
