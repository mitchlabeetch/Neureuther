// POST /api/meal-recipes — create a new meal recipe with optional ingredients
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

interface IngredientInput {
  name: string;
  quantity?: string;
}

export default defineHandler(async (event) => {
  const body = await readBody<{
    name?: string;
    emoji?: string;
    notes?: string;
    cuisine?: string | null;
    ingredients?: IngredientInput[];
  }>(event);

  if (!body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "name is required" });
  }

  const id = crypto.randomUUID();
  const name = body.name.trim();
  const emoji = body.emoji?.trim() || "🍽️";
  const notes = body.notes?.trim() || "";
  const cuisine = body.cuisine?.trim() || null;

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM meal_recipes`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  const queries: Array<ReturnType<typeof sql>> = [
    sql`INSERT INTO meal_recipes (id, name, emoji, notes, cuisine, sort_order)
        VALUES (${id}, ${name}, ${emoji}, ${notes}, ${cuisine}, ${nextSort})`,
  ];

  const ingredients = Array.isArray(body.ingredients) ? body.ingredients : [];
  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    if (!ing?.name?.trim()) continue;
    const ingId = crypto.randomUUID();
    queries.push(
      sql`INSERT INTO meal_recipe_ingredients (id, recipe_id, name, quantity, sort_order)
          VALUES (${ingId}, ${id}, ${ing.name.trim()}, ${ing.quantity?.trim() || null}, ${i})`,
    );
    // Track known ingredient in dictionary
    queries.push(
      sql`INSERT INTO ingredient_dictionary (id, name) VALUES (${crypto.randomUUID()}, ${ing.name.trim()})
          ON CONFLICT (name) DO UPDATE SET use_count = ingredient_dictionary.use_count + 1,
                                              last_used_at = now()`,
    );
  }

  if (queries.length > 0) await sql.transaction(queries);

  return {
    id,
    name,
    emoji,
    notes,
    cuisine,
    sortOrder: nextSort,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
});
