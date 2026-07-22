import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  FolderLock,
  ListChecks,
  ShoppingBasket,
  Star,
  Trophy,
  Wallet,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { Progress } from "@/components/ui/progress";

function startOfIsoWeek(date: Date): Date {
  const result = new Date(date);
  const mondayOffset = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - mondayOffset);
  return result;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function HomePage() {
  const { state, isLoading, getUserPoints } = useApp();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const hour = new Date().getHours();
    setGreeting(hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const dailyItems = state.checklistItems.filter((item) => item.kind === "daily" && !item.archived);
  const completedToday = dailyItems.filter((item) => item.completed).length;
  const progress = dailyItems.length ? (completedToday / dailyItems.length) * 100 : 0;
  const today = new Date();
  const weekStart = toIsoDate(startOfIsoWeek(today));
  const dayOfWeek = (today.getDay() + 6) % 7;

  const todayMeals = useMemo(
    () => state.mealPlanEntries.filter((entry) => entry.weekStartDate === weekStart && entry.dayOfWeek === dayOfWeek),
    [dayOfWeek, state.mealPlanEntries, weekStart],
  );

  const habitStatuses = useMemo(
    () => state.users.map((user) => {
      const checklist = state.personalChecklists.find(
        (item) => item.userId === user.id && item.kind === "daily_habit" && !item.archived,
      );
      const tasks = checklist ? state.personalChecklistTasks.filter((task) => task.checklistId === checklist.id) : [];
      return { user, done: tasks.length > 0 && tasks.every((task) => task.completed), count: tasks.length };
    }),
    [state.personalChecklistTasks, state.personalChecklists, state.users],
  );

  const topUser = [...state.users].sort((a, b) => getUserPoints(b.id) - getUserPoints(a.id))[0];

  if (isLoading) {
    return <div className="app-container min-h-screen bg-cream page-content"><div className="px-5 pt-14 pb-6"><LoadingSkeleton rows={5} /></div><BottomNav /></div>;
  }

  return (
    <div className="app-container min-h-screen bg-cream page-content">
      <header className="px-5 pt-14 pb-5 flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-xs font-extrabold text-muted-ink uppercase tracking-[0.1em]">{greeting}</p>
          <h1 className="text-3xl font-semibold text-ink mt-0.5 tracking-tight">Neureuther</h1>
        </div>
        <div className="flex -space-x-2" aria-label={`${state.users.length} household members`}>
          {state.users.slice(0, 4).map((user) => (
            <div key={user.id} className="w-11 h-11 rounded-full border-[2.5px] border-white flex items-center justify-center text-lg shadow-sm" style={{ backgroundColor: `${user.color}30` }}>
              {user.emoji}
            </div>
          ))}
        </div>
      </header>

      <main className="space-y-5">
        <section className="px-5" aria-labelledby="today-heading">
          <div className="bg-surface rounded-panel p-6 shadow-elevated border border-[#b7c6c2]/20 relative overflow-hidden">
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" aria-hidden="true" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold text-cantaloupe uppercase tracking-[0.1em]">Today</p>
                <h2 id="today-heading" className="text-xl font-semibold text-ink mt-1">Keep the day moving</h2>
                <p className="text-sm text-muted-ink font-medium mt-1">{completedToday}/{dailyItems.length} checklist tasks complete</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-cantaloupe-lighter flex items-center justify-center shrink-0">
                <span className="text-xl font-semibold text-cantaloupe">{Math.round(progress)}%</span>
              </div>
            </div>
            <Progress value={progress} className="relative z-10 h-3 rounded-full bg-cantaloupe-lighter mt-5 [&>div]:bg-cantaloupe [&>div]:rounded-full" />
          </div>
        </section>

        <section className="px-5" aria-labelledby="jump-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="jump-heading" className="section-header">Jump back in</h2>
            <span className="text-[11px] font-medium text-muted-ink">Today</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => navigate("/checklist")} className="bg-surface rounded-card p-4 text-left border border-[#b7c6c2]/20 shadow-card active:scale-[0.98] transition">
              <ListChecks size={20} className="text-mint mb-3" />
              <p className="text-sm font-semibold text-ink">Checklist</p>
              <p className="text-xs text-muted-ink mt-1">{dailyItems.length - completedToday} left</p>
            </button>
            <button type="button" onClick={() => navigate("/meals")} className="bg-surface rounded-card p-4 text-left border border-[#b7c6c2]/20 shadow-card active:scale-[0.98] transition">
              <ChefHat size={20} className="text-cantaloupe mb-3" />
              <p className="text-sm font-semibold text-ink">Meals</p>
              <p className="text-xs text-muted-ink mt-1">{todayMeals.length ? todayMeals.map((meal) => meal.customName || "Planned recipe").join(" · ") : "Plan tonight"}</p>
            </button>
          </div>
        </section>

        <section className="px-5" aria-labelledby="habit-heading">
          <div className="flex items-center justify-between mb-3">
            <h2 id="habit-heading" className="section-header">Household pulse</h2>
            <CalendarDays size={16} className="text-muted-ink" />
          </div>
          <div className="bg-surface rounded-card border border-[#b7c6c2]/20 divide-y divide-[#b7c6c2]/10">
            {habitStatuses.length === 0 && <p className="p-4 text-sm text-muted-ink">Add people in Settings to track daily habits.</p>}
            {habitStatuses.map(({ user, done, count }) => (
              <button key={user.id} type="button" onClick={() => navigate(`/daily-habits/${user.id}`)} className="w-full flex items-center gap-3 p-4 text-left active:bg-muted-surface transition">
                <span className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: `${user.color}30` }}>{user.emoji}</span>
                <span className="flex-1 min-w-0"><span className="block text-sm font-semibold text-ink">{user.name}</span><span className="block text-xs text-muted-ink mt-0.5">{count ? `${count} habit${count === 1 ? "" : "s"}` : "No habits yet"}</span></span>
                <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${done ? "bg-mint border-mint text-white" : "border-[#b7c6c2]/40 text-transparent"}`}><Star size={13} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-5" aria-labelledby="tools-heading">
          <h2 id="tools-heading" className="section-header mb-3">Household tools</h2>
          <div className="grid grid-cols-2 gap-3">
            <HomeTool icon={<ClipboardList size={20} />} label="All checklists" onClick={() => navigate("/checklists")} />
            <HomeTool icon={<ShoppingBasket size={20} />} label="Groceries" onClick={() => navigate("/groceries")} />
            <HomeTool icon={<Wallet size={20} />} label="Money" onClick={() => navigate("/money")} />
            <HomeTool icon={<FolderLock size={20} />} label="Documents" onClick={() => navigate("/documents")} />
          </div>
        </section>

        <section className="px-5 pb-8">
          <button type="button" onClick={() => navigate(topUser ? "/rewards" : "/settings")} className="w-full rounded-panel p-5 text-left bg-[#ff6600] text-white shadow-elevated active:scale-[0.98] transition flex items-center justify-between gap-4">
            <span><span className="block text-lg font-semibold">Earn rewards</span><span className="block text-sm text-white/75 mt-1">{topUser ? `${topUser.name} has ${getUserPoints(topUser.id)} points` : "Set up your household first"}</span></span>
            <span className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center"><Trophy size={20} /></span>
          </button>
        </section>
      </main>
      <BottomNav />
    </div>
  );
}

function HomeTool({ icon, label, onClick }: { icon: ReactNode; label: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="bg-surface rounded-card p-4 text-left border border-[#b7c6c2]/20 shadow-card active:scale-[0.98] transition"><span className="block text-cantaloupe mb-3">{icon}</span><span className="text-sm font-semibold text-ink">{label}</span></button>;
}

export default HomePage;
