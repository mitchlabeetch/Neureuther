// POST /api/checklist-items/:id/toggle
// Flips the `completed` flag. When marking complete, `userId` is required so
// the system can credit the right person. When uncompleting, the credit fields
// are cleared.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ userId?: string }>(event);

  const current = await sql`SELECT completed FROM checklist_items WHERE id = ${id}`;
  if (current.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "item not found" });
  }
  const wasCompleted = Boolean((current[0] as { completed: boolean }).completed);

  if (wasCompleted) {
    await sql`UPDATE checklist_items
              SET completed = FALSE,
                  completed_by = NULL,
                  completed_at = NULL
              WHERE id = ${id}`;
    return { completed: false, completedBy: null, completedAt: null };
  }

  if (!body?.userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId is required to complete a task",
    });
  }

  const now = new Date().toISOString();
  await sql`UPDATE checklist_items
            SET completed = TRUE,
                completed_by = ${body.userId},
                completed_at = ${now}
            WHERE id = ${id}`;
  return { completed: true, completedBy: body.userId, completedAt: now };
});
