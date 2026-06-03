import { defineHandler } from "nitro";
import { sql } from "../../../utils/db";

export default defineHandler(async () => {
  const subs = await sql`
    SELECT * FROM shared_subscriptions ORDER BY payment_date DESC, created_at DESC
  `;

  return subs.map((s: any) => ({
    id: s.id,
    name: s.name,
    paymentDate: s.payment_date,
    amount: Number(s.amount),
    serviceType: s.service_type,
    paidBy: s.paid_by,
    createdAt: s.created_at,
  }));
});
