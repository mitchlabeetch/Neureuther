// PUT /api/vault/folders/:id — rename / re-color a folder.
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

const ALLOWED_COLORS = new Set([
  "#A78BFA",
  "#FDA172",
  "#69D2A6",
  "#FBBF24",
  "#F472B6",
  "#38BDF8",
  "#FF6B6B",
  "#818CF8",
  "#34D399",
  "#FB7185",
]);

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

  const body = await readBody<{
    name?: string;
    color?: string;
    description?: string | null;
  }>(event);

  if (
    !body ||
    (body.name === undefined &&
      body.color === undefined &&
      body.description === undefined)
  ) {
    throw createError({ statusCode: 400, statusMessage: "nothing to update" });
  }

  if (body.name !== undefined) {
    const trimmed = body.name.trim();
    if (!trimmed || trimmed.length > 80) {
      throw createError({
        statusCode: 400,
        statusMessage: "name must be 1-80 chars",
      });
    }
  }

  if (body.color !== undefined && !ALLOWED_COLORS.has(body.color)) {
    throw createError({ statusCode: 400, statusMessage: "invalid color" });
  }

  await sql`
    UPDATE vault_folders SET
      name = COALESCE(${body.name?.trim() ?? null}, name),
      color = COALESCE(${body.color ?? null}, color),
      description = COALESCE(${body.description ?? null}, description),
      updated_at = now()
    WHERE id = ${id}
  `;

  return { ok: true };
});
