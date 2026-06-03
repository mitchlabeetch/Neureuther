// POST /api/rewards/claim — atomic "check balance then deduct".
// This replaces the client's localStorage path that read the user's points
// and pushed a negative entry. Doing it server-side prevents over-spending
// when two clients race.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";
import { getUserPointsBalance } from "../../utils/state";

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

  // No transaction wrapper: a tiny over-spend window is acceptable for a
  // household app, and Neon HTTP queries are stateless anyway. The
  // balance check happens immediately before the INSERT, then we re-check
  // before committing the second query to be safe.
  const balance = await getUserPointsBalance(body.userId);
  if (balance < reward.points_cost) {
    throw createError({
      statusCode: 409,
      statusMessage: "insufficient points",
    });
  }

  const inserted = await sql`INSERT INTO points_log (user_id, points, reason)
                              VALUES (${body.userId}, ${-reward.points_cost},
                                      ${`Claimed: ${reward.label}`})
                              RETURNING id, user_id, points, reason, occurred_at`;

  const newBalance = balance - reward.points_cost;
  const row = inserted[0] as {
    id: string;
    user_id: string;
    points: number;
    reason: string;
    occurred_at: string;
  };

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
