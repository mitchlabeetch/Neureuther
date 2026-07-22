import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

type PersonalSubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  payment_date: string | Date;
  amount: number | string;
  service_type: string;
  created_at: string | Date;
};

export default defineHandler(async (event) => {
  const { userId } = getQuery(event);
  if (!userId) throw createError({ statusCode: 400 });

  const rows = await sql`
    SELECT * FROM personal_subscriptions WHERE user_id = ${userId} ORDER BY payment_date DESC, created_at DESC
  `;

  return (rows as PersonalSubscriptionRow[]).map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    paymentDate: r.payment_date,
    amount: Number(r.amount),
    serviceType: r.service_type,
    createdAt: r.created_at,
  }));
});
