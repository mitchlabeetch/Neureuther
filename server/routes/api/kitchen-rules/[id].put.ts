import { defineHandler } from "nitro";
import { createError, getRouterParam, readBody } from "nitro/h3";
import { ensureKitchenRulesSchema, toKitchenRule, type KitchenRuleCategory } from "../../../utils/kitchen-rules";
import { sql } from "../../../utils/db";

const CATEGORIES = new Set<KitchenRuleCategory>(["kitchen", "fridge", "appliances", "cleaning"]);

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });
  const body = await readBody<{
    label?: string;
    category?: KitchenRuleCategory;
    completed?: boolean;
  }>(event);
  const hasLabel = typeof body?.label === "string" && body.label.trim().length > 0;
  const hasCategory = typeof body?.category === "string";
  const hasCompleted = typeof body?.completed === "boolean";
  if (!hasLabel && !hasCategory && !hasCompleted) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }
  if (hasCategory && !CATEGORIES.has(body.category!)) {
    throw createError({ statusCode: 400, statusMessage: "invalid category" });
  }

  await ensureKitchenRulesSchema();
  const rows = await sql`
    UPDATE kitchen_rules
    SET label = CASE WHEN ${hasLabel}::boolean THEN ${body.label?.trim() ?? null} ELSE label END,
        category = CASE WHEN ${hasCategory}::boolean THEN ${body.category ?? null} ELSE category END,
        completed = CASE WHEN ${hasCompleted}::boolean THEN ${Boolean(body.completed)} ELSE completed END,
        completed_at = CASE
          WHEN ${hasCompleted}::boolean AND ${Boolean(body.completed)} THEN now()
          WHEN ${hasCompleted}::boolean THEN NULL
          ELSE completed_at
        END,
        updated_at = now()
    WHERE id = ${id}
    RETURNING id, label, category, completed, completed_at, sort_order, created_at, updated_at
  `;
  if (rows.length === 0) throw createError({ statusCode: 404, statusMessage: "rule not found" });
  return toKitchenRule(rows[0] as Record<string, unknown>);
});
