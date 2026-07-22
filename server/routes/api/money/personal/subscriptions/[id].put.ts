import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400 });

  const body = await readBody<{ name?: string; paymentDate?: string; amount?: number; serviceType?: string }>(event);

  if (body.name !== undefined) await sql`UPDATE personal_subscriptions SET name = ${body.name.trim()} WHERE id = ${id}`;
  if (body.paymentDate !== undefined) await sql`UPDATE personal_subscriptions SET payment_date = ${body.paymentDate} WHERE id = ${id}`;
  if (body.amount !== undefined) await sql`UPDATE personal_subscriptions SET amount = ${body.amount} WHERE id = ${id}`;
  if (body.serviceType !== undefined) await sql`UPDATE personal_subscriptions SET service_type = ${body.serviceType} WHERE id = ${id}`;

  return { ok: true };
});
