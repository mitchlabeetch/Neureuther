// POST /api/points-log — append a points entry (used for both awards
// and redemptions, since "claimed: X" is just a negative entry).
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    points?: number;
    reason?: string;
  }>(event);

  if (
    !body?.userId ||
    typeof body.points !== "number" ||
    !body.reason?.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId, points (number) and reason are required",
    });
  }

  const rows = await sql`INSERT INTO points_log (user_id, points, reason)
                        VALUES (${body.userId}, ${body.points}, ${body.reason.trim()})
                        RETURNING id, user_id, points, reason, occurred_at`;

  const row = rows[0] as {
    id: string;
    user_id: string;
    points: number;
    reason: string;
    occurred_at: string;
  };
  return {
    id: row.id,
    userId: row.user_id,
    points: row.points,
    reason: row.reason,
    timestamp: new Date(row.occurred_at).toISOString(),
  };
});
