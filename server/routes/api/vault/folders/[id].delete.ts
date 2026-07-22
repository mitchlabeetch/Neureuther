// DELETE /api/vault/folders/:id — remove a folder and all its files (cascade).
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const userId = (event.context as Record<string, unknown>).userId as
    | string
    | undefined;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  // Files are removed by the ON DELETE CASCADE foreign key.
  await sql`DELETE FROM vault_folders WHERE id = ${id}`;
  return { ok: true };
});
