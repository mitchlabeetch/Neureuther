// GET /api/vault/folders/:id/files — list files in a folder (metadata only,
// binary data is NOT included — use the download endpoint to fetch a file).
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { getRouterParam, createError } from "nitro/h3";
import { sql } from "../../../../../utils/db";

export default defineHandler(async (event) => {
  const userId = (event.context as Record<string, unknown>).userId as
    | string
    | undefined;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const folderId = getRouterParam(event, "id");
  if (!folderId) {
    throw createError({ statusCode: 400, statusMessage: "missing folder id" });
  }

  const folderRows = await sql<{ id: string; name: string; color: string }[]>`
    SELECT id, name, color FROM vault_folders WHERE id = ${folderId}
  `;
  if (folderRows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "folder not found" });
  }

  const rows = await sql<{
    id: string;
    folder_id: string;
    name: string;
    original_name: string;
    mime_type: string;
    size_bytes: number | string;
    uploaded_by: string | null;
    created_at: string;
  }>`
    SELECT id, folder_id, name, original_name, mime_type, size_bytes,
           uploaded_by, created_at
    FROM vault_files
    WHERE folder_id = ${folderId}
    ORDER BY created_at DESC
  `;

  return {
    folder: {
      id: folderRows[0].id,
      name: folderRows[0].name,
      color: folderRows[0].color,
    },
    files: rows.map((r) => ({
      id: r.id,
      folderId: r.folder_id,
      name: r.name,
      originalName: r.original_name,
      mimeType: r.mime_type,
      sizeBytes: Number(r.size_bytes) || 0,
      uploadedBy: r.uploaded_by,
      createdAt: new Date(r.created_at).toISOString(),
    })),
  };
});
