import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRateLimit, jsonError } from "@/lib/api-utils";
import { getClientIp } from "@/lib/security";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  return withRateLimit(request, async () => {
    const { id } = await context.params;
    const ip = getClientIp(request);

    const photo = await prisma.photo.findUnique({
      where: { id },
      include: { event: { select: { slug: true, name: true } } },
    });

    if (!photo) {
      return jsonError("Photo not found", 404);
    }

    await prisma.$transaction([
      prisma.download.create({
        data: {
          photoId: photo.id,
          ipAddress: ip,
        },
      }),
      prisma.photo.update({
        where: { id: photo.id },
        data: { downloadCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      downloadUrl: photo.originalUrl,
      filename: photo.filename,
      downloadCount: photo.downloadCount + 1,
    });
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return POST(request, context);
}
