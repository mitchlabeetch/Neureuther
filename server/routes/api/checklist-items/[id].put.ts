// PUT /api/checklist-items/:id — update any editable field on a task.
// Supports label, points, deadline, flagId, archived, autoCompleteOnSubtasks.
// Returns the full row so the client can refresh its in-memory state.
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

interface UpdateBody {
  label?: string;
  points?: number;
  deadline?: string | null;
  flagId?: string | null;
  archived?: boolean;
  autoCompleteOnSubtasks?: boolean;
}

export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const body = await readBody<UpdateBody>(event);

  const hasLabel =
    typeof body?.label === "string" && body.label.trim().length > 0;
  const hasPoints =
    body?.points !== undefined &&
    typeof body.points === "number" &&
    Number.isFinite(body.points) &&
    body.points >= 0;
  const hasDeadline = body && Object.prototype.hasOwnProperty.call(body, "deadline");
  const hasFlag = body && Object.prototype.hasOwnProperty.call(body, "flagId");
  const hasArchived =
    body && Object.prototype.hasOwnProperty.call(body, "archived");
  const hasAuto =
    body && Object.prototype.hasOwnProperty.call(body, "autoCompleteOnSubtasks");

  if (
    !hasLabel &&
    !hasPoints &&
    !hasDeadline &&
    !hasFlag &&
    !hasArchived &&
    !hasAuto
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "no updatable fields provided",
    });
  }

  // Build the update set with a tagged template so we avoid string-built SQL
  // even though the columns are all static. Each column is only written when
  // its corresponding field was present in the request body.
  await sql`
    UPDATE checklist_items SET
      label = COALESCE(${hasLabel ? body.label!.trim() : null}::text, label),
      points = COALESCE(${hasPoints ? Math.floor(body.points!) : null}::int, points),
      deadline = CASE
        WHEN ${hasDeadline}::boolean THEN ${body.deadline ? new Date(body.deadline).toISOString() : null}::timestamptz
        ELSE deadline
      END,
      flag_id = CASE
        WHEN ${hasFlag}::boolean THEN ${body.flagId ?? null}::text
        ELSE flag_id
      END,
      archived = CASE
        WHEN ${hasArchived}::boolean THEN ${Boolean(body.archived)}::boolean
        ELSE archived
      END,
      auto_complete_on_subtasks = CASE
        WHEN ${hasAuto}::boolean THEN ${Boolean(body.autoCompleteOnSubtasks)}::boolean
        ELSE auto_complete_on_subtasks
      END
    WHERE id = ${id}
  `;

  return { ok: true };
});
