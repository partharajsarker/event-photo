import { NextResponse } from "next/server";
import { checkRateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

export function withRateLimit(
  request: Request,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const ip = getClientIp(request);
  const result = checkRateLimit(ip);

  if (!result.allowed) {
    return Promise.resolve(
      NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: rateLimitHeaders(result.retryAfter),
        }
      )
    );
  }

  return handler();
}

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}
