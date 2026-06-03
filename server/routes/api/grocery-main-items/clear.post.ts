// POST /api/grocery-main-items/clear — wipe the entire main grocery list
import { defineHandler } from "nitro";
import { sql } from "../../../utils/db";

export default defineHandler(async () => {
  await sql`DELETE FROM grocery_main_items`;
  return { ok: true };
});
