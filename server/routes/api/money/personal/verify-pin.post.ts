import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";
import crypto from "crypto";

function hashPin(pin: string): string {
  return crypto.createHash("sha256").update(pin).digest("hex");
}

export default defineHandler(async (event) => {
  const body = await readBody<{ userId?: string; pin?: string }>(event);
  if (!body?.userId) throw createError({ statusCode: 400, statusMessage: "userId required" });
  if (!body?.pin || body.pin.length !== 4 || !/^\d{4}$/.test(body.pin)) {
    throw createError({ statusCode: 400, statusMessage: "pin must be 4 digits" });
  }

  const existing = await sql`SELECT * FROM personal_pins WHERE user_id = ${body.userId}`;

  if (existing.length > 0) {
    // Verify PIN
    const valid = existing[0].pin_hash === hashPin(body.pin);
    return { action: "verify", valid, userId: body.userId };
  } else {
    // Set PIN for first time
    const id = crypto.randomUUID();
    await sql`INSERT INTO personal_pins (id, user_id, pin_hash) VALUES (${id}, ${body.userId}, ${hashPin(body.pin)})`;
    return { action: "set", valid: true, userId: body.userId };
  }
});
