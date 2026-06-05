import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  rateLimitHeaders,
  type RateLimitResult,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { auth } from "@/lib/auth";

export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  type: "general" | "upload" = "general",
): Promise<NextResponse> {
  const ip = getClientIp(request);
  const result: RateLimitResult = await checkRateLimit(ip, type);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: rateLimitHeaders(result),
      },
    );
  }

  return handler();
}

export async function withAuth(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user) {
    return jsonError("Unauthorized", 401);
  }

  return handler();
}

export async function withRateLimitAndAuth(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimitType: "general" | "upload" = "general",
): Promise<NextResponse> {
  return withRateLimit(
    request,
    async () => {
      return withAuth(handler);
    },
    rateLimitType,
  );
}

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}
