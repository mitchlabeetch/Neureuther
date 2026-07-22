import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "id is required" });

  const body = await readBody<{
    title?: string;
    amount?: number;
    paidBy?: string;
    date?: string;
    splitUserIds?: string[];
  }>(event);

  const existing = await sql`SELECT * FROM shared_expenses WHERE id = ${id}`;
  if (!existing.length) throw createError({ statusCode: 404, statusMessage: "expense not found" });

  if (body.title !== undefined) {
    await sql`UPDATE shared_expenses SET title = ${body.title.trim()} WHERE id = ${id}`;
  }
  if (body.amount !== undefined) {
    await sql`UPDATE shared_expenses SET amount = ${body.amount} WHERE id = ${id}`;
  }
  if (body.paidBy !== undefined) {
    await sql`UPDATE shared_expenses SET paid_by = ${body.paidBy} WHERE id = ${id}`;
  }
  if (body.date !== undefined) {
    await sql`UPDATE shared_expenses SET date = ${body.date} WHERE id = ${id}`;
  }
  if (body.splitUserIds !== undefined) {
    await sql`DELETE FROM shared_expense_splits WHERE expense_id = ${id}`;
    for (const userId of body.splitUserIds) {
      await sql`INSERT INTO shared_expense_splits (id, expense_id, user_id)
                VALUES (${crypto.randomUUID()}, ${id}, ${userId})`;
    }
  }

  return { ok: true };
});
