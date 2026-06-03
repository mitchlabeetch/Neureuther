// PUT /api/grocery-lists/:id — update a custom grocery list
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    name?: string;
    emoji?: string;
    archived?: boolean;
  }>(event);

  const hasName = typeof body?.name === "string" && body.name.trim().length > 0;
  const hasEmoji = typeof body?.emoji === "string";
  const hasArchived = body && Object.prototype.hasOwnProperty.call(body, "archived");

  if (!hasName && !hasEmoji && !hasArchived) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  await sql`
    UPDATE grocery_lists SET
      name = COALESCE(${hasName ? body.name!.trim() : null}::text, name),
      emoji = COALESCE(${hasEmoji ? body.emoji! : null}::text, emoji),
      archived = CASE
        WHEN ${hasArchived}::boolean THEN ${Boolean(body.archived)}::boolean
        ELSE archived
      END,
      updated_at = now()
    WHERE id = ${id}
  `;

  return { ok: true };
});
