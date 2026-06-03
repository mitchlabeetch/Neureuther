import { defineHandler } from "nitro";
import { sql } from "../../../utils/db";

export default defineHandler(async () => {
  const expenses = await sql`
    SELECT se.*, 
      COALESCE(json_agg(ses.user_id) FILTER (WHERE ses.user_id IS NOT NULL), '[]') AS split_user_ids
    FROM shared_expenses se
    LEFT JOIN shared_expense_splits ses ON ses.expense_id = se.id
    GROUP BY se.id
    ORDER BY se.date DESC, se.created_at DESC
  `;

  return expenses.map((e: any) => ({
    id: e.id,
    title: e.title,
    amount: Number(e.amount),
    paidBy: e.paid_by,
    date: e.date,
    splitUserIds: e.split_user_ids,
    createdAt: e.created_at,
  }));
});
