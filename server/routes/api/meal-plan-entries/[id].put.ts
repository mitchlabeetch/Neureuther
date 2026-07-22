// PUT /api/meal-plan-entries/:id — update the meal in a slot
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";
import { autoAddRecipeIngredientsToGroceries } from "../../../utils/meal-plan";

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

  const rows = await sql`
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
    RETURNING id, week_start_date, day_of_week, slot, recipe_id, custom_name, created_at, updated_at
  `;
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: "meal plan entry not found" });
  if (body.recipeId) await autoAddRecipeIngredientsToGroceries(body.recipeId);

  const row = rows[0] as {
    id: string; week_start_date: string | Date; day_of_week: number; slot: "lunch" | "dinner";
    recipe_id: string | null; custom_name: string | null; created_at: string; updated_at: string;
  };
  const weekStartDate = typeof row.week_start_date === "string"
    ? row.week_start_date.slice(0, 10)
    : row.week_start_date.toISOString().slice(0, 10);
  return {
    id: row.id,
    weekStartDate,
    dayOfWeek: Number(row.day_of_week),
    slot: row.slot,
    recipeId: row.recipe_id,
    customName: row.custom_name,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
});
