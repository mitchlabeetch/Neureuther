// GET /api/personal-checklist-tasks?checklistId=xxx — list tasks in a personal checklist
import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const { checklistId } = getQuery(event);
  if (!checklistId || typeof checklistId !== "string") {
    throw createError({ statusCode: 400, statusMessage: "checklistId is required" });
  }

  const rows = await sql`
    SELECT id, checklist_id, label, completed, completed_at, deadline, sort_order, created_at
    FROM personal_checklist_tasks
    WHERE checklist_id = ${checklistId}
    ORDER BY sort_order, created_at
  `;

  return (rows as Array<{
    id: string; checklist_id: string; label: string; completed: boolean;
    completed_at: string | null; deadline: string | null; sort_order: number; created_at: string;
  }>).map((r) => ({
    id: r.id,
    checklistId: r.checklist_id,
    label: r.label,
    completed: r.completed,
    completedAt: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    deadline: r.deadline ? new Date(r.deadline).toISOString() : null,
    sortOrder: r.sort_order,
    createdAt: new Date(r.created_at).toISOString(),
  }));
});