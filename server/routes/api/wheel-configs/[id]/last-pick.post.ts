// POST /api/wheel-configs/:id/last-pick — save or clear the last pick for a wheel.
// Body: { userId?: string | null } — pass a userId to save, null/omit to clear.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{ userId?: string | null }>(event);

  // Clear the pick
  if (!body?.userId) {
    await sql`UPDATE wheel_configs
              SET last_pick_user_id = NULL, last_pick_at = NULL
              WHERE id = ${id}`;
    return { ok: true, cleared: true };
  }

  // Verify the user exists on this wheel
  const rows = await sql`
    SELECT 1 FROM wheel_config_users
    WHERE wheel_config_id = ${id} AND user_id = ${body.userId}
    LIMIT 1
  `;
  if (rows.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "user is not part of this wheel",
    });
  }

  await sql`UPDATE wheel_configs
            SET last_pick_user_id = ${body.userId}, last_pick_at = now()
            WHERE id = ${id}`;

  return { ok: true, cleared: false };
});