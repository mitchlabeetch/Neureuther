// GET /api/ingredient-suggestions?q=to — prefix & fuzzy suggestions from the
// dictionary, ranked by use_count. Used for typeahead in input fields.
import { defineHandler } from "nitro";
import { getQuery } from "nitro/h3";
import { sql } from "../../utils/db";

export default defineHandler(async (event) => {
  const q = (getQuery(event).q as string | undefined)?.trim() || "";
  if (!q) {
    return sql`SELECT name, use_count, last_used_at
               FROM ingredient_dictionary
               ORDER BY use_count DESC, last_used_at DESC
               LIMIT 20`;
  }
  const like = q.toLowerCase() + "%";
  const contains = "%" + q.toLowerCase() + "%";
  return sql`
    SELECT name, use_count, last_used_at FROM (
      SELECT name, use_count, last_used_at, 1 AS rank
      FROM ingredient_dictionary WHERE lower(name) LIKE ${like}
      UNION ALL
      SELECT name, use_count, last_used_at, 2 AS rank
      FROM ingredient_dictionary WHERE lower(name) LIKE ${contains} AND lower(name) NOT LIKE ${like}
    ) t
    ORDER BY rank, use_count DESC, last_used_at DESC
    LIMIT 12
  `;
});
