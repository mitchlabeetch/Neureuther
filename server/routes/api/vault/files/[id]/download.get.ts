// GET /api/vault/files/:id/download — stream a file's bytes back to the client.
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { getRouterParam, createError, setResponseHeader } from "nitro/h3";
import { sql } from "../../../../../utils/db";

function safeAsciiFilename(name: string): string {
  return name
    .replace(/[^\w.\- ()]+/g, "_")
    .replace(/"/g, "")
    .slice(0, 200) || "download";
}

export default defineHandler(async (event) => {
  const userId = (event.context as Record<string, unknown>).userId as
    | string
    | undefined;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "missing id" });
  }

  const rows = await sql<{
    data: Buffer | Uint8Array;
    original_name: string;
    mime_type: string;
    size_bytes: number | string;
  }[]>`
    SELECT data, original_name, mime_type, size_bytes
    FROM vault_files
    WHERE id = ${id}
  `;
  if (rows.length === 0) {
    throw createError({ statusCode: 404, statusMessage: "file not found" });
  }

  const row = rows[0];
  const buf = Buffer.isBuffer(row.data)
    ? row.data
    : Buffer.from(row.data as Uint8Array);

  setResponseHeader(event, "Content-Type", row.mime_type);
  setResponseHeader(
    event,
    "Content-Length",
    String(Number(row.size_bytes) || buf.length),
  );
  setResponseHeader(
    event,
    "Content-Disposition",
    `attachment; filename="${safeAsciiFilename(row.original_name)}"`,
  );
  setResponseHeader(event, "Cache-Control", "private, no-store");

  return buf;
});
