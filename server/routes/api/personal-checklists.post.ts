// POST /api/personal-checklists — create a new personal checklist
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const body = await readBody<{
    userId?: string;
    name?: string;
    bgColor?: string;
    flagId?: string | null;
    deadline?: string | null;
  }>(event);

  if (!body?.userId || !body?.name?.trim()) {
    throw createError({ statusCode: 400, statusMessage: "userId and name are required" });
  }

  const id = crypto.randomUUID();
  const name = body.name.trim();
  const bgColor = body.bgColor || "#ffffff";
  const flagId = body.flagId ?? null;
  const deadline = body.deadline && typeof body.deadline === "string"
    ? new Date(body.deadline).toISOString()
    : null;

  const tail = await sql`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
    FROM personal_checklists WHERE user_id = ${body.userId}
  `;
  const nextSort = Number((tail[0] as { next: number | string }).next) || 0;

  await sql`
    INSERT INTO personal_checklists (id, user_id, name, bg_color, flag_id, deadline, sort_order)
    VALUES (${id}, ${body.userId}, ${name}, ${bgColor}, ${flagId}, ${deadline}, ${nextSort})
  `;

  return {
    id,
    userId: body.userId,
    name,
    bgColor,
    flagId,
    deadline,
    archived: false,
    sortOrder: nextSort,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    totalTasks: 0,
    doneTasks: 0,
  };
});