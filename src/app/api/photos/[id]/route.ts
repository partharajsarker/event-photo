import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, jsonError } from "@/lib/api-utils";
import { verifyAdminKey } from "@/lib/security";
import { deleteFromStorage, extractKeyFromUrl } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  return withRateLimit(request, async () => {
    if (!verifyAdminKey(request)) {
      return jsonError("Unauthorized", 401);
    }

    const { id } = await context.params;

    const photo = await prisma.photo.findUnique({ where: { id } });

    if (!photo) {
      return jsonError("Photo not found", 404);
    }

    await prisma.photo.delete({ where: { id } });

    await Promise.allSettled(
      [photo.originalUrl, photo.thumbnail].map(async (url) => {
        const key = extractKeyFromUrl(url);
        if (key) {
          await deleteFromStorage(key);
        }
      })
    );

    return NextResponse.json({ success: true });
  });
}
