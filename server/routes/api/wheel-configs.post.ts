// POST /api/wheel-configs — create a new wheel.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    title?: string;
    pointsPerTask?: number;
    users?: string[];
  }>(event);

  if (
    !body?.title?.trim() ||
    !Array.isArray(body.users) ||
    body.users.length < 2 ||
    typeof body.pointsPerTask !== "number"
  ) {
    throw createError({
      statusCode: 400,
      statusMessage:
        "title, pointsPerTask (number) and users (array of 2+ ids) are required",
    });
  }

  const id = body.id?.trim() || crypto.randomUUID();
  const pointsPerTask = body.pointsPerTask;

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM wheel_configs`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  // The wheel row + its user memberships must land together. We use a
  // transaction so a partial failure doesn't leave an empty wheel.
  await sql.transaction([
    sql`INSERT INTO wheel_configs (id, title, points_per_task, sort_order)
        VALUES (${id}, ${body.title.trim()}, ${pointsPerTask}, ${nextSort})`,
    ...body.users.map((uid) =>
      sql`INSERT INTO wheel_config_users (wheel_config_id, user_id)
          VALUES (${id}, ${uid})`,
    ),
  ]);

  return {
    id,
    title: body.title.trim(),
    pointsPerTask,
    users: [...body.users],
  };
});
