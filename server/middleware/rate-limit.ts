// Rate-limiting middleware — simple in-memory token bucket.
// Runs on every request. Limits write endpoints to prevent abuse.
import { defineHandler } from "nitro";
import { getRequestURL, createError } from "nitro/h3";

// ── Config ─────────────────────────────────────────────────────────────
const WINDOW_MS = 60_000; // 1 minute
const WRITE_LIMIT = 30; // max write requests per minute per IP
const PIN_LIMIT = 5; // max PIN attempts per minute per IP

const buckets = new Map<string, { count: number; resetAt: number }>();

type RequestLike = {
  node?: {
    req?: {
      headers?: Record<string, string | string[] | undefined>;
      socket?: { remoteAddress?: string };
    };
  };
};

function getClientKey(event: RequestLike): string {
  const headers = event.node?.req?.headers ?? {};
  const forwardedHeader = headers["x-forwarded-for"];
  const forwarded = Array.isArray(forwardedHeader) ? forwardedHeader[0] ?? "" : forwardedHeader ?? "";
  const ip = forwarded.split(",")[0]?.trim() || event.node?.req?.socket?.remoteAddress || "unknown";
  return ip;
}

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count++;
  return true;
}

// Periodic cleanup of stale buckets (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  }, 300_000);
}

export default defineHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;
  const method = event.method?.toUpperCase() ?? "GET";

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) return;

  const key = getClientKey(event);

  // Stricter limit on PIN verification
  if (pathname === "/api/verify-app-pin" || pathname === "/api/money/personal/verify-pin") {
    if (!checkRateLimit(`${key}:pin`, PIN_LIMIT)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many PIN attempts. Try again in a minute.",
      });
    }
    return;
  }

  // Write operations (POST, PUT, DELETE) get the write limit
  if (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH") {
    if (!checkRateLimit(`${key}:write`, WRITE_LIMIT)) {
      throw createError({
        statusCode: 429,
        statusMessage: "Too many requests. Slow down.",
      });
    }
  }

  // GET requests are not rate-limited (read-only, public household data)
});
