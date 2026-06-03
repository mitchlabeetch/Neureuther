// DELETE /api/wheel-configs/:id — remove a wheel.
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }
  // wheel_config_users cascade on delete.
  await sql`DELETE FROM wheel_configs WHERE id = ${id}`;
  return { ok: true };
});
