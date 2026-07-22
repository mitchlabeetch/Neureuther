// POST /api/grocery-list-items — add an item to a custom grocery list
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    listId?: string;
    name?: string;
    quantity?: string;
    checked?: boolean;
  }>(event);

  if (!body?.listId || !body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "listId and name are required" });
  }

  const id = crypto.randomUUID();
  const name = body.name.trim();
  const quantity = body.quantity?.trim() || null;
  const checked = Boolean(body.checked);

  const tail = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
    FROM grocery_list_items WHERE list_id = ${body.listId}
  `;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  const queries: Array<ReturnType<typeof sql>> = [
    sql`INSERT INTO grocery_list_items (id, list_id, name, quantity, checked, sort_order)
        VALUES (${id}, ${body.listId}, ${name}, ${quantity}, ${checked}, ${nextSort})`,
    sql`INSERT INTO ingredient_dictionary (id, name) VALUES (${crypto.randomUUID()}, ${name})
        ON CONFLICT (name) DO UPDATE SET use_count = ingredient_dictionary.use_count + 1,
                                            last_used_at = now()`,
  ];
  await sql.transaction(queries);

  return {
    id,
    listId: body.listId,
    name,
    quantity,
    checked,
    sortOrder: nextSort,
    createdAt: new Date().toISOString(),
  };
});
