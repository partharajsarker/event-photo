import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "100", 10);
const UPLOAD_MAX_REQUESTS = parseInt(
  process.env.RATE_LIMIT_UPLOAD_MAX_REQUESTS ?? "30",
  10,
);

let redis: Redis | null = null;
let generalLimiter: Ratelimit | null = null;
let uploadLimiter: Ratelimit | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) {
      throw new Error("Upstash Redis configuration is incomplete");
    }
    redis = new Redis({ url, token });
  }
  return redis;
}

function getGeneralLimiter(): Ratelimit {
  if (!generalLimiter) {
    const windowSeconds = Math.ceil(WINDOW_MS / 1000);
    generalLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${windowSeconds} s`),
      analytics: true,
      prefix: "ratelimit:general",
    });
  }
  return generalLimiter;
}

function getUploadLimiter(): Ratelimit {
  if (!uploadLimiter) {
    const windowSeconds = Math.ceil(WINDOW_MS / 1000);
    uploadLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(
        UPLOAD_MAX_REQUESTS,
        `${windowSeconds} s`,
      ),
      analytics: true,
      prefix: "ratelimit:upload",
    });
  }
  return uploadLimiter;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number; remaining: number };

export async function checkRateLimit(
  identifier: string,
  type: "general" | "upload" = "general",
): Promise<RateLimitResult> {
  try {
    const limiter =
      type === "upload" ? getUploadLimiter() : getGeneralLimiter();
    const result = await limiter.limit(identifier);

    if (result.success) {
      return { allowed: true };
    }

    return {
      allowed: false,
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      remaining: result.remaining,
    };
  } catch (error) {
    // If Redis is unavailable, allow the request but log the error
    console.error("Rate limit check failed:", error);
    return { allowed: true };
  }
}

export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  if (!result.allowed) {
    return {
      "Retry-After": String(result.retryAfter),
      "X-RateLimit-Remaining": String(result.remaining),
    };
  }
  return {};
}
