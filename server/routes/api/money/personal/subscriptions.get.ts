import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const { userId } = getQuery(event);
  if (!userId) throw createError({ statusCode: 400 });

  const rows = await sql`
    SELECT * FROM personal_subscriptions WHERE user_id = ${userId} ORDER BY payment_date DESC, created_at DESC
  `;

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    paymentDate: r.payment_date,
    amount: Number(r.amount),
    serviceType: r.service_type,
    createdAt: r.created_at,
  }));
});
