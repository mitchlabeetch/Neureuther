import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    title?: string;
    amount?: number;
    paidBy?: string;
    date?: string;
    splitUserIds?: string[];
  }>(event);

  if (!body?.title?.trim()) throw createError({ statusCode: 400, statusMessage: "title is required" });
  if (!body?.amount || body.amount <= 0) throw createError({ statusCode: 400, statusMessage: "amount must be positive" });
  if (!body?.paidBy) throw createError({ statusCode: 400, statusMessage: "paidBy is required" });
  if (!body?.splitUserIds?.length) throw createError({ statusCode: 400, statusMessage: "at least one paid-for user is required" });

  const id = crypto.randomUUID();
  const date = body.date || new Date().toISOString().split("T")[0];

  await sql`INSERT INTO shared_expenses (id, title, amount, paid_by, date)
            VALUES (${id}, ${body.title.trim()}, ${body.amount}, ${body.paidBy}, ${date})`;

  for (const userId of body.splitUserIds) {
    await sql`INSERT INTO shared_expense_splits (id, expense_id, user_id)
              VALUES (${crypto.randomUUID()}, ${id}, ${userId})`;
  }

  return {
    id,
    title: body.title.trim(),
    amount: body.amount,
    paidBy: body.paidBy,
    date,
    splitUserIds: body.splitUserIds,
  };
});
