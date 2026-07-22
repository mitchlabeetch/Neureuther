// POST /api/users — create a new person.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    name?: string;
    color?: string;
    emoji?: string;
  }>(event);

  if (!body?.name?.trim() || !body.color || !body.emoji) {
      throw createError({
        statusCode: 400,
        statusMessage: "name, color and emoji are required",
      });
    }
  
    if (!/^#[0-9a-fA-F]{6}$/.test(body.color)) {
      throw createError({
        statusCode: 400,
        statusMessage: "color must be a hex string like #AABBCC",
      });
    }

  const id = body.id?.trim() || crypto.randomUUID();

  // Append at the end of the current list.
  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM users`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`INSERT INTO users (id, name, color, emoji, sort_order)
            VALUES (${id}, ${body.name.trim()}, ${body.color}, ${body.emoji}, ${nextSort})`;

  return { id, name: body.name.trim(), color: body.color, emoji: body.emoji };
});
