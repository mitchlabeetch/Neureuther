// PUT /api/personal-checklist-tasks/:id — update a personal checklist task
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    label?: string;
    completed?: boolean;
    deadline?: string | null;
  }>(event);

  const hasLabel = typeof body?.label === "string" && body.label.trim().length > 0;
  const hasCompleted = body && Object.prototype.hasOwnProperty.call(body, "completed");
  const hasDeadline = body && Object.prototype.hasOwnProperty.call(body, "deadline");

  if (!hasLabel && !hasCompleted && !hasDeadline) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  const completedAt = hasCompleted && body!.completed
    ? new Date().toISOString()
    : hasCompleted && !body!.completed
      ? null
      : undefined;

  await sql`
    UPDATE personal_checklist_tasks SET
      label = COALESCE(${hasLabel ? body.label!.trim() : null}::text, label),
      completed = CASE
        WHEN ${hasCompleted}::boolean THEN ${Boolean(body.completed)}::boolean
        ELSE completed
      END,
      completed_at = CASE
        WHEN ${hasCompleted}::boolean THEN ${completedAt === null ? null : completedAt}::timestamptz
        ELSE completed_at
      END,
      deadline = CASE
        WHEN ${hasDeadline}::boolean THEN ${body.deadline ? new Date(body.deadline).toISOString() : null}::timestamptz
        ELSE deadline
      END
    WHERE id = ${id}
  `;

  // If deadline changed, recalculate the checklist's deadline
  if (hasDeadline) {
    const checkRow = await sql`
      SELECT checklist_id FROM personal_checklist_tasks WHERE id = ${id}
    `;
    const checklistId = (checkRow[0] as { checklist_id: string } | undefined)?.checklist_id;
    if (checklistId) {
      await recalcChecklistDeadline(checklistId);
    }
  }

  return { ok: true };
});

async function recalcChecklistDeadline(checklistId: string) {
  const rows = await sql`
    SELECT MAX(deadline) AS latest_deadline
    FROM personal_checklist_tasks
    WHERE checklist_id = ${checklistId} AND deadline IS NOT NULL
  `;
  const latest = (rows[0] as { latest_deadline: string | null })?.latest_deadline;
  await sql`
    UPDATE personal_checklists
    SET deadline = ${latest ? new Date(latest).toISOString() : null},
        updated_at = now()
    WHERE id = ${checklistId}
  `;
}