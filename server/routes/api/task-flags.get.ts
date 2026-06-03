// GET /api/task-flags — list all task flags, ordered by sort_order then created_at.
import { defineHandler } from "nitro";
import { sql } from "../../utils/db";

export default defineHandler(async () => {
  const rows = await sql`SELECT id, name, color, sort_order, created_at
                         FROM task_flags ORDER BY sort_order, created_at`;
  return (rows as Array<{
    id: string;
    name: string;
    color: string;
    sort_order: number;
    created_at: string;
  }>).map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    sortOrder: Number(f.sort_order) || 0,
    createdAt: new Date(f.created_at).toISOString(),
  }));
});
