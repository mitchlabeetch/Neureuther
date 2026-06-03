// POST /api/migrate — best-effort one-time import of legacy localStorage data.
// Accepts the previous AppState shape and upserts users, checklist, wheels,
// wheel memberships, rewards, and points log entries. The client invokes this
// once on first load if it finds a stale `neureuther-state` blob, then deletes
// the localStorage key. Safe to call repeatedly — ON CONFLICT DO NOTHING for
// the keyed rows.
import { defineHandler } from "nitro";
import { readBody, createError } from "nitro/h3";
import { sql } from "../../utils/db";

interface LegacyUser {
  id: string;
  name: string;
  color: string;
  emoji: string;
}
interface LegacyChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}
interface LegacyWheelConfig {
  id: string;
  title: string;
  users: string[];
  pointsPerTask: number;
}
interface LegacyRewardItem {
  id: string;
  label: string;
  pointsCost: number;
  icon: string;
}
interface LegacyPointsLog {
  userId: string;
  points: number;
  reason: string;
  timestamp: string;
}
interface LegacyState {
  users: LegacyUser[];
  checklistItems: LegacyChecklistItem[];
  wheelConfigs: LegacyWheelConfig[];
  rewardItems: LegacyRewardItem[];
  pointsLog: LegacyPointsLog[];
}

export default defineHandler(async (event) => {
  const body = await readBody<LegacyState>(event);
  if (!body) {
    throw createError({ statusCode: 400, statusMessage: "missing payload" });
  }

  const queries: Array<ReturnType<typeof sql>> = [];

  for (const u of body.users ?? []) {
    if (!u?.id || !u.name || !u.color || !u.emoji) continue;
    queries.push(
      sql`INSERT INTO users (id, name, color, emoji)
          VALUES (${u.id}, ${u.name}, ${u.color}, ${u.emoji})
          ON CONFLICT (id) DO NOTHING`,
    );
  }

  for (const c of body.checklistItems ?? []) {
    if (!c?.id || !c.label) continue;
    const completedBy = c.completedBy ?? null;
    const completedAt = c.completedAt ?? null;
    queries.push(
      sql`INSERT INTO checklist_items
            (id, label, completed, completed_by, completed_at)
          VALUES (${c.id}, ${c.label}, ${c.completed}, ${completedBy}, ${completedAt})
          ON CONFLICT (id) DO NOTHING`,
    );
  }

  for (const w of body.wheelConfigs ?? []) {
    if (!w?.id || !w.title || !Array.isArray(w.users)) continue;
    queries.push(
      sql`INSERT INTO wheel_configs (id, title, points_per_task)
          VALUES (${w.id}, ${w.title}, ${w.pointsPerTask})
          ON CONFLICT (id) DO NOTHING`,
    );
    for (const uid of w.users) {
      queries.push(
        sql`INSERT INTO wheel_config_users (wheel_config_id, user_id)
            VALUES (${w.id}, ${uid})
            ON CONFLICT DO NOTHING`,
      );
    }
  }

  for (const r of body.rewardItems ?? []) {
    if (!r?.id || !r.label || typeof r.pointsCost !== "number") continue;
    queries.push(
      sql`INSERT INTO reward_items (id, label, points_cost, icon)
          VALUES (${r.id}, ${r.label}, ${r.pointsCost}, ${r.icon || "🎁"})
          ON CONFLICT (id) DO NOTHING`,
    );
  }

  for (const p of body.pointsLog ?? []) {
    if (!p?.userId || typeof p.points !== "number" || !p.reason) continue;
    queries.push(
      sql`INSERT INTO points_log (user_id, points, reason, occurred_at)
          VALUES (${p.userId}, ${p.points}, ${p.reason}, ${p.timestamp})`,
    );
  }

  if (queries.length > 0) await sql.transaction(queries);

  return { ok: true, imported: queries.length };
});
