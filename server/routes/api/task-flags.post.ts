// POST /api/task-flags — create a new task flag (id optional).
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    name?: string;
    color?: string;
  }>(event);

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }
  if (!body?.color || !/^#[0-9a-fA-F]{6}$/.test(body.color)) {
    throw createError({
      statusCode: 400,
      statusMessage: "color must be a hex string like #AABBCC",
    });
  }

  const id = body.id?.trim() || `flag-${crypto.randomUUID()}`;
  const name = body.name.trim();
  const color = body.color;

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM task_flags`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  const rows = await sql`INSERT INTO task_flags (id, name, color, sort_order)
                         VALUES (${id}, ${name}, ${color}, ${nextSort})
                         RETURNING id, name, color, sort_order, created_at`;

  const r = rows[0] as {
    id: string;
    name: string;
    color: string;
    sort_order: number;
    created_at: string;
  };
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    sortOrder: Number(r.sort_order) || 0,
    createdAt: new Date(r.created_at).toISOString(),
  };
});
