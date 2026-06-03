// PUT /api/meal-plan-entries/:id — update the meal in a slot
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    recipeId?: string | null;
    customName?: string | null;
  }>(event);

  const hasRecipe = body && Object.prototype.hasOwnProperty.call(body, "recipeId");
  const hasCustom = body && Object.prototype.hasOwnProperty.call(body, "customName");

  if (!hasRecipe && !hasCustom) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  await sql`
    UPDATE meal_plan_entries SET
      recipe_id = CASE
        WHEN ${hasRecipe}::boolean THEN ${body.recipeId ?? null}::text
        ELSE recipe_id
      END,
      custom_name = CASE
        WHEN ${hasCustom}::boolean THEN ${body.customName?.trim() ?? null}::text
        ELSE custom_name
      END,
      updated_at = now()
    WHERE id = ${id}
  `;

  return { ok: true };
});
