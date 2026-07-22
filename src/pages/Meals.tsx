// Meal planner hub. Three tabs:
//   - Week:    7-day plan with clickable lunch/dinner slots
//   - Recipes: saved meals (create / edit / browse)
//   - All:     all unique ingredients across recipes
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  CalendarDays,
  ChefHat,
  Sparkles,
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X as XIcon,
  Search,
  ListChecks,
  ShoppingBasket,
  BookOpen,
  Tag,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { MealPlanEntry, MealSlot } from "@/lib/store";
import { cn } from "@/lib/utils";
import { MealSlotDialog } from "@/components/meals/MealSlotDialog";
import { RecipeEditorDialog } from "@/components/meals/RecipeEditorDialog";
import { RichContentView } from "@/components/meals/RichTextEditor";
import { showSuccess, showError } from "@/utils/toast";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

type Tab = "week" | "recipes" | "ingredients";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function startOfIsoWeek(d: Date): Date {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

function MealsPage() {
  const navigate = useNavigate();
  const {
    state,
    isLoading,
    renameIngredientEverywhere,
    removeIngredientEverywhere,
  } = useApp();
  const [tab, setTab] = useState<Tab>("week");
  const [weekStart, setWeekStart] = useState<Date>(() => startOfIsoWeek(new Date()));
  const [search, setSearch] = useState("");

  // Slot dialog state
  const [slotDialog, setSlotDialog] = useState<{
    open: boolean;
    day: number;
    slot: MealSlot;
  } | null>(null);
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  const [viewingRecipeId, setViewingRecipeId] = useState<string | null>(null);

  // Ingredient pantry edit/delete state
  const [editingIngredient, setEditingIngredient] = useState<{
    name: string;
    recipes: string[];
  } | null>(null);
  const [confirmDeleteIngredient, setConfirmDeleteIngredient] = useState<
    string | null
  >(null);

  const weekStartIso = toIsoDate(weekStart);

  const planForWeek = useMemo(
    () => state.mealPlanEntries.filter((p) => p.weekStartDate === weekStartIso),
    [state.mealPlanEntries, weekStartIso],
  );

  const findPlan = (day: number, slot: MealSlot): MealPlanEntry | null =>
    planForWeek.find((p) => p.dayOfWeek === day && p.slot === slot) ?? null;

  const recipesSorted = useMemo(
    () => [...state.mealRecipes].sort((a, b) => a.name.localeCompare(b.name)),
    [state.mealRecipes],
  );

  const allIngredients = useMemo(() => {
    const seen = new Map<string, { name: string; recipes: string[] }>();
    for (const r of state.mealRecipes) {
      const ings = state.mealRecipeIngredients.filter((i) => i.recipeId === r.id);
      for (const ing of ings) {
        const key = ing.name.trim().toLowerCase();
        if (!key) continue;
        const cur = seen.get(key);
        if (cur) {
          cur.recipes.push(r.name);
        } else {
          seen.set(key, { name: ing.name.trim(), recipes: [r.name] });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.mealRecipes, state.mealRecipeIngredients]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return recipesSorted;
    return recipesSorted.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.cuisine || "").toLowerCase().includes(q) ||
        state.mealRecipeIngredients
          .filter((i) => i.recipeId === r.id)
          .some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [recipesSorted, search, state.mealRecipeIngredients]);

  const filteredIngredients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allIngredients;
    return allIngredients.filter((i) => i.name.toLowerCase().includes(q));
  }, [allIngredients, search]);

  const viewingRecipe = viewingRecipeId
    ? state.mealRecipes.find((r) => r.id === viewingRecipeId) ?? null
    : null;
  const viewingRecipeIngredients = viewingRecipe
    ? state.mealRecipeIngredients
        .filter((i) => i.recipeId === viewingRecipe.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const editingRecipe = editingRecipeId
    ? state.mealRecipes.find((r) => r.id === editingRecipeId) ?? null
    : null;
  const editingRecipeIngredients = editingRecipe
    ? state.mealRecipeIngredients
        .filter((i) => i.recipeId === editingRecipe.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const goPrevWeek = () => setWeekStart((d) => addDays(d, -7));
  const goNextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goThisWeek = () => setWeekStart(startOfIsoWeek(new Date()));

  const weekEnd = addDays(weekStart, 6);
  const isCurrentWeek =
    toIsoDate(weekStart) === toIsoDate(startOfIsoWeek(new Date()));

  if (isLoading) {
    return <div className="app-container min-h-screen bg-cream page-content"><div className="px-5 pt-14 pb-6"><LoadingSkeleton rows={6} /></div><BottomNav /></div>;
  }

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <PageHeader
        title="Meals"
        subtitle="Plan, save, shop"
        backTo="/kitchen"
        backLabel="Kitchen"
        icon={
          <div className="w-12 h-12 rounded-2xl bg-[#FDA172]/15 flex items-center justify-center">
            <ChefHat size={24} className="text-[#FDA172]" />
          </div>
        }
        right={
          <button
            onClick={() => navigate("/groceries")}
            className="w-12 h-12 rounded-2xl bg-[#69D2A6]/15 flex items-center justify-center text-[#69D2A6] active:scale-90 transition"
            aria-label="Open groceries"
          >
            <ShoppingBasket size={20} />
          </button>
        }
      />

      {/* Tabs */}
      <div className="px-5 mb-4 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <div className="bg-white rounded-[1.5rem] p-1.5 flex border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
          <TabButton active={tab === "week"} onClick={() => setTab("week")}>
            <CalendarDays size={14} /> Week
          </TabButton>
          <TabButton
            active={tab === "recipes"}
            onClick={() => setTab("recipes")}
          >
            <BookOpen size={14} /> Recipes
          </TabButton>
          <TabButton
            active={tab === "ingredients"}
            onClick={() => setTab("ingredients")}
          >
            <ListChecks size={14} /> Pantry
          </TabButton>
        </div>
      </div>

      {/* Tab content */}
      {tab === "week" && (
        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <WeekHeader
            weekStart={weekStart}
            weekEnd={weekEnd}
            isCurrentWeek={isCurrentWeek}
            onPrev={goPrevWeek}
            onNext={goNextWeek}
            onThis={goThisWeek}
          />
          <div className="px-5 mt-3 space-y-2.5 mb-6">
            {DAY_LABELS.map((short, idx) => {
              const date = addDays(weekStart, idx);
              const isToday = toIsoDate(date) === toIsoDate(new Date());
              return (
                <DayCard
                  key={idx}
                  shortLabel={short}
                  longLabel={DAY_LONG[idx]}
                  date={date}
                  isToday={isToday}
                  lunch={findPlan(idx, "lunch")}
                  dinner={findPlan(idx, "dinner")}
                  onPick={(slot) =>
                    setSlotDialog({ open: true, day: idx, slot })
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {tab === "recipes" && (
        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="px-5 mb-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b7c6c2]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recipes, cuisine, ingredients…"
                className="w-full h-12 rounded-2xl pl-10 pr-4 bg-white border border-[#b7c6c2]/20 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
              />
            </div>
          </div>

          {filteredRecipes.length === 0 ? (
            <EmptyState
              icon={<Sparkles size={32} className="text-cantaloupe" />}
              title={
                recipesSorted.length === 0
                  ? "No recipes yet"
                  : "No recipes match your search"
              }
              subtitle={
                recipesSorted.length === 0
                  ? "Save the meals you master and like — add ingredients, write your secrets, and use them in the weekly plan."
                  : "Try a different keyword."
              }
            />
          ) : (
            <div className="px-5 space-y-3 mb-6">
              {filteredRecipes.map((r) => {
                const ings = state.mealRecipeIngredients.filter(
                  (i) => i.recipeId === r.id,
                );
                return (
                  <button
                    key={r.id}
                    onClick={() => setViewingRecipeId(r.id)}
                    className="w-full text-left bg-white rounded-[1.75rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] active:scale-[0.99] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-2xl shrink-0">
                        {r.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#171e19] truncate">
                          {r.name}
                        </p>
                        <p className="text-xs text-[#b7c6c2] font-medium">
                          {r.cuisine ? `${r.cuisine} · ` : ""}
                          {ings.length} ingredient
                          {ings.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRecipeId(r.id);
                        }}
                        className="w-9 h-9 rounded-full bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition flex items-center justify-center"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                    {r.notes && r.notes.replace(/<[^>]+>/g, "").trim() && (
                      <div className="mt-3 pt-3 border-t border-[#b7c6c2]/15 text-xs text-[#171e19]/70 line-clamp-2">
                        {stripHtml(r.notes).slice(0, 120)}
                        {stripHtml(r.notes).length > 120 ? "…" : ""}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="px-5 mb-6">
            <button
              onClick={() => {
                setEditingRecipeId(null);
                setRecipeDialogOpen(true);
              }}
              className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)] transition"
            >
              <div className="w-8 h-8 rounded-full bg-cantaloupe flex items-center justify-center">
                <Plus size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <span>Add new recipe</span>
            </button>
          </div>
        </div>
      )}

      {tab === "ingredients" && (
        <div className="animate-fade-in-up" style={{ animationDelay: "120ms" }}>
          <div className="px-5 mb-3">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b7c6c2]"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your pantry…"
                className="w-full h-12 rounded-2xl pl-10 pr-4 bg-white border border-[#b7c6c2]/20 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
              />
            </div>
          </div>

          {filteredIngredients.length === 0 ? (
            <EmptyState
              icon={<ListChecks size={32} className="text-cantaloupe" />}
              title={
                allIngredients.length === 0
                  ? "Pantry is empty"
                  : "No matches"
              }
              subtitle={
                allIngredients.length === 0
                  ? "Once you add ingredients to your recipes, they'll all be listed here for easy planning."
                  : "Try a different keyword."
              }
            />
          ) : (
            <div className="px-5 mb-6">
              <div className="bg-white rounded-[2rem] p-3 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
                <p className="px-2 py-1.5 text-[11px] font-bold text-[#b7c6c2] uppercase tracking-wider">
                  {filteredIngredients.length} ingredient
                  {filteredIngredients.length === 1 ? "" : "s"} across your
                  recipes
                </p>
                <div className="flex flex-wrap gap-1.5 p-2">
                  {filteredIngredients.map((i) => (
                    <PantryChip
                      key={i.name}
                      name={i.name}
                      usedInCount={i.recipes.length}
                      onEdit={() => setEditingIngredient(i)}
                      onDelete={() => setConfirmDeleteIngredient(i.name)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recipe viewer (bottom sheet) */}
      {viewingRecipe && (
        <RecipeViewSheet
          recipe={viewingRecipe}
          ingredients={viewingRecipeIngredients}
          onClose={() => setViewingRecipeId(null)}
          onEdit={() => {
            setEditingRecipeId(viewingRecipe.id);
            setViewingRecipeId(null);
          }}
          onPlanMeal={() => {
            // pick the next empty lunch slot this week, or the first slot
            const order: Array<{ d: number; s: MealSlot }> = [];
            for (let d = 0; d < 7; d++) {
              order.push({ d, s: "lunch" });
              order.push({ d, s: "dinner" });
            }
            const empty = order.find(
              ({ d, s }) => !findPlan(d, s),
            );
            if (empty) {
              setSlotDialog({ open: true, day: empty.d, slot: empty.s });
              setViewingRecipeId(null);
            } else {
              showError("This week is full — pick a slot manually");
              setTab("week");
              setViewingRecipeId(null);
            }
          }}
        />
      )}

      {/* Recipe create/edit dialog */}
      {recipeDialogOpen && (
        <RecipeEditorDialog
          open={recipeDialogOpen}
          onOpenChange={(o) => {
            setRecipeDialogOpen(o);
            if (!o) setEditingRecipeId(null);
          }}
          recipe={editingRecipe}
          initialIngredients={editingRecipeIngredients}
        />
      )}

      {/* Meal slot dialog */}
      {slotDialog && (
        <MealSlotDialog
          open={slotDialog.open}
          onOpenChange={(o) => {
            if (!o) setSlotDialog(null);
          }}
          weekStartDate={weekStartIso}
          dayOfWeek={slotDialog.day}
          slot={slotDialog.slot}
          existing={findPlan(slotDialog.day, slotDialog.slot)}
          onSaved={() => {
            showSuccess("Plan updated");
          }}
          dayLabel={DAY_LONG[slotDialog.day]}
          slotLabel={slotDialog.slot === "lunch" ? "Lunch" : "Dinner"}
        />
      )}

      {/* Edit ingredient sheet */}
      {editingIngredient && (
        <EditIngredientSheet
          name={editingIngredient.name}
          recipes={editingIngredient.recipes}
          onClose={() => setEditingIngredient(null)}
          onRename={async (newName) => {
            try {
              await renameIngredientEverywhere(
                editingIngredient.name,
                newName,
              );
              showSuccess(`Renamed to "${newName}"`);
            } catch (e) {
              showError("Couldn't rename ingredient");
              throw e;
            }
          }}
          onDelete={() => {
            const name = editingIngredient.name;
            setEditingIngredient(null);
            setConfirmDeleteIngredient(name);
          }}
        />
      )}

      {/* Delete ingredient confirm (from edit sheet) */}
      {confirmDeleteIngredient && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setConfirmDeleteIngredient(null)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="text-[#ca0013]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Remove "{confirmDeleteIngredient}"?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                It will be deleted from all your recipes and stop appearing in
                suggestions.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteIngredient(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const name = confirmDeleteIngredient;
                  setConfirmDeleteIngredient(null);
                  try {
                    await removeIngredientEverywhere(name);
                    showSuccess(`Removed "${name}"`);
                  } catch {
                    showError("Couldn't remove ingredient");
                  }
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-semibold transition-all active:scale-95",
        active
          ? "bg-[#171e19] text-white shadow-[0_4px_16px_-4px_rgba(0,0,0,0.2)]"
          : "text-[#b7c6c2] hover:text-[#171e19]",
      )}
    >
      {children}
    </button>
  );
}

function WeekHeader({
  weekStart,
  weekEnd,
  isCurrentWeek,
  onPrev,
  onNext,
  onThis,
}: {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  onPrev: () => void;
  onNext: () => void;
  onThis: () => void;
}) {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <div className="px-5 flex items-center justify-between">
      <button
        onClick={onPrev}
        className="w-10 h-10 rounded-full bg-white border border-[#b7c6c2]/20 flex items-center justify-center text-[#171e19] active:scale-90 transition"
        aria-label="Previous week"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={onThis}
        className="flex flex-col items-center"
      >
        <span className="text-[11px] font-bold text-[#b7c6c2] uppercase tracking-wider">
          {isCurrentWeek ? "This week" : "Week of"}
        </span>
        <span className="text-sm font-semibold text-[#171e19]">
          {fmt(weekStart)} – {fmt(weekEnd)}
        </span>
      </button>
      <button
        onClick={onNext}
        className="w-10 h-10 rounded-full bg-white border border-[#b7c6c2]/20 flex items-center justify-center text-[#171e19] active:scale-90 transition"
        aria-label="Next week"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

function DayCard({
  shortLabel,
  longLabel,
  date,
  isToday,
  lunch,
  dinner,
  onPick,
}: {
  shortLabel: string;
  longLabel: string;
  date: Date;
  isToday: boolean;
  lunch: MealPlanEntry | null;
  dinner: MealPlanEntry | null;
  onPick: (slot: MealSlot) => void;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-[1.75rem] p-3.5 border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition",
        isToday
          ? "border-cantaloupe/40 shadow-[0_6px_24px_-8px_rgba(253,161,114,0.3)]"
          : "border-[#b7c6c2]/20",
      )}
    >
      <div className="flex items-center gap-3 mb-2.5">
        <div
          className={cn(
            "w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0",
            isToday ? "bg-cantaloupe text-white" : "bg-[#eeebe3] text-[#171e19]",
          )}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
            {shortLabel}
          </span>
          <span className="text-base font-semibold leading-none">
            {date.getDate()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#171e19]">
            {longLabel}
            {isToday && (
              <span className="ml-2 text-[10px] font-bold text-cantaloupe uppercase tracking-wider">
                Today
              </span>
            )}
          </p>
          <p className="text-[11px] text-[#b7c6c2] font-medium">
            {date.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <SlotButton
          emoji="🥗"
          label="Lunch"
          entry={lunch}
          onClick={() => onPick("lunch")}
        />
        <SlotButton
          emoji="🍽️"
          label="Dinner"
          entry={dinner}
          onClick={() => onPick("dinner")}
        />
      </div>
    </div>
  );
}

function SlotButton({
  emoji,
  label,
  entry,
  onClick,
}: {
  emoji: string;
  label: string;
  entry: MealPlanEntry | null;
  onClick: () => void;
}) {
  const { state } = useApp();
  const recipe = entry?.recipeId
    ? state.mealRecipes.find((r) => r.id === entry.recipeId)
    : null;
  const displayName = recipe ? recipe.name : entry?.customName;

  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-[1.25rem] p-2.5 border transition active:scale-[0.98]",
        entry
          ? "bg-[#FFF1E6] border-cantaloupe/30 hover:bg-[#FFE4D0]"
          : "bg-[#eeebe3]/40 border-dashed border-[#b7c6c2]/30 hover:border-cantaloupe/50",
      )}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-sm">{emoji}</span>
        <span className="text-[10px] font-bold text-[#b7c6c2] uppercase tracking-wider">
          {label}
        </span>
      </div>
      {entry ? (
        <div className="flex items-center gap-1.5 min-w-0">
          {recipe && (
            <span className="text-sm shrink-0">{recipe.emoji}</span>
          )}
          <p className="text-xs font-semibold text-[#171e19] truncate">
            {displayName}
          </p>
        </div>
      ) : (
        <p className="text-xs font-medium text-[#b7c6c2] flex items-center gap-1">
          <Plus size={10} /> Add
        </p>
      )}
    </button>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="px-5 pt-8 pb-6 flex flex-col items-center text-center">
      <div className="w-24 h-24 rounded-full bg-[#FDA172]/10 flex items-center justify-center mb-5">
        {icon}
      </div>
      <h2 className="text-lg font-semibold text-[#171e19] mb-2">{title}</h2>
      <p className="text-sm text-[#b7c6c2] max-w-xs leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function RecipeViewSheet({
  recipe,
  ingredients,
  onClose,
  onEdit,
  onPlanMeal,
}: {
  recipe: { id: string; name: string; emoji: string; cuisine: string | null; notes: string };
  ingredients: { id: string; name: string; quantity: string | null }[];
  onClose: () => void;
  onEdit: () => void;
  onPlanMeal: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[92vh] flex flex-col shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
        </div>
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-2xl">
            {recipe.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[#171e19] truncate">
              {recipe.name}
            </h2>
            {recipe.cuisine && (
              <p className="text-xs text-[#b7c6c2] font-medium">
                {recipe.cuisine}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition text-lg"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {ingredients.length > 0 && (
            <div>
              <p className="section-header mb-2">Ingredients</p>
              <div className="bg-white rounded-[1.5rem] border border-[#b7c6c2]/20 divide-y divide-[#b7c6c2]/10 overflow-hidden">
                {ingredients.map((i) => (
                  <div
                    key={i.id}
                    className="flex items-center gap-2 px-4 py-2.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cantaloupe" />
                    <span className="text-sm text-[#171e19] flex-1">{i.name}</span>
                    {i.quantity && (
                      <span className="text-xs text-[#b7c6c2]">{i.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="section-header mb-2">Notes</p>
            <div className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20">
              <RichContentView html={recipe.notes} />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-[#b7c6c2]/20 bg-white flex gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="w-12 h-12 rounded-xl flex items-center justify-center text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 active:scale-95 transition"
            aria-label="Edit"
          >
            <Pencil size={18} />
          </button>
          <button
            onClick={onPlanMeal}
            className="flex-1 h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Plan this meal
          </button>
        </div>
      </div>
    </div>
  );
}

function PantryChip({
  name,
  usedInCount,
  onEdit,
  onDelete,
}: {
  name: string;
  usedInCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="group relative inline-flex items-center"
      title={
        usedInCount > 0
          ? `Used in ${usedInCount} recipe${usedInCount === 1 ? "" : "s"}`
          : ""
      }
    >
      <button
        onClick={onEdit}
        className={cn(
          "pl-3 pr-2 py-1.5 rounded-full bg-[#FFF1E6] text-[#171e19] text-xs font-medium",
          "flex items-center gap-1.5 transition active:scale-95",
          "hover:bg-[#FFE4D0] hover:shadow-[0_2px_10px_-4px_rgba(0,0,0,0.15)]",
        )}
      >
        <span>{name}</span>
        {usedInCount > 1 && (
          <span className="text-[10px] font-semibold text-cantaloupe">
            ×{usedInCount}
          </span>
        )}
      </button>
      <button
        onClick={onDelete}
        aria-label={`Delete ${name}`}
        className={cn(
          "absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full",
          "bg-white text-[#ca0013] border border-[#ca0013]/30",
          "flex items-center justify-center shadow-sm",
          "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
          "transition-opacity duration-150 active:scale-90 hover:bg-red-50",
        )}
      >
        <XIcon size={11} strokeWidth={3} />
      </button>
    </div>
  );
}

function EditIngredientSheet({
  name,
  recipes,
  onClose,
  onRename,
  onDelete,
}: {
  name: string;
  recipes: string[];
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [newName, setNewName] = useState(name);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.toLowerCase() === name.toLowerCase() || saving) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onRename(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-end justify-center">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
          </div>
          <div className="px-6 pt-2 pb-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] flex items-center justify-center">
              <Tag size={20} className="text-cantaloupe" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="section-header">Ingredient</p>
              <h2 className="text-lg font-semibold text-[#171e19] tracking-tight truncate">
                {name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
              aria-label="Close"
            >
              <XIcon size={18} />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Rename everywhere</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                autoFocus
                placeholder="New name"
                className="w-full h-12 rounded-2xl px-4 bg-white border border-[#b7c6c2]/20 text-base text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
              />
              <p className="text-[11px] text-[#b7c6c2] font-medium mt-1.5">
                Updates this name in every recipe that uses it.
              </p>
            </div>

            {recipes.length > 0 && (
              <div>
                <p className="section-header block mb-2">
                  Used in {recipes.length} recipe{recipes.length === 1 ? "" : "s"}
                </p>
                <div className="bg-white rounded-[1.5rem] border border-[#b7c6c2]/20 divide-y divide-[#b7c6c2]/10 overflow-hidden max-h-48 overflow-y-auto">
                  {recipes.map((r) => (
                    <div
                      key={r}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[#171e19]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cantaloupe" />
                      <span className="truncate">{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-[#b7c6c2]/20 bg-white flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-12 h-12 rounded-xl flex items-center justify-center text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 active:scale-95 transition"
              aria-label="Delete"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 active:scale-[0.98] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={
                saving ||
                !newName.trim() ||
                newName.trim().toLowerCase() === name.toLowerCase()
              }
              className="flex-1 h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setConfirmDelete(false)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="text-[#ca0013]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Remove "{name}"?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                It will be deleted from all your recipes and stop appearing in
                suggestions.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MealsPage;
