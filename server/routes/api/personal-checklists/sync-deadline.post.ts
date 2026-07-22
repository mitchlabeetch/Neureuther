// POST /api/personal-checklists/sync-deadline — manually recalculate a checklist's
// deadline from the latest task deadline. Useful when the user wants to explicitly
// set the checklist deadline to the latest task deadline.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{ checklistId?: string }>(event);
  if (!body?.checklistId) {
    throw createError({ statusCode: 400, statusMessage: "checklistId is required" });
  }

  const rows = await sql`
    SELECT MAX(deadline) AS latest_deadline
    FROM personal_checklist_tasks
    WHERE checklist_id = ${body.checklistId} AND deadline IS NOT NULL
  `;
  const latest = (rows[0] as { latest_deadline: string | null })?.latest_deadline;

  await sql`
    UPDATE personal_checklists
    SET deadline = ${latest ? new Date(latest).toISOString() : null},
        updated_at = now()
    WHERE id = ${body.checklistId}
  `;

  return { ok: true, deadline: latest ? new Date(latest).toISOString() : null };
});