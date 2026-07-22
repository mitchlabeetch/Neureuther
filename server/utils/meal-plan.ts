import { sql } from "./db";

/** Add a recipe's ingredients once to the shared list when it enters a plan. */
export async function autoAddRecipeIngredientsToGroceries(recipeId: string): Promise<void> {
  const ingredients = (await sql`
    SELECT name, quantity
    FROM meal_recipe_ingredients
    WHERE recipe_id = ${recipeId}
    ORDER BY sort_order
  `) as Array<{ name: string; quantity: string | null }>;
  if (ingredients.length === 0) return;

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM grocery_main_items`;
  let nextSort = Number((tail[0] as { next: number | string }).next) || 0;
  const queries: Array<ReturnType<typeof sql>> = [];

  for (const ingredient of ingredients) {
    const name = ingredient.name.trim();
    if (!name) continue;
    const existing = await sql`
      SELECT id FROM grocery_main_items WHERE lower(name) = lower(${name}) LIMIT 1
    `;
    if (existing.length > 0) continue;
    queries.push(sql`
      INSERT INTO grocery_main_items (id, name, quantity, sort_order)
      VALUES (${crypto.randomUUID()}, ${name}, ${ingredient.quantity?.trim() || null}, ${nextSort})
    `);
    nextSort += 1;
  }
  if (queries.length > 0) await sql.transaction(queries);
}
