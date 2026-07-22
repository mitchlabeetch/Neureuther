// DELETE /api/users/:id — remove a person and their wheel memberships.
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }
  // ON DELETE CASCADE on wheel_config_users + ON DELETE SET NULL on
  // checklist_items.completed_by + ON DELETE CASCADE on points_log
  // handle the cleanup automatically.
  await sql`DELETE FROM users WHERE id = ${id}`;
  return { ok: true };
});
