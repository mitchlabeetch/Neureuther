import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400 });

  const body = await readBody<{ title?: string; amount?: number; category?: string; date?: string }>(event);

  if (body.title !== undefined) await sql`UPDATE personal_expenses SET title = ${body.title.trim()} WHERE id = ${id}`;
  if (body.amount !== undefined) await sql`UPDATE personal_expenses SET amount = ${body.amount} WHERE id = ${id}`;
  if (body.category !== undefined) await sql`UPDATE personal_expenses SET category = ${body.category} WHERE id = ${id}`;
  if (body.date !== undefined) await sql`UPDATE personal_expenses SET date = ${body.date} WHERE id = ${id}`;

  return { ok: true };
});
