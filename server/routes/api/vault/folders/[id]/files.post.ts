// POST /api/vault/folders/:id/files — upload a file to a folder.
// Body: { name: string, mimeType: string, data: base64 string }
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { readBody, getRouterParam, createError, setResponseStatus } from "nitro/h3";
import { sql } from "../../../../../utils/db";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB hard cap per file.

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\- ()]+/g, "_").slice(0, 200);
}

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

  const folderRows = await sql<{ id: string }[]>`
    SELECT id FROM vault_folders WHERE id = ${folderId}
  `;
  if (folderRows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "folder not found" });
  }

  const body = await readBody<{
    name?: string;
    mimeType?: string;
    data?: string;
  }>(event);

  const originalName = body?.name?.trim();
  const mimeType = body?.mimeType?.trim() || "application/octet-stream";
  const data = body?.data;

  if (!originalName) {
    throw createError({ statusCode: 400, statusMessage: "name required" });
  }
  if (!data || typeof data !== "string") {
    throw createError({ statusCode: 400, statusMessage: "data required" });
  }

  // Strip a possible "data:<mime>;base64," prefix
  const cleanBase64 = data.startsWith("data:")
    ? data.substring(data.indexOf(",") + 1)
    : data;

  let buffer: Buffer;
  try {
    buffer = Buffer.from(cleanBase64, "base64");
  } catch {
    throw createError({ statusCode: 400, statusMessage: "invalid base64" });
  }

  if (buffer.length === 0) {
    throw createError({ statusCode: 400, statusMessage: "empty file" });
  }
  if (buffer.length > MAX_FILE_BYTES) {
    setResponseStatus(event, 413);
    throw createError({
      statusCode: 413,
      statusMessage: `file too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`,
    });
  }

  const id = crypto.randomUUID();
  const safeName = sanitizeFilename(originalName);

  await sql`
    INSERT INTO vault_files
      (id, folder_id, name, original_name, mime_type, size_bytes, data, uploaded_by)
    VALUES
      (${id}, ${folderId}, ${safeName}, ${originalName}, ${mimeType}, ${buffer.length}, ${buffer}, ${userId})
  `;

  return {
    id,
    folderId,
    name: safeName,
    originalName,
    mimeType,
    sizeBytes: buffer.length,
    uploadedBy: userId,
  };
});
