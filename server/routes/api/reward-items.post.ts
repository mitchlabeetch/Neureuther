// POST /api/reward-items — create a new reward.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    label?: string;
    pointsCost?: number;
    icon?: string;
  }>(event);

  if (
    !body?.label?.trim() ||
    typeof body.pointsCost !== "number" ||
    body.pointsCost <= 0
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "label and a positive pointsCost are required",
    });
  }

  const id = body.id?.trim() || crypto.randomUUID();
  const icon = body.icon?.trim() || "🎁";

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM reward_items`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`INSERT INTO reward_items (id, label, points_cost, icon, sort_order)
            VALUES (${id}, ${body.label.trim()}, ${body.pointsCost}, ${icon}, ${nextSort})`;

  return { id, label: body.label.trim(), pointsCost: body.pointsCost, icon };
});
