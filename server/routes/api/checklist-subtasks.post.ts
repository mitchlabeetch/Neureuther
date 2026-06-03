// POST /api/checklist-subtasks — add a tickable sub-task to a checklist item.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    taskId?: string;
    label?: string;
  }>(event);

  if (!body?.taskId || !body?.label?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "taskId and label are required",
    });
  }

  // Ensure the parent exists so we don't leave orphan rows.
  const parent = await sql`SELECT id FROM checklist_items WHERE id = ${body.taskId}`;
  if (parent.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "task not found" });
  }

  const id = body.id?.trim() || crypto.randomUUID();
  const label = body.label.trim();

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM checklist_subtasks WHERE task_id = ${body.taskId}`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  const rows = await sql`INSERT INTO checklist_subtasks
                          (id, task_id, label, completed, sort_order)
                        VALUES
                          (${id}, ${body.taskId}, ${label}, FALSE, ${nextSort})
                        RETURNING id, task_id, label, completed, sort_order, created_at`;

  const r = rows[0] as {
    id: string;
    task_id: string;
    label: string;
    completed: boolean;
    sort_order: number;
    created_at: string;
  };
  return {
    id: r.id,
    taskId: r.task_id,
    label: r.label,
    completed: Boolean(r.completed),
    sortOrder: Number(r.sort_order) || 0,
    createdAt: new Date(r.created_at).toISOString(),
  };
});
