// Server-side helpers shared by the state GET handler and the
// claim/award endpoints so the daily-reset logic and the response
// shape stay in one place.
import { sql } from "./db";

export interface User {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy: string | null;
  completedAt: string | null;
  points: number;
}

export interface WheelConfig {
  id: string;
  title: string;
  pointsPerTask: number;
  users: string[];
}

export interface RewardItem {
  id: string;
  label: string;
  pointsCost: number;
  icon: string;
}

export interface PointsLogEntry {
  id: string;
  userId: string;
  points: number;
  reason: string;
  timestamp: string;
}

export interface AppStatePayload {
  users: User[];
  checklistItems: ChecklistItem[];
  wheelConfigs: WheelConfig[];
  rewardItems: RewardItem[];
  pointsLog: PointsLogEntry[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Resets the daily checklist if `last_checklist_reset_date` does not match
 * today (UTC). Safe to call on every state read — only does work when the
 * stored date is different from today.
 */
export async function resetChecklistIfNeeded(): Promise<void> {
  const today = todayUtc();
  const rows =
    await sql`SELECT value FROM settings WHERE key = 'last_checklist_reset_date'`;
  const last = rows[0]?.value as string | undefined;
  if (last === today) return;

  // Reset all checklist items, then upsert the setting in a single round-trip
  // via a CTE chain. If the client races two state GETs at midnight, both will
  // execute the same idempotent reset; the only "waste" is a no-op UPDATE.
  await sql`
    WITH today AS (SELECT ${today}::text AS d),
         cleared AS (
           UPDATE checklist_items
           SET completed = FALSE,
               completed_by = NULL,
               completed_at = NULL
           WHERE (SELECT d FROM today) <> COALESCE(${last ?? null}, '0000-00-00')
           RETURNING id
         ),
         upserted AS (
           INSERT INTO settings (key, value)
           SELECT 'last_checklist_reset_date', d FROM today
           ON CONFLICT (key) DO UPDATE
             SET value = EXCLUDED.value,
                 updated_at = now()
           WHERE (SELECT d FROM today) <> COALESCE(${last ?? null}, '0000-00-00')
           RETURNING key
         )
    SELECT 1
  `;
}

/**
 * Loads the full app state. Use `runDailyReset = true` for the public
 * `GET /api/state` endpoint; pass `false` for sub-routes that only need a
 * single slice (e.g. the `GET /api/points-log` endpoint) to avoid an extra
 * write round-trip.
 */
export async function loadAppState(
  runDailyReset = true,
): Promise<AppStatePayload> {
  if (runDailyReset) await resetChecklistIfNeeded();

  const [users, checklist, wheels, wheelUsers, rewards, pointsLog] =
    await Promise.all([
      sql`SELECT id, name, color, emoji FROM users ORDER BY sort_order, created_at`,
      sql`SELECT id, label, completed, completed_by, completed_at, points
          FROM checklist_items ORDER BY sort_order, created_at`,
      sql`SELECT id, title, points_per_task
          FROM wheel_configs ORDER BY sort_order, created_at`,
      sql`SELECT wheel_config_id, user_id FROM wheel_config_users`,
      sql`SELECT id, label, points_cost, icon
          FROM reward_items ORDER BY sort_order, created_at`,
      sql`SELECT id, user_id, points, reason, occurred_at
          FROM points_log ORDER BY occurred_at DESC`,
    ]);

  const usersByConfig = new Map<string, string[]>();
  for (const row of wheelUsers as Array<{
        wheel_config_id: string;
        user_id: string;
      }>) {
    const list = usersByConfig.get(row.wheel_config_id) ?? [];
    list.push(row.user_id);
    usersByConfig.set(row.wheel_config_id, list);
  }

  return {
    users: (users as Array<{
      id: string;
      name: string;
      color: string;
      emoji: string;
    }>).map((u) => ({
      id: u.id,
      name: u.name,
      color: u.color,
      emoji: u.emoji,
    })),
    checklistItems: (
      checklist as Array<{
        id: string;
        label: string;
        completed: boolean;
        completed_by: string | null;
        completed_at: string | null;
        points: number;
      }>
    ).map((c) => ({
      id: c.id,
      label: c.label,
      completed: c.completed,
      completedBy: c.completed_by,
      completedAt: c.completed_at ? new Date(c.completed_at).toISOString() : null,
      points: Number(c.points) || 5,
    })),
    wheelConfigs: (
      wheels as Array<{
        id: string;
        title: string;
        points_per_task: number;
      }>
    ).map((w) => ({
      id: w.id,
      title: w.title,
      pointsPerTask: w.points_per_task,
      users: usersByConfig.get(w.id) ?? [],
    })),
    rewardItems: (
      rewards as Array<{
        id: string;
        label: string;
        points_cost: number;
        icon: string;
      }>
    ).map((r) => ({
      id: r.id,
      label: r.label,
      pointsCost: r.points_cost,
      icon: r.icon,
    })),
    pointsLog: (
      pointsLog as Array<{
        id: string;
        user_id: string;
        points: number;
        reason: string;
        occurred_at: string;
      }>
    ).map((p) => ({
      id: p.id,
      userId: p.user_id,
      points: p.points,
      reason: p.reason,
      timestamp: new Date(p.occurred_at).toISOString(),
    })),
  };
}

/** Sum of all points entries for a given user — used for balance checks. */
export async function getUserPointsBalance(userId: string): Promise<number> {
  const rows =
    await sql`SELECT COALESCE(SUM(points), 0)::int AS total
              FROM points_log WHERE user_id = ${userId}`;
  return Number((rows[0] as { total: number | string }).total) || 0;
}
