// PATCH /api/checklist-items/:id — rename a task.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ label?: string }>(event);
  if (!body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "label is required" });
  }

  await sql`UPDATE checklist_items SET label = ${body.label.trim()}
            WHERE id = ${id}`;
  return { ok: true };
});
