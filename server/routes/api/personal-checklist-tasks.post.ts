// POST /api/personal-checklist-tasks — create a task in a personal checklist
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    checklistId?: string;
    label?: string;
    deadline?: string | null;
  }>(event);

  if (!body?.checklistId || !body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "checklistId and label are required" });
  }

  const id = crypto.randomUUID();
  const label = body.label.trim();
  const deadline = body.deadline && typeof body.deadline === "string"
    ? new Date(body.deadline).toISOString()
    : null;

  const tail = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
    FROM personal_checklist_tasks WHERE checklist_id = ${body.checklistId}
  `;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`
    INSERT INTO personal_checklist_tasks (id, checklist_id, label, deadline, sort_order)
    VALUES (${id}, ${body.checklistId}, ${label}, ${deadline}, ${nextSort})
  `;

  // If the task has a deadline, potentially update the checklist deadline
  if (deadline) {
    await maybeUpdateChecklistDeadline(body.checklistId);
  }

  return {
    id,
    checklistId: body.checklistId,
    label,
    completed: false,
    completedAt: null,
    deadline,
    sortOrder: nextSort,
    createdAt: new Date().toISOString(),
  };
});

async function maybeUpdateChecklistDeadline(checklistId: string) {
  // Find the latest deadline among all tasks in this checklist
  const rows = await sql`
    SELECT MAX(deadline) AS latest_deadline
    FROM personal_checklist_tasks
    WHERE checklist_id = ${checklistId} AND deadline IS NOT NULL
  `;
  const latest = (rows[0] as { latest_deadline: string | null })?.latest_deadline;
  if (latest) {
    await sql`
      UPDATE personal_checklists SET deadline = ${new Date(latest).toISOString()}, updated_at = now()
      WHERE id = ${checklistId}
    `;
  }
}