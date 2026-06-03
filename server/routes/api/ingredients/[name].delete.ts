// DELETE /api/ingredients/:name — remove an ingredient from every recipe
// it appears in, and drop the dictionary row so it stops being suggested.
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const raw = getRouterParam(event, "name");
  if (!raw) throw createError({ statusCode: 400, statusMessage: "missing name" });
  const name = decodeURIComponent(raw).trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "missing name" });
  }

  await sql.transaction([
    sql`DELETE FROM meal_recipe_ingredients WHERE lower(name) = lower(${name})`,
    sql`DELETE FROM ingredient_dictionary WHERE lower(name) = lower(${name})`,
  ]);
  return { ok: true };
});
