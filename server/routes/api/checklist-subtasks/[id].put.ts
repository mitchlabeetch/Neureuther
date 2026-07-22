// PUT /api/checklist-subtasks/:id — rename and/or toggle a sub-task.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ label?: string; completed?: boolean }>(event);
  const hasLabel =
    typeof body?.label === "string" && body.label.trim().length > 0;
  const hasCompleted =
    body && Object.prototype.hasOwnProperty.call(body, "completed");

  if (!hasLabel && !hasCompleted) {
    throw createError({
      statusCode: 400,
      statusMessage: "label or completed is required",
    });
  }

  const rows = await sql`UPDATE checklist_subtasks SET
              label = COALESCE(${hasLabel ? body.label!.trim() : null}::text, label),
              completed = CASE
                WHEN ${hasCompleted}::boolean THEN ${Boolean(body.completed)}::boolean
                ELSE completed
              END
            WHERE id = ${id}
            RETURNING id, task_id, label, completed, sort_order, created_at`;

  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: "subtask not found" });
  const row = rows[0] as { id: string; task_id: string; label: string; completed: boolean; sort_order: number; created_at: string };
  return {
    id: row.id,
    taskId: row.task_id,
    label: row.label,
    completed: Boolean(row.completed),
    sortOrder: Number(row.sort_order) || 0,
    createdAt: new Date(row.created_at).toISOString(),
  };
});
