import { defineHandler } from "nitro";
import { createError, getRouterParam } from "nitro/h3";
import { ensureKitchenRulesSchema } from "../../../utils/kitchen-rules";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });
  await ensureKitchenRulesSchema();
  const result = await sql`DELETE FROM kitchen_rules WHERE id = ${id}`;
  if (result.length === 0) throw createError({ statusCode: 404, statusMessage: "rule not found" });
  return { ok: true };
});
