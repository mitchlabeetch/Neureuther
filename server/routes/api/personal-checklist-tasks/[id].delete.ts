// DELETE /api/personal-checklist-tasks/:id — delete a personal checklist task
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  // Get checklist_id before deleting so we can recalculate deadline
  const checkRow = await sql`
    SELECT checklist_id FROM personal_checklist_tasks WHERE id = ${id}
  `;
  const checklistId = (checkRow[0] as { checklist_id: string } | undefined)?.checklist_id;

  await sql`DELETE FROM personal_checklist_tasks WHERE id = ${id}`;

  if (checklistId) {
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

  return { ok: true };
});