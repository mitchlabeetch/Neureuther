// PUT /api/meal-recipes/:id — update a meal recipe (and replace its ingredients)
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

interface IngredientInput {
  name: string;
  quantity?: string;
}

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    name?: string;
    emoji?: string;
    notes?: string;
    cuisine?: string | null;
    ingredients?: IngredientInput[];
  }>(event);

  const hasName = typeof body?.name === "string" && body.name.trim().length > 0;
  const hasEmoji = typeof body?.emoji === "string";
  const hasNotes = typeof body?.notes === "string";
  const hasCuisine = body && Object.prototype.hasOwnProperty.call(body, "cuisine");
  const hasIngredients = Array.isArray(body?.ingredients);

  if (!hasName && !hasEmoji && !hasNotes && !hasCuisine && !hasIngredients) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  await sql`
    UPDATE meal_recipes SET
      name = COALESCE(${hasName ? body.name!.trim() : null}::text, name),
      emoji = COALESCE(${hasEmoji ? body.emoji! : null}::text, emoji),
      notes = COALESCE(${hasNotes ? body.notes! : null}::text, notes),
      cuisine = CASE
        WHEN ${hasCuisine}::boolean THEN ${body.cuisine ?? null}::text
        ELSE cuisine
      END,
      updated_at = now()
    WHERE id = ${id}
  `;

  if (hasIngredients) {
    // Replace ingredients atomically and update the dictionary usage
    const newIngs = (body.ingredients ?? []).filter((i) => i?.name?.trim());
    const queries: Array<ReturnType<typeof sql>> = [
      sql`DELETE FROM meal_recipe_ingredients WHERE recipe_id = ${id}`,
    ];
    for (let i = 0; i < newIngs.length; i++) {
      const ing = newIngs[i];
      const ingId = crypto.randomUUID();
      queries.push(
        sql`INSERT INTO meal_recipe_ingredients (id, recipe_id, name, quantity, sort_order)
            VALUES (${ingId}, ${id}, ${ing.name.trim()}, ${ing.quantity?.trim() || null}, ${i})`,
      );
      queries.push(
        sql`INSERT INTO ingredient_dictionary (id, name) VALUES (${crypto.randomUUID()}, ${ing.name.trim()})
            ON CONFLICT (name) DO UPDATE SET use_count = ingredient_dictionary.use_count + 1,
                                                last_used_at = now()`,
      );
    }
    if (queries.length > 0) await sql.transaction(queries);
  }

  return { ok: true };
});
