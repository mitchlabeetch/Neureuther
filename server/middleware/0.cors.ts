// CORS middleware — lets the Capacitor native webviews call the API
// cross-origin with credentials.
//
// The filename is prefixed with "0." so it sorts before auth.ts and
// rate-limit.ts and therefore runs FIRST: preflight OPTIONS requests get their
// CORS headers and a 204 before any auth check can reject them.
import { defineHandler } from "nitro";
import {
  getRequestURL,
  getRequestHeader,
  setResponseHeader,
  setResponseStatus,
} from "nitro/h3";

// Capacitor serves the app from these origins depending on platform/config.
const ALLOWED_ORIGINS = new Set([
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
  "ionic://localhost",
]);

export default defineHandler((event) => {
  const url = getRequestURL(event);
  if (!url.pathname.startsWith("/api/")) return;

  const origin = getRequestHeader(event, "origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    setResponseHeader(event, "Access-Control-Allow-Origin", origin);
    setResponseHeader(event, "Access-Control-Allow-Credentials", "true");
    setResponseHeader(
      event,
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    );
    setResponseHeader(
      event,
      "Access-Control-Allow-Headers",
      "Accept, Authorization, Content-Type, X-Requested-With",
    );
    setResponseHeader(event, "Access-Control-Expose-Headers", "Content-Length, Content-Type");
    // Cache the preflight for a day and vary on Origin so intermediaries don't
    // serve one origin's headers to another.
    setResponseHeader(event, "Access-Control-Max-Age", "86400");
    setResponseHeader(event, "Vary", "Origin");
  }

  // Short-circuit preflight before auth/rate-limit run.
  if ((event.method?.toUpperCase() ?? "GET") === "OPTIONS") {
    setResponseStatus(event, 204);
    return "";
  }
});
