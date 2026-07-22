// Auth middleware — gates /api/vault/* routes behind Neon Auth.
// Only vault routes require authentication; the rest of the app is public.
import { defineHandler } from "nitro";
import { getRequestURL, getRequestHeader, createError } from "nitro/h3";
import { getSessionFromCookie } from "../utils/session";

// Public prefixes that skip auth entirely
const PUBLIC_PREFIXES = [
  "/api/auth/",
  "/api/verify-app-pin",
];

// Vault routes require auth
const VAULT_PREFIX = "/api/vault/";

export default defineHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  // Allow public prefixes
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return;
  }

  // Only enforce auth on vault routes
  if (!pathname.startsWith(VAULT_PREFIX)) return;

  // Allow SPA routes (not /api/)
  if (!pathname.startsWith("/api/")) return;

  const cookie = getRequestHeader(event, "cookie") ?? null;
  const session = await getSessionFromCookie(cookie);

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  // Stash user id on event context for downstream handlers
  (event.context as Record<string, unknown>).userId = session.user.id;
});