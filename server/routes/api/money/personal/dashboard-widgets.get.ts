import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../../../utils/db";

export default defineHandler(async (event) => {
  const { userId } = getQuery(event);
  if (!userId) throw createError({ statusCode: 400 });

  const rows = await sql`
    SELECT * FROM personal_dashboard_widgets WHERE user_id = ${userId} ORDER BY sort_order, created_at
  `;

  return rows.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    widgetType: r.widget_type,
    title: r.title,
    value: r.value,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
  }));
});
