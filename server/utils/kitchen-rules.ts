import { sql } from "./db";

export type KitchenRuleCategory =
  | "kitchen"
  | "fridge"
  | "appliances"
  | "cleaning";

export interface KitchenRule {
  id: string;
  label: string;
  category: KitchenRuleCategory;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_RULES: Array<Pick<KitchenRule, "id" | "label" | "category" | "sortOrder">> = [
  { id: "k1", label: "Wipe the kitchen counter", category: "kitchen", sortOrder: 0 },
  { id: "k2", label: "Leave wet stuff open to dry", category: "kitchen", sortOrder: 1 },
  { id: "k3", label: "Keep the sink empty", category: "kitchen", sortOrder: 2 },
  { id: "k4", label: "Check the fridge for expired food", category: "fridge", sortOrder: 3 },
  { id: "k5", label: "Put everything away immediately", category: "kitchen", sortOrder: 4 },
  { id: "k6", label: "Clean appliances after use", category: "appliances", sortOrder: 5 },
  { id: "k7", label: "Take out the bins when full", category: "cleaning", sortOrder: 6 },
];

export async function ensureKitchenRulesSchema(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS kitchen_rules (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('kitchen', 'fridge', 'appliances', 'cleaning')),
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      completed_at TIMESTAMPTZ,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  const countRows = await sql`SELECT COUNT(*)::int AS count FROM kitchen_rules`;
  const count = Number((countRows[0] as { count: number | string } | undefined)?.count ?? 0);
  if (count > 0) return;

  await sql.transaction(
    DEFAULT_RULES.map((rule) => sql`
      INSERT INTO kitchen_rules (id, label, category, sort_order)
      VALUES (${rule.id}, ${rule.label}, ${rule.category}, ${rule.sortOrder})
      ON CONFLICT (id) DO NOTHING
    `),
  );
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function resetKitchenRulesIfNeeded(): Promise<void> {
  await ensureKitchenRulesSchema();
  const today = todayUtc();
  const rows = await sql`SELECT value FROM settings WHERE key = 'last_kitchen_rules_reset_date'`;
  const last = (rows[0] as { value?: string } | undefined)?.value;
  if (last === today) return;

  await sql`
    UPDATE kitchen_rules
    SET completed = FALSE, completed_at = NULL, updated_at = now()
    WHERE completed = TRUE
  `;
  await sql`
    INSERT INTO settings (key, value)
    VALUES ('last_kitchen_rules_reset_date', ${today})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = now()
  `;
}

export function toKitchenRule(row: Record<string, unknown>): KitchenRule {
  const category = row.category as KitchenRuleCategory;
  return {
    id: String(row.id),
    label: String(row.label),
    category,
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
    sortOrder: Number(row.sort_order) || 0,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function loadKitchenRules(): Promise<KitchenRule[]> {
  await resetKitchenRulesIfNeeded();
  const rows = await sql`
    SELECT id, label, category, completed, completed_at, sort_order, created_at, updated_at
    FROM kitchen_rules
    ORDER BY sort_order, created_at
  `;
  return (rows as Array<Record<string, unknown>>).map(toKitchenRule);
}
