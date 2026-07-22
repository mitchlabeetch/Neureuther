// DELETE /api/grocery-lists/:id — delete a custom grocery list (and its items)
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  await sql`DELETE FROM grocery_lists WHERE id = ${id}`;
  return { ok: true };
});
