// POST /api/vault/folders — create a new vault folder.
// Protected by server/middleware/auth.ts (Neon Auth required).
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../../utils/db";

interface CreateFolderBody {
  name?: string;
  color?: string;
  description?: string | null;
}

const ALLOWED_COLORS = new Set([
  "#A78BFA", // lavender
  "#FDA172", // cantaloupe
  "#69D2A6", // mint
  "#FBBF24", // gold
  "#F472B6", // pink
  "#38BDF8", // sky
  "#FF6B6B", // coral
  "#818CF8", // indigo
  "#34D399", // emerald
  "#FB7185", // rose
]);

export default defineHandler(async (event) => {
  const userId = (event.context as Record<string, unknown>).userId as
    | string
    | undefined;
  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody<CreateFolderBody>(event);
  const name = body?.name?.trim();
  if (!name || name.length > 80) {
    throw createError({
      statusCode: 400,
      statusMessage: "name is required (max 80 chars)",
    });
  }

  const color = body?.color ?? "#A78BFA";
  if (!ALLOWED_COLORS.has(color)) {
    throw createError({ statusCode: 400, statusMessage: "invalid color" });
  }

  const description = body?.description?.trim() || null;

  const id = crypto.randomUUID();
  const tail = await sql<{ next: number | string }[]>`
    SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM vault_folders
  `;
  const sortOrder = Number(tail[0]?.next ?? 0) || 0;

  await sql`
    INSERT INTO vault_folders (id, name, color, description, sort_order)
    VALUES (${id}, ${name}, ${color}, ${description}, ${sortOrder})
  `;

  return {
    id,
    name,
    color,
    description,
    sortOrder,
    fileCount: 0,
  };
});
