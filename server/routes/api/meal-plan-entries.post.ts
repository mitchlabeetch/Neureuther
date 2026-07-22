// POST /api/meal-plan-entries — assign a meal (saved recipe or custom) to a slot in the week
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";
import { autoAddRecipeIngredientsToGroceries } from "../../utils/meal-plan";

export default defineHandler(async (event) => {
  const body = await readBody<{
    weekStartDate?: string;
    dayOfWeek?: number;
    slot?: "lunch" | "dinner";
    recipeId?: string | null;
    customName?: string | null;
  }>(event);

  if (!body?.weekStartDate) {
    throw createError({ statusCode: 400, statusMessage: "weekStartDate is required" });
  }
  const day = Number(body.dayOfWeek);
  if (!Number.isInteger(day) || day < 0 || day > 6) {
    throw createError({ statusCode: 400, statusMessage: "dayOfWeek must be 0-6" });
  }
  if (body.slot !== "lunch" && body.slot !== "dinner") {
    throw createError({ statusCode: 400, statusMessage: "slot must be lunch or dinner" });
  }
  if (!body.recipeId && !body.customName?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: "either recipeId or customName is required",
    });
  }

  const id = crypto.randomUUID();
  const weekStart = new Date(body.weekStartDate).toISOString().slice(0, 10);

  await sql`
    INSERT INTO meal_plan_entries (id, week_start_date, day_of_week, slot, recipe_id, custom_name)
    VALUES (${id}, ${weekStart}, ${day}, ${body.slot}, ${body.recipeId ?? null}, ${body.customName?.trim() ?? null})
  `;

  // If a recipe was assigned, optionally push its unchecked ingredients into the main grocery list
  if (body.recipeId) await autoAddRecipeIngredientsToGroceries(body.recipeId);

  return {
    id,
    weekStartDate: weekStart,
    dayOfWeek: day,
    slot: body.slot,
    recipeId: body.recipeId ?? null,
    customName: body.customName?.trim() ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});

