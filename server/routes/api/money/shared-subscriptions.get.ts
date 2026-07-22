import { defineHandler } from "nitro";
import { sql } from "../../../utils/db";

type SharedSubscriptionRow = {
  id: string;
  name: string;
  payment_date: string | Date;
  amount: number | string;
  service_type: string;
  paid_by: string;
  created_at: string | Date;
};

export default defineHandler(async () => {
  const subs = await sql`
    SELECT * FROM shared_subscriptions ORDER BY payment_date DESC, created_at DESC
  `;

  return (subs as SharedSubscriptionRow[]).map((s) => ({
    id: s.id,
    name: s.name,
    paymentDate: s.payment_date,
    amount: Number(s.amount),
    serviceType: s.service_type,
    paidBy: s.paid_by,
    createdAt: s.created_at,
  }));
});
