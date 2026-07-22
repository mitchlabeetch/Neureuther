// POST /api/verify-app-pin — verify the app-level PIN against the server env var.
// The PIN value never leaves the server. Rate-limited by the global middleware.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";

export default defineHandler(async (event) => {
  const body = await readBody<{ pin?: string }>(event);
  if (!body?.pin || !/^\d{4}$/.test(body.pin)) {
    throw createError({ statusCode: 400, statusMessage: "pin must be 4 digits" });
  }

  const appPin = process.env.APP_PIN;
  if (!appPin) {
    throw createError({ statusCode: 500, statusMessage: "app pin not configured" });
  }

  const valid = body.pin === appPin;
  if (!valid) {
    throw createError({ statusCode: 401, statusMessage: "invalid pin" });
  }

  return { ok: true };
});