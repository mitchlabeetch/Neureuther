import { defineHandler } from "nitro";
import { createError, readBody } from "nitro/h3";
import { ensureKitchenRulesSchema, toKitchenRule, type KitchenRuleCategory } from "../../utils/kitchen-rules";
import { sql } from "../../utils/db";

const CATEGORIES = new Set<KitchenRuleCategory>(["kitchen", "fridge", "appliances", "cleaning"]);

export default defineHandler(async (event) => {
  const body = await readBody<{ label?: string; category?: KitchenRuleCategory }>(event);
  const label = body?.label?.trim();
  const category = body?.category ?? "kitchen";
  if (!label) throw createError({ statusCode: 400, statusMessage: "label is required" });
  if (!CATEGORIES.has(category)) throw createError({ statusCode: 400, statusMessage: "invalid category" });

  await ensureKitchenRulesSchema();
  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM kitchen_rules`;
  const sortOrder = Number((tail[0] as { next: number | string }).next) || 0;
  const id = crypto.randomUUID();
  const rows = await sql`
    INSERT INTO kitchen_rules (id, label, category, sort_order)
    VALUES (${id}, ${label}, ${category}, ${sortOrder})
    RETURNING id, label, category, completed, completed_at, sort_order, created_at, updated_at
  `;
  return toKitchenRule(rows[0] as Record<string, unknown>);
});
