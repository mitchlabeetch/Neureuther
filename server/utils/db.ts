// Neon Database Client (server-side only)
// Always import `sql` explicitly in handlers: `import { sql } from '../../utils/db';`
// — do not rely on Nitro auto-imports for the DB client.
import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.DATABASE_URL!);

// IMPORTANT: Only use this from server/ (Nitro routes, middleware, utils).
// NEVER import @neondatabase/serverless from src/ — that bundle ships to the browser.
// Prefer sql`...` tagged queries over string-built SQL.
