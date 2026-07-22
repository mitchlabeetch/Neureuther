// DELETE /api/checklist-subtasks/:id — remove a single sub-task.
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }
  await sql`DELETE FROM checklist_subtasks WHERE id = ${id}`;
  return { ok: true };
});
