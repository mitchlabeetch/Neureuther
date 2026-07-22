// POST /api/check-pin — check if a user has a PIN set
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{ userId?: string }>(event);
  if (!body?.userId) throw createError({ statusCode: 400, statusMessage: "userId required" });

  const existing = await sql`SELECT * FROM personal_pins WHERE user_id = ${body.userId}`;
  return { hasPin: existing.length > 0 };
});