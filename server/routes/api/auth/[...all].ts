// Catch-all proxy: forwards /api/auth/* → NEON_AUTH_BASE_URL/<path>
// Handles __Secure- cookie name rewriting for HTTP dev environments.
import { defineHandler } from "nitro";
import {
  getRequestHeaders,
  getRequestURL,
  readRawBody,
} from "nitro/h3";

const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;

if (!NEON_AUTH_BASE_URL) {
  throw new Error("Missing NEON_AUTH_BASE_URL environment variable");
}

const FORWARDED_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "authorization",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "user-agent",
  "x-forwarded-for",
]);

export default defineHandler(async (event) => {
  const url = getRequestURL(event);
  const upstreamPath = url.pathname.startsWith("/api/auth")
    ? url.pathname.slice("/api/auth".length) || "/"
    : url.pathname;
  const upstreamUrl = `${NEON_AUTH_BASE_URL}${upstreamPath}${url.search}`;

  // Build forwarded headers from the allowlist only
  const forwardedHeaders = new Headers();
  const incomingHeaders = getRequestHeaders(event);

  for (const [key, value] of Object.entries(incomingHeaders)) {
    const headerName = key.toLowerCase();
    if (!value || !FORWARDED_REQUEST_HEADERS.has(headerName)) continue;
    forwardedHeaders.set(headerName, value);
  }

  // Restore upstream cookie names (way up): __Secure_ → __Secure-, __Host_ → __Host-
  const rawCookie = forwardedHeaders.get("cookie");
  if (rawCookie !== null) {
    const restored = rawCookie
      .replaceAll("__Secure_", "__Secure-")
      .replaceAll("__Host_", "__Host-");
    if (restored.length === 0) {
      forwardedHeaders.delete("cookie");
    } else {
      forwardedHeaders.set("cookie", restored);
    }
  }

  // Read body for non-GET/HEAD
  let body: Buffer | undefined;
  if (event.method !== "GET" && event.method !== "HEAD") {
    body = await readRawBody(event, false);
  }

  const upstream = await fetch(upstreamUrl, {
    method: event.method,
    headers: forwardedHeaders,
    body: body as BodyInit | undefined,
    redirect: "manual",
  });

  // Build response headers, rewriting Set-Cookie for HTTP dev
  const responseHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    responseHeaders.set(key, value);
  }

  const setCookieValues = upstream.headers.getSetCookie?.() ?? [];

  for (let c of setCookieValues) {
    // Only rewrite cookies when the browser is connecting over HTTP
    if (url.protocol === "http:") {
      // 1. Rename __Secure- / __Host- so the browser accepts them
      c = c.replaceAll("__Secure-", "__Secure_").replaceAll("__Host-", "__Host_");
      // 2. Strip Secure, Partitioned (fixed strings, no regex)
      c = c.replaceAll("; Secure", "").replaceAll(";Secure", "");
      c = c.replaceAll("; Partitioned", "").replaceAll(";Partitioned", "");
      // 3. Strip Domain (variable value — this is the only regex)
      c = c.replace(/;[ ]*Domain=[^;]*/gi, "");
      // 4. Rewrite SameSite=None → SameSite=Lax for HTTP
      c = c.replaceAll("; SameSite=None", "; SameSite=Lax").replaceAll(";SameSite=None", ";SameSite=Lax");
    }
    // 5. Force Path=/ so the cookies are sent for every route, not just
    //    the /api/auth/* prefix Neon Auth's response came from. Without this
    //    the browser only attaches the session cookie to auth routes, and
    //    /api/vault/* (and any other auth-gated route) sees no cookie and
    //    401s even right after a successful sign-in.
    if (/[ ;]Path=/i.test(c)) {
      c = c.replace(/[ ;]Path=[^;]*/gi, "; Path=/");
    } else {
      c = `${c}; Path=/`;
    }
    responseHeaders.append("set-cookie", c);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
});