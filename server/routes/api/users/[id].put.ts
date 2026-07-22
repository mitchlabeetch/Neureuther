// PATCH /api/users/:id — update name/color/emoji.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{
    name?: string;
    color?: string;
    emoji?: string;
  }>(event);

  if (
      !body ||
      (body.name === undefined &&
        body.color === undefined &&
        body.emoji === undefined)
    ) {
      throw createError({ statusCode: 400, statusMessage: "nothing to update" });
    }
  
    const hasColor = body.color !== undefined;
    if (hasColor && !/^#[0-9a-fA-F]{6}$/.test(body.color!)) {
      throw createError({
        statusCode: 400,
        statusMessage: "color must be a hex string like #AABBCC",
      });
    }
  
    await sql`UPDATE users SET
                name  = COALESCE(${body.name?.trim() ?? null}, name),
                color = COALESCE(${body.color ?? null}, color),
                emoji = COALESCE(${body.emoji ?? null}, emoji)
              WHERE id = ${id}`;

  return { ok: true };
});
