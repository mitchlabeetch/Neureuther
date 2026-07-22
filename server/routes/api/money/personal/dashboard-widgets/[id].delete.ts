import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400 });

  await sql`DELETE FROM personal_dashboard_widgets WHERE id = ${id}`;
  return { ok: true };
});
