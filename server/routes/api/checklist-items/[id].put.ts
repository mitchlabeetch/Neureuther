// PUT /api/checklist-items/:id — update a task's label and/or points.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ label?: string; points?: number }>(event);

  const hasLabel = typeof body?.label === "string" && body.label.trim().length > 0;
  const hasPoints =
    body?.points !== undefined &&
    typeof body.points === "number" &&
    Number.isFinite(body.points) &&
    body.points >= 0;

  if (!hasLabel && !hasPoints) {
    throw createError({
      statusCode: 400,
      statusMessage: "label or points is required",
    });
  }

  if (hasPoints) {
    const points = Math.floor(body.points!);
    if (hasLabel) {
      await sql`UPDATE checklist_items
                SET label = ${body.label!.trim()},
                    points = ${points}
                WHERE id = ${id}`;
    } else {
      await sql`UPDATE checklist_items
                SET points = ${points}
                WHERE id = ${id}`;
    }
  } else {
    await sql`UPDATE checklist_items
              SET label = ${body.label!.trim()}
              WHERE id = ${id}`;
  }

  return { ok: true };
});
