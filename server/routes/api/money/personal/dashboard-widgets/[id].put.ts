import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400 });

  const body = await readBody<{ value?: string; title?: string }>(event);

  if (body.title !== undefined) await sql`UPDATE personal_dashboard_widgets SET title = ${body.title.trim()} WHERE id = ${id}`;
  if (body.value !== undefined) await sql`UPDATE personal_dashboard_widgets SET value = ${body.value} WHERE id = ${id}`;

  return { ok: true };
});
