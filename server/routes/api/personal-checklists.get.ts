// GET /api/personal-checklists?userId=xxx&kind=xxx — list personal checklists
import { defineHandler } from "nitro";
import { getQuery, createError } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const { userId, kind } = getQuery(event);

  const filters: string[] = ["pc.archived = FALSE"];
  const params: unknown[] = [];

  if (userId && typeof userId === "string") {
    params.push(userId);
    filters.push(`pc.user_id = $${params.length}`);
  }
  if (kind && typeof kind === "string") {
    params.push(kind);
    filters.push(`pc.kind = $${params.length}`);
  }

  const where = filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "";

  const rows = await sql`
    SELECT pc.id, pc.user_id, pc.kind, pc.name, pc.bg_color, pc.flag_id, pc.deadline,
           pc.archived, pc.sort_order, pc.created_at, pc.updated_at
    FROM personal_checklists pc
    ${sql.__unsafeRaw__(where)}
    ORDER BY pc.sort_order, pc.created_at
  `;

  const taskCounts = await sql`
    SELECT checklist_id,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE completed = TRUE)::int AS done
    FROM personal_checklist_tasks
    WHERE checklist_id IN (SELECT id FROM personal_checklists WHERE archived = FALSE)
    GROUP BY checklist_id
  `;

  const countMap = new Map<string, { total: number; done: number }>();
  for (const r of taskCounts as Array<{ checklist_id: string; total: number; done: number }>) {
    countMap.set(r.checklist_id, { total: r.total, done: r.done });
  }

  return (rows as Array<{
    id: string; user_id: string; kind: string; name: string; bg_color: string;
    flag_id: string | null; deadline: string | null; archived: boolean;
    sort_order: number; created_at: string; updated_at: string;
  }>).map((r) => {
    const counts = countMap.get(r.id) ?? { total: 0, done: 0 };
    return {
      id: r.id,
      userId: r.user_id,
      kind: r.kind,
      name: r.name,
      bgColor: r.bg_color,
      flagId: r.flag_id,
      deadline: r.deadline ? new Date(r.deadline).toISOString() : null,
      archived: Boolean(r.archived),
      sortOrder: r.sort_order,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      totalTasks: counts.total,
      doneTasks: counts.done,
    };
  });
});