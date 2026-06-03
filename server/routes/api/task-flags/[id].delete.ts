// DELETE /api/task-flags/:id — remove a flag and clear flag_id on any
// checklist_items that referenced it.
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  // Clear the FK reference on tasks first so the delete doesn't violate a
  // constraint. (There is no FK on this side today, but doing it
  // explicitly keeps the contract honest if one is added later.)
  await sql`UPDATE checklist_items SET flag_id = NULL WHERE flag_id = ${id}`;
  await sql`DELETE FROM task_flags WHERE id = ${id}`;
  return { ok: true };
});
