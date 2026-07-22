// PUT /api/ingredients/:name — rename an ingredient across every recipe and
// the dictionary. :name is URL-encoded; the new name comes in the body.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const raw = getRouterParam(event, "name");
  if (!raw) throw createError({ statusCode: 400, statusMessage: "missing name" });
  const oldName = decodeURIComponent(raw).trim();
  if (!oldName) {
    throw createError({ statusCode: 400, statusMessage: "missing name" });
  }

  const body = await readBody<{ newName?: string }>(event);
  const newName = body?.newName?.trim();
  if (!newName) {
    throw createError({ statusCode: 400, statusMessage: "newName is required" });
  }
  if (newName.toLowerCase() === oldName.toLowerCase()) {
    return { ok: true, unchanged: true };
  }

  const queries: Array<ReturnType<typeof sql>> = [
    sql`UPDATE meal_recipe_ingredients
        SET name = ${newName}
        WHERE lower(name) = lower(${oldName})`,
    // The dictionary row keeps the same use_count but gets the new name
    sql`UPDATE ingredient_dictionary
        SET name = ${newName}, last_used_at = now()
        WHERE lower(name) = lower(${oldName})`,
  ];

  // If a dictionary row with the new name already exists, merge counts and
  // delete the old row to keep the UNIQUE constraint happy.
  const dup = await sql`
    SELECT id, use_count FROM ingredient_dictionary
    WHERE lower(name) = lower(${newName}) AND lower(name) <> lower(${oldName})
    LIMIT 1
  `;
  if (dup.length > 0) {
    const dupId = (dup[0] as { id: string }).id;
    queries.push(
      sql`UPDATE ingredient_dictionary
          SET use_count = use_count + (
            SELECT COALESCE(use_count, 0) FROM ingredient_dictionary
            WHERE lower(name) = lower(${oldName})
          ),
              last_used_at = now()
          WHERE id = ${dupId}`,
    );
    queries.push(
      sql`DELETE FROM ingredient_dictionary WHERE lower(name) = lower(${oldName})`,
    );
  }

  await sql.transaction(queries);
  return { ok: true };
});
