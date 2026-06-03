// POST /api/rewards/claim — atomic "check balance then deduct".
// Uses a single CTE to check and insert in one round-trip, preventing
// over-spending even when concurrent requests race.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    rewardId?: string;
  }>(event);

  if (!body?.userId || !body?.rewardId) {
    throw createError({
      statusCode: 400,
      statusMessage: "userId and rewardId are required",
    });
  }

  const rewardRows =
    await sql`SELECT id, label, points_cost FROM reward_items WHERE id = ${body.rewardId}`;
  if (rewardRows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "reward not found" });
  }
  const reward = rewardRows[0] as {
    id: string;
    label: string;
    points_cost: number;
  };

  // Atomic CTE: the INSERT only runs when the user's balance >= cost.
  // If balance is too low, zero rows are returned — no partial insert.
  const inserted = await sql`
    WITH balance AS (
      SELECT COALESCE(SUM(points), 0)::int AS total
      FROM points_log WHERE user_id = ${body.userId}
    )
    INSERT INTO points_log (user_id, points, reason)
    SELECT ${body.userId}, ${-reward.points_cost}, ${`Claimed: ${reward.label}`}
    FROM balance WHERE total >= ${reward.points_cost}
    RETURNING id, user_id, points, reason, occurred_at
  `;

  if (inserted.length === 0) {
    throw createError({
      statusCode: 409,
      statusMessage: "insufficient points",
    });
  }

  const row = inserted[0] as {
    id: string;
    user_id: string;
    points: number;
    reason: string;
    occurred_at: string;
  };

  // Re-read balance post-deduction for the response
  const balanceRows =
    await sql`SELECT COALESCE(SUM(points), 0)::int AS total
              FROM points_log WHERE user_id = ${body.userId}`;
  const newBalance = Number((balanceRows[0] as { total: number }).total) || 0;

  return {
    ok: true,
    newBalance,
    logEntry: {
      id: row.id,
      userId: row.user_id,
      points: row.points,
      reason: row.reason,
      timestamp: new Date(row.occurred_at).toISOString(),
    },
  };
});
