import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

type PersonalExpenseRow = {
  id: string;
  user_id: string;
  title: string;
  amount: number | string;
  category: string;
  date: string | Date;
  created_at: string | Date;
};

export default defineHandler(async (event) => {
  const { userId } = getQuery(event);
  if (!userId) throw createError({ statusCode: 400 });

  const rows = await sql`
    SELECT * FROM personal_expenses WHERE user_id = ${userId} ORDER BY date DESC, created_at DESC
  `;

  return (rows as PersonalExpenseRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    title: r.title,
    amount: Number(r.amount),
    category: r.category,
    date: r.date,
    createdAt: r.created_at,
  }));
});
