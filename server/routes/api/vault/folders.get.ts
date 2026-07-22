// GET /api/vault/folders — list all vault folders with file counts.
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { sql } from "../../../utils/db";

export default defineHandler(async (event) => {
  const userId = (event.context as Record<string, unknown>).userId as
    | string
    | undefined;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const rows = await sql<{
    id: string;
    name: string;
    color: string;
    description: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
    file_count: number | string;
  }>`
    SELECT f.id, f.name, f.color, f.description, f.sort_order,
           f.created_at, f.updated_at,
           COALESCE(c.cnt, 0)::int AS file_count
    FROM vault_folders f
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt FROM vault_files WHERE folder_id = f.id
    ) c ON true
    ORDER BY f.sort_order ASC, f.created_at ASC
  `;

  return {
    folders: rows.map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color,
      description: r.description,
      sortOrder: Number(r.sort_order) || 0,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      fileCount: Number(r.file_count) || 0,
    })),
  };
});
