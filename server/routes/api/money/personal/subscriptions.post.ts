import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    name?: string;
    paymentDate?: string;
    amount?: number;
    serviceType?: string;
  }>(event);

  if (!body?.userId) throw createError({ statusCode: 400, statusMessage: "userId required" });
  if (!body?.name?.trim()) throw createError({ statusCode: 400, statusMessage: "name required" });
  if (!body?.amount || body.amount <= 0) throw createError({ statusCode: 400, statusMessage: "amount must be positive" });

  const id = crypto.randomUUID();
  const paymentDate = body.paymentDate || new Date().toISOString().split("T")[0];
  const serviceType = body.serviceType || "other";

  await sql`INSERT INTO personal_subscriptions (id, user_id, name, payment_date, amount, service_type)
            VALUES (${id}, ${body.userId}, ${body.name.trim()}, ${paymentDate}, ${body.amount}, ${serviceType})`;

  return { id, userId: body.userId, name: body.name.trim(), paymentDate, amount: body.amount, serviceType };
});
