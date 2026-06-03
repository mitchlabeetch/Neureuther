// PUT /api/task-flags/:id — rename / recolor a flag.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ name?: string; color?: string }>(event);
  const hasName =
    typeof body?.name === "string" && body.name.trim().length > 0;
  const hasColor =
    typeof body?.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color);

  if (!hasName && !hasColor) {
    throw createError({
      statusCode: 400,
      statusMessage: "name or color is required",
    });
  }

  await sql`UPDATE task_flags SET
              name  = COALESCE(${hasName ? body.name!.trim() : null}::text, name),
              color = COALESCE(${hasColor ? body.color! : null}::text, color)
            WHERE id = ${id}`;

  return { ok: true };
});
