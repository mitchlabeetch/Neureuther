// POST /api/checklist-items — add a new task (daily or long-term).
// Accepts an optional `kind` ('daily' | 'long_term'), `deadline` (ISO string),
// `flagId` (string or null), and `autoCompleteOnSubtasks` (boolean).
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    id?: string;
    label?: string;
    points?: number;
    kind?: string;
    deadline?: string | null;
    flagId?: string | null;
    autoCompleteOnSubtasks?: boolean;
  }>(event);

  if (!body?.label?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "label is required" });
  }

  const id = body.id?.trim() || crypto.randomUUID();
  const label = body.label.trim();
  const points =
    typeof body.points === "number" && Number.isFinite(body.points) && body.points >= 0
      ? Math.floor(body.points)
      : 5;
  const kind = body.kind === "long_term" ? "long_term" : "daily";
  const deadline =
    body.deadline && typeof body.deadline === "string"
      ? new Date(body.deadline).toISOString()
      : null;
  const flagId = body.flagId ?? null;
  const autoComplete = Boolean(body.autoCompleteOnSubtasks);

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                       FROM checklist_items`;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`INSERT INTO checklist_items
              (id, label, completed, sort_order, points,
               kind, archived, deadline, flag_id, auto_complete_on_subtasks)
            VALUES
              (${id}, ${label}, FALSE, ${nextSort}, ${points},
               ${kind}, FALSE, ${deadline}, ${flagId}, ${autoComplete})`;

  return {
    id,
    label,
    completed: false,
    completedBy: null,
    completedAt: null,
    points,
    kind,
    archived: false,
    deadline,
    flagId,
    autoCompleteOnSubtasks: autoComplete,
  };
});
