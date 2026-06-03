// PATCH /api/reward-items/:id — rename / re-price / re-icon a reward.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<{
    label?: string;
    pointsCost?: number;
    icon?: string;
    category?: string;
    description?: string | null;
  }>(event);

  if (
    !body ||
    (body.label === undefined &&
      body.pointsCost === undefined &&
      body.icon === undefined &&
      body.category === undefined &&
      body.description === undefined)
  ) {
    throw createError({ statusCode: 400, statusMessage: "nothing to update" });
  }

  if (body.pointsCost !== undefined && body.pointsCost <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "pointsCost must be positive",
    });
  }

  await sql`UPDATE reward_items SET
              label = COALESCE(${body.label?.trim() ?? null}, label),
              points_cost = COALESCE(${body.pointsCost ?? null}, points_cost),
              icon = COALESCE(${body.icon ?? null}, icon),
              category = COALESCE(${body.category?.trim() ?? null}, category),
              description = COALESCE(${body.description ?? null}, description)
            WHERE id = ${id}`;

  return { ok: true };
});
