import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimitAndAuth, jsonError } from "@/lib/api-utils";
import { deleteFromR2, extractKeyFromUrl } from "@/lib/r2";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimitAndAuth(request, async () => {
    const { id } = await context.params;

    const photo = await prisma.photo.findUnique({ where: { id } });

    if (!photo) {
      return jsonError("Photo not found", 404);
    }

    // Delete from database first
    await prisma.photo.delete({ where: { id } });

    // Then delete from R2
    await Promise.allSettled(
      [photo.originalUrl, photo.thumbnail].filter(Boolean).map(async (url) => {
        const key = extractKeyFromUrl(url!);
        if (key) {
          await deleteFromR2(key);
        }
      }),
    );

    return NextResponse.json({ success: true });
  });
}
