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

export interface ChecklistSubtask {
  id: string;
  taskId: string;
  label: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy: string | null;
  completedAt: string | null;
  points: number;
  kind: "daily" | "long_term";
  archived: boolean;
  deadline: string | null;
  flagId: string | null;
  autoCompleteOnSubtasks: boolean;
}

export interface TaskFlag {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
}

export interface WheelConfig {
  id: string;
  title: string;
  pointsPerTask: number;
  users: string[];
  lastPickUserId: string | null;
  lastPickAt: string | null;
}

export interface RewardItem {
  id: string;
  label: string;
  pointsCost: number;
  icon: string;
  category: string;
  description: string | null;
}

export interface PointsLogEntry {
  id: string;
  userId: string;
  points: number;
  reason: string;
  timestamp: string;
}

export interface PersonalChecklistEntry {
  id: string;
  userId: string;
  kind: string;
  name: string;
  bgColor: string;
  flagId: string | null;
  deadline: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  totalTasks: number;
  doneTasks: number;
}

export interface PersonalChecklistTaskEntry {
  id: string;
  checklistId: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  deadline: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface MealRecipeEntry {
  id: string;
  name: string;
  emoji: string;
  notes: string;
  cuisine: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecipeIngredientEntry {
  id: string;
  recipeId: string;
  name: string;
  quantity: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface MealPlanEntryEntry {
  id: string;
  weekStartDate: string;
  dayOfWeek: number;
  slot: "lunch" | "dinner";
  recipeId: string | null;
  customName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryMainItemEntry {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface GroceryListEntry {
  id: string;
  name: string;
  emoji: string;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroceryListItemEntry {
  id: string;
  listId: string;
  name: string;
  quantity: string | null;
  checked: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AppStatePayload {
  users: User[];
  checklistItems: ChecklistItem[];
  checklistSubtasks: ChecklistSubtask[];
  taskFlags: TaskFlag[];
  wheelConfigs: WheelConfig[];
  rewardItems: RewardItem[];
  pointsLog: PointsLogEntry[];
  personalChecklists: PersonalChecklistEntry[];
  personalChecklistTasks: PersonalChecklistTaskEntry[];
  mealRecipes: MealRecipeEntry[];
  mealRecipeIngredients: MealRecipeIngredientEntry[];
  mealPlanEntries: MealPlanEntryEntry[];
  groceryMainItems: GroceryMainItemEntry[];
  groceryLists: GroceryListEntry[];
  groceryListItems: GroceryListItemEntry[];
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Resets the daily checklist if `last_checklist_reset_date` does not match
 * today (UTC). Only touches rows with `kind = 'daily'`; long-term items
 * keep their `archived` flag and are not affected by the daily reset.
 */
export async function resetChecklistIfNeeded(): Promise<void> {
  const today = todayUtc();
  const rows =
    await sql`SELECT value FROM settings WHERE key = 'last_checklist_reset_date'`;
  const last = rows[0]?.value as string | undefined;
  if (last === today) return;

  await sql`
    UPDATE checklist_items
    SET completed = FALSE,
        completed_by = NULL,
        completed_at = NULL
    WHERE kind = 'daily' AND archived = FALSE
  `;

  await sql`
    INSERT INTO settings (key, value)
    VALUES ('last_checklist_reset_date', ${today})
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value,
          updated_at = now()
  `;
}

/**
 * Loads the full app state. Use `runDailyReset = true` for the public
 * `GET /api/state` endpoint; pass `false` for sub-routes that only need a
 * single slice to avoid an extra write round-trip.
 */
export async function loadAppState(
  runDailyReset = true,
): Promise<AppStatePayload> {
  if (runDailyReset) await resetChecklistIfNeeded();

  const [
    users,
    checklist,
    subtasks,
    flags,
    wheels,
    wheelUsers,
    rewards,
    pointsLog,
    personalChecklists,
    personalChecklistTasksRaw,
    mealRecipes,
    mealRecipeIngredients,
    mealPlanEntries,
    groceryMainItems,
    groceryLists,
    groceryListItems,
  ] = await Promise.all([
    sql`SELECT id, name, color, emoji FROM users ORDER BY sort_order, created_at`,
    sql`SELECT id, label, completed, completed_by, completed_at, points,
               kind, archived, deadline, flag_id, auto_complete_on_subtasks
        FROM checklist_items ORDER BY sort_order, created_at`,
    sql`SELECT id, task_id, label, completed, sort_order, created_at
        FROM checklist_subtasks ORDER BY sort_order, created_at`,
    sql`SELECT id, name, color, sort_order, created_at
        FROM task_flags ORDER BY sort_order, created_at`,
    sql`SELECT id, title, points_per_task, last_pick_user_id, last_pick_at
            FROM wheel_configs ORDER BY sort_order, created_at`,
    sql`SELECT wheel_config_id, user_id FROM wheel_config_users`,
    sql`SELECT id, label, points_cost, icon, category, description
        FROM reward_items ORDER BY sort_order, created_at`,
    sql`SELECT id, user_id, points, reason, occurred_at
        FROM points_log ORDER BY occurred_at DESC`,
    sql`SELECT pc.id, pc.user_id, pc.kind, pc.name, pc.bg_color, pc.flag_id, pc.deadline,
               pc.archived, pc.sort_order, pc.created_at, pc.updated_at,
               COALESCE(t.total, 0)::int AS total_tasks,
               COALESCE(t.done, 0)::int AS done_tasks
        FROM personal_checklists pc
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS total,
                 COUNT(*) FILTER (WHERE completed = TRUE)::int AS done
          FROM personal_checklist_tasks WHERE checklist_id = pc.id
        ) t ON true
        ORDER BY pc.sort_order, pc.created_at`,
    sql`SELECT id, checklist_id, label, completed, completed_at, deadline, sort_order, created_at
        FROM personal_checklist_tasks ORDER BY sort_order, created_at`,
    sql`SELECT id, name, emoji, notes, cuisine, sort_order, created_at, updated_at
        FROM meal_recipes ORDER BY sort_order, created_at`,
    sql`SELECT id, recipe_id, name, quantity, sort_order, created_at
        FROM meal_recipe_ingredients ORDER BY sort_order, created_at`,
    sql`SELECT id, week_start_date, day_of_week, slot, recipe_id, custom_name,
               created_at, updated_at
        FROM meal_plan_entries ORDER BY week_start_date, day_of_week, slot`,
    sql`SELECT id, name, quantity, checked, sort_order, created_at
        FROM grocery_main_items ORDER BY sort_order, created_at`,
    sql`SELECT id, name, emoji, archived, sort_order, created_at, updated_at
        FROM grocery_lists WHERE archived = FALSE
        ORDER BY sort_order, created_at`,
    sql`SELECT id, list_id, name, quantity, checked, sort_order, created_at
        FROM grocery_list_items ORDER BY sort_order, created_at`,
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
        kind: string;
        archived: boolean;
        deadline: string | null;
        flag_id: string | null;
        auto_complete_on_subtasks: boolean;
      }>
    ).map((c) => ({
      id: c.id,
      label: c.label,
      completed: c.completed,
      completedBy: c.completed_by,
      completedAt: c.completed_at ? new Date(c.completed_at).toISOString() : null,
      points: Number(c.points) || 5,
      kind: c.kind === "long_term" ? "long_term" : c.kind === "random" ? "random" : "daily",
      archived: Boolean(c.archived),
      deadline: c.deadline ? new Date(c.deadline).toISOString() : null,
      flagId: c.flag_id,
      autoCompleteOnSubtasks: Boolean(c.auto_complete_on_subtasks),
    })),
    checklistSubtasks: (
      subtasks as Array<{
        id: string;
        task_id: string;
        label: string;
        completed: boolean;
        sort_order: number;
        created_at: string;
      }>
    ).map((s) => ({
      id: s.id,
      taskId: s.task_id,
      label: s.label,
      completed: Boolean(s.completed),
      sortOrder: Number(s.sort_order) || 0,
      createdAt: new Date(s.created_at).toISOString(),
    })),
    taskFlags: (
      flags as Array<{
        id: string;
        name: string;
        color: string;
        sort_order: number;
        created_at: string;
      }>
    ).map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      sortOrder: Number(f.sort_order) || 0,
      createdAt: new Date(f.created_at).toISOString(),
    })),
    wheelConfigs: (
      wheels as Array<{
        id: string;
        title: string;
        points_per_task: number;
        last_pick_user_id: string | null;
        last_pick_at: string | null;
      }>
    ).map((w) => ({
      id: w.id,
      title: w.title,
      pointsPerTask: w.points_per_task,
      users: usersByConfig.get(w.id) ?? [],
      lastPickUserId: w.last_pick_user_id,
      lastPickAt: w.last_pick_at ? new Date(w.last_pick_at).toISOString() : null,
    })),
    rewardItems: (
      rewards as Array<{
        id: string;
        label: string;
        points_cost: number;
        icon: string;
        category: string;
        description: string | null;
      }>
    ).map((r) => ({
      id: r.id,
      label: r.label,
      pointsCost: r.points_cost,
      icon: r.icon,
      category: r.category,
      description: r.description,
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
    personalChecklists: (
      personalChecklists as Array<{
        id: string;
        user_id: string;
        kind: string;
        name: string;
        bg_color: string;
        flag_id: string | null;
        deadline: string | null;
        archived: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
        total_tasks: number;
        done_tasks: number;
      }>
    ).map((c) => ({
      id: c.id,
      userId: c.user_id,
      kind: c.kind,
      name: c.name,
      bgColor: c.bg_color,
      flagId: c.flag_id,
      deadline: c.deadline ? new Date(c.deadline).toISOString() : null,
      archived: Boolean(c.archived),
      sortOrder: c.sort_order,
      createdAt: new Date(c.created_at).toISOString(),
      updatedAt: new Date(c.updated_at).toISOString(),
      totalTasks: c.total_tasks,
      doneTasks: c.done_tasks,
    })),
    personalChecklistTasks: (
      personalChecklistTasksRaw as Array<{
        id: string;
        checklist_id: string;
        label: string;
        completed: boolean;
        completed_at: string | null;
        deadline: string | null;
        sort_order: number;
        created_at: string;
      }>
    ).map((t) => ({
      id: t.id,
      checklistId: t.checklist_id,
      label: t.label,
      completed: Boolean(t.completed),
      completedAt: t.completed_at ? new Date(t.completed_at).toISOString() : null,
      deadline: t.deadline ? new Date(t.deadline).toISOString() : null,
      sortOrder: t.sort_order,
      createdAt: new Date(t.created_at).toISOString(),
    })),
    mealRecipes: (
      mealRecipes as Array<{
        id: string;
        name: string;
        emoji: string;
        notes: string;
        cuisine: string | null;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>
    ).map((r) => ({
      id: r.id,
      name: r.name,
      emoji: r.emoji || "🍽️",
      notes: r.notes || "",
      cuisine: r.cuisine,
      sortOrder: Number(r.sort_order) || 0,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    })),
    mealRecipeIngredients: (
      mealRecipeIngredients as Array<{
        id: string;
        recipe_id: string;
        name: string;
        quantity: string | null;
        sort_order: number;
        created_at: string;
      }>
    ).map((i) => ({
      id: i.id,
      recipeId: i.recipe_id,
      name: i.name,
      quantity: i.quantity,
      sortOrder: Number(i.sort_order) || 0,
      createdAt: new Date(i.created_at).toISOString(),
    })),
    mealPlanEntries: (
      mealPlanEntries as Array<{
        id: string;
        week_start_date: string;
        day_of_week: number;
        slot: string;
        recipe_id: string | null;
        custom_name: string | null;
        created_at: string;
        updated_at: string;
      }>
    ).map((p) => ({
      id: p.id,
      weekStartDate:
        typeof p.week_start_date === "string"
          ? p.week_start_date.slice(0, 10)
          : new Date(p.week_start_date).toISOString().slice(0, 10),
      dayOfWeek: p.day_of_week,
      slot: p.slot === "dinner" ? "dinner" : "lunch",
      recipeId: p.recipe_id,
      customName: p.custom_name,
      createdAt: new Date(p.created_at).toISOString(),
      updatedAt: new Date(p.updated_at).toISOString(),
    })),
    groceryMainItems: (
      groceryMainItems as Array<{
        id: string;
        name: string;
        quantity: string | null;
        checked: boolean;
        sort_order: number;
        created_at: string;
      }>
    ).map((g) => ({
      id: g.id,
      name: g.name,
      quantity: g.quantity,
      checked: Boolean(g.checked),
      sortOrder: Number(g.sort_order) || 0,
      createdAt: new Date(g.created_at).toISOString(),
    })),
    groceryLists: (
      groceryLists as Array<{
        id: string;
        name: string;
        emoji: string;
        archived: boolean;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }>
    ).map((l) => ({
      id: l.id,
      name: l.name,
      emoji: l.emoji || "🛒",
      archived: Boolean(l.archived),
      sortOrder: Number(l.sort_order) || 0,
      createdAt: new Date(l.created_at).toISOString(),
      updatedAt: new Date(l.updated_at).toISOString(),
    })),
    groceryListItems: (
      groceryListItems as Array<{
        id: string;
        list_id: string;
        name: string;
        quantity: string | null;
        checked: boolean;
        sort_order: number;
        created_at: string;
      }>
    ).map((g) => ({
      id: g.id,
      listId: g.list_id,
      name: g.name,
      quantity: g.quantity,
      checked: Boolean(g.checked),
      sortOrder: Number(g.sort_order) || 0,
      createdAt: new Date(g.created_at).toISOString(),
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
