// Helpers for human-readable "x days left" countdowns used by long-term
// task deadlines. Returns a label, an urgency tier (for styling), and a
// stable ISO timestamp (for keying in lists).
export type DeadlineUrgency = "overdue" | "today" | "soon" | "ok" | "far";

export interface DeadlineInfo {
  label: string;
  urgency: DeadlineUrgency;
  iso: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function describeDeadline(
  iso: string | null | undefined,
  now: Date = new Date(),
): DeadlineInfo | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;

  const today = startOfLocalDay(now);
  const targetDay = startOfLocalDay(target);
  const diffMs = targetDay.getTime() - today.getTime();
  const days = Math.round(diffMs / MS_PER_DAY);

  if (days < 0) {
    const overdueDays = -days;
    return {
      label: overdueDays === 1 ? "1 day overdue" : `${overdueDays} days overdue`,
      urgency: "overdue",
      iso: target.toISOString(),
    };
  }
  if (days === 0) {
    return { label: "Due today", urgency: "today", iso: target.toISOString() };
  }
  if (days === 1) {
    return { label: "1 day left", urgency: "soon", iso: target.toISOString() };
  }
  if (days <= 7) {
    return { label: `${days} days left`, urgency: "soon", iso: target.toISOString() };
  }
  return { label: `${days} days left`, urgency: "ok", iso: target.toISOString() };
}
