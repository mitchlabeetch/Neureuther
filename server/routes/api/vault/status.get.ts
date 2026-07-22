// GET /api/vault/status — returns vault access info for the authenticated user.
// Protected by server/middleware/auth.ts — only Neon Auth sessions pass through.
import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { getSessionFromCookie } from "../../../utils/session";

export default defineHandler(async (event) => {
  const cookie = event.node?.req?.headers?.cookie ?? null;
  const session = await getSessionFromCookie(cookie);

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return {
    authenticated: true,
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  };
});