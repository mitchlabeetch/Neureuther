// POST /api/rewards/seed — idempotent seed of default reward catalog.
// Only inserts when the reward_items table is empty, so it is safe to call
// repeatedly (e.g. on app startup or manually from an admin UI).
import { defineHandler } from "nitro";
import { createError } from "nitro/h3";
import { sql } from "../../../utils/db";

const DEFAULT_REWARDS = [
  { id: "1",   label: "Choose the movie",         pointsCost: 50,  icon: "🎬", category: "experience", description: "You get to pick what the family watches tonight" },
  { id: "2",   label: "Skip one chore",           pointsCost: 100, icon: "🛌", category: "privilege",  description: "Skip any household chore of your choice for one day" },
  { id: "3",   label: "Pick takeout place",       pointsCost: 75,  icon: "🍕", category: "experience", description: "Pick where the family orders dinner from" },
  { id: "4",   label: "Extra screen time",        pointsCost: 60,  icon: "📱", category: "privilege",  description: "Extra 30 minutes of screen time today" },
  { id: "r5",  label: "Stay up 30 min late",      pointsCost: 80,  icon: "🌙", category: "privilege",  description: "Stay up past bedtime for an extra 30 minutes" },
  { id: "r6",  label: "Choose weekend activity",  pointsCost: 120, icon: "🎯", category: "experience", description: "Pick what the family does this weekend" },
  { id: "r7",  label: "No-dishes pass",           pointsCost: 100, icon: "🍽️", category: "privilege",  description: "Skip washing dishes for one full day" },
  { id: "r8",  label: "Ice cream run",            pointsCost: 40,  icon: "🍦", category: "treat",        description: "A trip to get your favorite ice cream" },
  { id: "r9",  label: "Favorite snack",           pointsCost: 30,  icon: "🍪", category: "treat",        description: "Your choice of any snack from the store" },
  { id: "r10", label: "New book",                 pointsCost: 90,  icon: "📚", category: "treat",        description: "Pick out a new book or comic to keep" },
  { id: "r11", label: "Hot cocoa bar",            pointsCost: 50,  icon: "☕", category: "treat",        description: "A fancy hot cocoa with all the toppings" },
  { id: "r12", label: "Bubble bath deluxe",       pointsCost: 60,  icon: "🛁", category: "treat",        description: "A long bubble bath with bath bombs and candles" },
  { id: "r13", label: "Friend playdate",          pointsCost: 110, icon: "👫", category: "social",       description: "Invite a friend over for a playdate" },
  { id: "r14", label: "Family outing pick",       pointsCost: 150, icon: "🚗", category: "experience", description: "Choose the destination for a family day out" },
  { id: "r15", label: "Breakfast in bed",         pointsCost: 140, icon: "🥞", category: "privilege",  description: "Get breakfast served to you in bed on a weekend" },
  { id: "r16", label: "Get-out-of-task card",     pointsCost: 180, icon: "🃏", category: "privilege",  description: "Skip any one task, no questions asked" },
  { id: "r17", label: "Video game time",          pointsCost: 55,  icon: "🎮", category: "privilege",  description: "One hour of video game time of your choice" },
  { id: "r18", label: "Pizza night pick",         pointsCost: 70,  icon: "🍕", category: "experience", description: "Choose the toppings for family pizza night" },
  { id: "r19", label: "Park adventure",           pointsCost: 45,  icon: "🌳", category: "experience", description: "Pick the park and activities for an afternoon out" },
  { id: "r20", label: "Craft supply spree",       pointsCost: 85,  icon: "✂️", category: "treat",        description: "Pick out new art or craft supplies" },
  { id: "r21", label: "Sleepover hosting",        pointsCost: 200, icon: "🏕️", category: "social",       description: "Host a sleepover with your best friend" },
  { id: "r22", label: "Movie theater trip",       pointsCost: 130, icon: "🍿", category: "experience", description: "A trip to the cinema with popcorn included" },
  { id: "r23", label: "Lazy morning pass",        pointsCost: 75,  icon: "😴", category: "privilege",  description: "Sleep in and skip morning routines" },
  { id: "r24", label: "Special dessert",          pointsCost: 35,  icon: "🍰", category: "treat",        description: "Any dessert of your choice after dinner" },
];

export default defineHandler(async () => {
  const guardRows = await sql`
    SELECT to_regclass('public.reward_items') IS NOT NULL AS has_table
  `;
  const hasTable = Boolean(
    (guardRows[0] as { has_table: boolean | string } | undefined)?.has_table,
  );
  if (!hasTable) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "reward_items table is missing — run the database migrations and retry",
    });
  }

  const countRow = await sql`SELECT COUNT(*)::int AS c FROM reward_items`;
  const existing = Number((countRow[0] as { c: number | string }).c) || 0;

  if (existing > 0) {
    return { seeded: 0, reason: "reward_items already populated" };
  }

  const queries = DEFAULT_REWARDS.map((r, i) =>
    sql`INSERT INTO reward_items (id, label, points_cost, icon, sort_order, category, description)
        VALUES (${r.id}, ${r.label}, ${r.pointsCost}, ${r.icon}, ${i}, ${r.category}, ${r.description})`,
  );

  await sql.transaction(queries);

  return { seeded: DEFAULT_REWARDS.length };
});
