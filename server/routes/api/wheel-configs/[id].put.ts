// PATCH /api/wheel-configs/:id — update title / points / user set.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{
    title?: string;
    pointsPerTask?: number;
    users?: string[];
  }>(event);

  if (
    !body ||
    (body.title === undefined &&
      body.pointsPerTask === undefined &&
      body.users === undefined)
  ) {
    throw createError({ statusCode: 400, statusMessage: "nothing to update" });
  }

  if (body.users !== undefined && body.users.length < 2) {
    throw createError({
      statusCode: 400,
      statusMessage: "a wheel needs at least 2 users",
    });
  }

  const queries = [];
  if (body.title !== undefined || body.pointsPerTask !== undefined) {
    queries.push(
      sql`UPDATE wheel_configs SET
            title = COALESCE(${body.title?.trim() ?? null}, title),
            points_per_task = COALESCE(${body.pointsPerTask ?? null}, points_per_task)
          WHERE id = ${id}`,
    );
  }
  if (body.users !== undefined) {
    queries.push(sql`DELETE FROM wheel_config_users WHERE wheel_config_id = ${id}`);
    for (const uid of body.users) {
      queries.push(
        sql`INSERT INTO wheel_config_users (wheel_config_id, user_id)
            VALUES (${id}, ${uid})`,
      );
    }
  }
  await sql.transaction(queries);

  return { ok: true };
});
