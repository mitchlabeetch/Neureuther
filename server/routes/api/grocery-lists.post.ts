// POST /api/grocery-lists — create a custom grocery list
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    name?: string;
    emoji?: string;
  }>(event);

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }

  const id = crypto.randomUUID();
  const name = body.name.trim();
  const emoji = body.emoji?.trim() || "🛒";

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM grocery_lists`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`
    INSERT INTO grocery_lists (id, name, emoji, sort_order)
    VALUES (${id}, ${name}, ${emoji}, ${nextSort})
  `;

  return {
    id,
    name,
    emoji,
    archived: false,
    sortOrder: nextSort,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});
