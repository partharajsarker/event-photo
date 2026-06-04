type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000", 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "100", 10);

export function checkRateLimit(
  identifier: string
): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || now >= entry.resetAt) {
    store.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { allowed: true };
}

export function rateLimitHeaders(retryAfter?: number): HeadersInit {
  if (retryAfter) {
    return { "Retry-After": String(retryAfter) };
  }
  return {
    "X-RateLimit-Limit": String(MAX_REQUESTS),
    "X-RateLimit-Window": String(WINDOW_MS),
  };
}
