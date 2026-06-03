// POST /api/checklist-items — add a new daily task.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    label?: string;
  }>(event);

  if (!body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "label is required" });
  }

  const id = body.id?.trim() || crypto.randomUUID();
  const label = body.label.trim();

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM checklist_items`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`INSERT INTO checklist_items (id, label, completed, sort_order)
            VALUES (${id}, ${label}, FALSE, ${nextSort})`;

  return { id, label, completed: false, completedBy: null, completedAt: null };
});
