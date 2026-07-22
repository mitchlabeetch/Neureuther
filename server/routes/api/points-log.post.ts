// POST /api/points-log — append a points entry. Accepts either a single
// `userId` or an array of `userIds` (used for "we all participated"). Both
// shapes result in one row per user being inserted in a single transaction.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    userIds?: string[];
    points?: number;
    reason?: string;
  }>(event);

  if (
    typeof body?.points !== "number" ||
    !body.reason?.trim()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "points (number) and reason are required",
    });
  }

  // Resolve the target user list. We support both `userId` (single) and
  // `userIds` (multi) so the client can call the same endpoint whether
  // awarding to one person or to everyone at once.
  const ids: string[] = [];
  if (Array.isArray(body.userIds)) {
    for (const id of body.userIds) {
      if (typeof id === "string" && id.trim()) ids.push(id.trim());
    }
  }
  if (typeof body.userId === "string" && body.userId.trim()) {
    ids.push(body.userId.trim());
  }
  if (ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId or userIds is required",
    });
  }

  const reason = body.reason.trim();
  const points = body.points;

  const rows = await sql`
    INSERT INTO points_log (user_id, points, reason)
    SELECT uid, ${points}, ${reason} FROM unnest(${ids}::text[]) AS uid
    RETURNING id, user_id, points, reason, occurred_at
  `;

  return (rows as Array<{
    id: string;
    user_id: string;
    points: number;
    reason: string;
    occurred_at: string;
  }>).map((r) => ({
    id: r.id,
    userId: r.user_id,
    points: r.points,
    reason: r.reason,
    timestamp: new Date(r.occurred_at).toISOString(),
  }));
});
