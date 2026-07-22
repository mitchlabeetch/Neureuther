// PUT /api/personal-checklists/:id — update a personal checklist
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, statusMessage: "missing id" });

  const body = await readBody<{
    name?: string;
    bgColor?: string;
    flagId?: string | null;
    deadline?: string | null;
    archived?: boolean;
    kind?: string;
  }>(event);

  const hasName = typeof body?.name === "string" && body.name.trim().length > 0;
  const hasBgColor = typeof body?.bgColor === "string";
  const hasFlag = body && Object.prototype.hasOwnProperty.call(body, "flagId");
  const hasDeadline = body && Object.prototype.hasOwnProperty.call(body, "deadline");
  const hasArchived = body && Object.prototype.hasOwnProperty.call(body, "archived");
  const hasKind = typeof body?.kind === "string";

  if (!hasName && !hasBgColor && !hasFlag && !hasDeadline && !hasArchived && !hasKind) {
    throw createError({ statusCode: 400, statusMessage: "no updatable fields" });
  }

  await sql`
    UPDATE personal_checklists SET
      name = COALESCE(${hasName ? body.name!.trim() : null}::text, name),
      bg_color = COALESCE(${hasBgColor ? body.bgColor! : null}::text, bg_color),
      flag_id = CASE
        WHEN ${hasFlag}::boolean THEN ${body.flagId ?? null}::text
        ELSE flag_id
      END,
      deadline = CASE
        WHEN ${hasDeadline}::boolean THEN ${body.deadline ? new Date(body.deadline).toISOString() : null}::timestamptz
        ELSE deadline
      END,
      archived = CASE
        WHEN ${hasArchived}::boolean THEN ${body.archived ?? false}::boolean
        ELSE archived
      END,
      kind = CASE
        WHEN ${hasKind}::boolean THEN ${body.kind!}::text
        ELSE kind
      END,
      updated_at = now()
    WHERE id = ${id}
  `;

  return { ok: true };
});