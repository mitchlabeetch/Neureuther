import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    name?: string;
    paymentDate?: string;
    amount?: number;
    serviceType?: string;
    paidBy?: string;
  }>(event);

  if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: "name is required" });
  if (!body?.amount || body.amount <= 0) throw createError({ statusCode: 400, statusMessage: "amount must be positive" });
  if (!body?.paidBy) throw createError({ statusCode: 400, statusMessage: "paidBy is required" });

  const id = crypto.randomUUID();
  const paymentDate = body.paymentDate || new Date().toISOString().split("T")[0];
  const serviceType = body.serviceType || "other";

  await sql`INSERT INTO shared_subscriptions (id, name, payment_date, amount, service_type, paid_by)
            VALUES (${id}, ${body.name.trim()}, ${paymentDate}, ${body.amount}, ${serviceType}, ${body.paidBy})`;

  return {
    id,
    name: body.name.trim(),
    paymentDate,
    amount: body.amount,
    serviceType,
    paidBy: body.paidBy,
  };
});
