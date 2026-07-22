import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

type SortRow = { next: number | string | null };

export default defineHandler(async (event) => {
  const body = await readBody<{ userId?: string; widgetType?: string; title?: string; value?: string }>(event);

  if (!body?.userId) throw createError({ statusCode: 400, statusMessage: "userId required" });
  if (!body?.title?.trim()) throw createError({ statusCode: 400, statusMessage: "title required" });

  const id = crypto.randomUUID();

  const tail = await sql`SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
                         FROM personal_dashboard_widgets WHERE user_id = ${body.userId}`;
  const nextSort = Number((tail[0] as SortRow | undefined)?.next) || 0;

  await sql`INSERT INTO personal_dashboard_widgets (id, user_id, widget_type, title, value, sort_order)
            VALUES (${id}, ${body.userId}, ${body.widgetType || "stat"}, ${body.title.trim()}, ${body.value || "0"}, ${nextSort})`;

  return { id, userId: body.userId, widgetType: body.widgetType || "stat", title: body.title.trim(), value: body.value || "0", sortOrder: nextSort };
});
