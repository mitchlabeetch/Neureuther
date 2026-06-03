// PUT /api/grocery-list-items/:id — update an item in a custom grocery list
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    name?: string;
    quantity?: string | null;
    checked?: boolean;
  }>(event);

  const hasName = typeof body?.name === "string" && body.name.trim().length > 0;
  const hasQuantity = body && Object.prototype.hasOwnProperty.call(body, "quantity");
  const hasChecked = body && Object.prototype.hasOwnProperty.call(body, "checked");

  if (!hasName && !hasQuantity && !hasChecked) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  await sql`
    UPDATE grocery_list_items SET
      name = COALESCE(${hasName ? body.name!.trim() : null}::text, name),
      quantity = CASE
        WHEN ${hasQuantity}::boolean THEN ${body.quantity?.trim() || null}::text
        ELSE quantity
      END,
      checked = CASE
        WHEN ${hasChecked}::boolean THEN ${Boolean(body.checked)}::boolean
        ELSE checked
      END
    WHERE id = ${id}
  `;

  return { ok: true };
});
