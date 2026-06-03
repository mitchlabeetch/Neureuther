import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    title?: string;
    amount?: number;
    category?: string;
    date?: string;
  }>(event);

  if (!body?.userId) throw createError({ statusCode: 400, statusMessage: "userId required" });
  if (!body?.title?.trim()) throw createError({ statusCode: 400, statusMessage: "title required" });
  if (!body?.amount || body.amount <= 0) throw createError({ statusCode: 400, statusMessage: "amount must be positive" });

  const id = crypto.randomUUID();
  const date = body.date || new Date().toISOString().split("T")[0];
  const category = body.category || "general";

  await sql`INSERT INTO personal_expenses (id, user_id, title, amount, category, date)
            VALUES (${id}, ${body.userId}, ${body.title.trim()}, ${body.amount}, ${category}, ${date})`;

  return { id, userId: body.userId, title: body.title.trim(), amount: body.amount, category, date };
});
