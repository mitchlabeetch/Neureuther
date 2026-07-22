// Dialog used to assign a meal to a calendar slot (lunch or dinner).
// Three modes:
//   - "pick":   choose a saved recipe or a custom entry
//   - "custom": write a one-off name
//   - "check":  "untick what you already have" UX for recipe ingredients
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Search, Plus, Check, Sparkles, BookOpen, Edit3 } from "lucide-react";
import { useApp } from "@/lib/store";
import type {
  MealPlanEntry,
  MealRecipe,
  MealRecipeIngredient,
  MealSlot,
} from "@/lib/store";
import { RecipeEditorDialog } from "./RecipeEditorDialog";
import { cn } from "@/lib/utils";

interface MealSlotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekStartDate: string;
  dayOfWeek: number;
  slot: MealSlot;
  existing: MealPlanEntry | null;
  onSaved: () => void;
  dayLabel: string;
  slotLabel: string;
}

const SLOT_EMOJI: Record<MealSlot, string> = {
  lunch: "🥗",
  dinner: "🍽️",
};

type Mode = "pick" | "custom" | "check" | "view";

export function MealSlotDialog({
  open,
  onOpenChange,
  weekStartDate,
  dayOfWeek,
  slot,
  existing,
  onSaved,
  dayLabel,
  slotLabel,
}: MealSlotDialogProps) {
  const {
    state,
    addMealPlanEntry,
    updateMealPlanEntry,
    removeMealPlanEntry,
  } = useApp();

  const [mode, setMode] = useState<Mode>(existing ? "view" : "pick");
  const [search, setSearch] = useState("");
  const [customName, setCustomName] = useState("");
  const [pickedRecipe, setPickedRecipe] = useState<MealRecipe | null>(null);
  const [checkedIngs, setCheckedIngs] = useState<Record<string, boolean>>({});
  const [editingRecipe, setEditingRecipe] = useState<MealRecipe | null>(null);
  const [editingIngs, setEditingIngs] = useState<MealRecipeIngredient[]>([]);

  const seededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededKeyRef.current = null;
      return;
    }
    // Seed only once per open session so a background store refetch doesn't
    // reset the user's selection or typed custom name mid-edit.
    const key = existing?.id ?? "__new__";
    if (seededKeyRef.current === key) return;
    seededKeyRef.current = key;
    setSearch("");
    if (existing) {
      if (existing.recipeId) {
        const r = state.mealRecipes.find((x) => x.id === existing.recipeId);
        if (r) {
          setPickedRecipe(r);
          setMode("view");
        } else {
          setPickedRecipe(null);
          setMode("view");
        }
      } else {
        setCustomName(existing.customName || "");
        setMode("view");
      }
    } else {
      setPickedRecipe(null);
      setCustomName("");
      setMode("pick");
    }
    setCheckedIngs({});
  }, [open, existing, state.mealRecipes]);

  const ingredients = useMemo<MealRecipeIngredient[]>(() => {
    if (!pickedRecipe) return [];
    return state.mealRecipeIngredients
      .filter((i) => i.recipeId === pickedRecipe.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [pickedRecipe, state.mealRecipeIngredients]);

  useEffect(() => {
    setCheckedIngs({});
  }, [pickedRecipe?.id]);

  const filteredRecipes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return state.mealRecipes;
    return state.mealRecipes.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.cuisine || "").toLowerCase().includes(q) ||
        state.mealRecipeIngredients
          .filter((i) => i.recipeId === r.id)
          .some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [state.mealRecipes, state.mealRecipeIngredients, search]);

  const close = () => onOpenChange(false);

  const handlePickRecipe = (recipe: MealRecipe) => {
    setPickedRecipe(recipe);
    setMode("check");
  };

  const handleConfirmRecipe = async () => {
    if (!pickedRecipe) return;
    // Anything still checked is considered "needed" — already-unticked items
    // are considered already on hand, so they won't be added to the grocery list.
    if (existing) {
      await updateMealPlanEntry(existing.id, {
        recipeId: pickedRecipe.id,
        customName: null,
      });
    } else {
      await addMealPlanEntry({
        weekStartDate,
        dayOfWeek,
        slot,
        recipeId: pickedRecipe.id,
      });
    }
    onSaved();
    close();
  };

  const handleSaveCustom = async () => {
    if (!customName.trim()) return;
    if (existing) {
      await updateMealPlanEntry(existing.id, {
        recipeId: null,
        customName: customName.trim(),
      });
    } else {
      await addMealPlanEntry({
        weekStartDate,
        dayOfWeek,
        slot,
        customName: customName.trim(),
      });
    }
    onSaved();
    close();
  };

  const handleRemove = async () => {
    if (!existing) return;
    await removeMealPlanEntry(existing.id);
    onSaved();
    close();
  };

  const totalChecked = Object.values(checkedIngs).filter(Boolean).length;

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[60] flex items-end justify-center transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={close}
        />
        <div
          className={cn(
            "relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[88vh] flex flex-col shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] transition-transform duration-300",
            open ? "translate-y-0" : "translate-y-full",
          )}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
          </div>

          {/* Header */}
          <div className="px-6 pt-2 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-xl">
                {SLOT_EMOJI[slot]}
              </div>
              <div>
                <p className="section-header">{dayLabel}</p>
                <h2 className="text-lg font-semibold text-[#171e19] tracking-tight">
                  {slotLabel}
                </h2>
              </div>
            </div>
            <button
              onClick={close}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {mode === "view" && existing && (
              <ViewMode
                existing={existing}
                recipe={pickedRecipe}
                ingredients={ingredients}
                onEditRecipe={() => {
                  if (pickedRecipe) {
                    setEditingRecipe(pickedRecipe);
                    setEditingIngs(ingredients);
                  }
                }}
                onChange={() => setMode("pick")}
                onRemove={handleRemove}
              />
            )}

            {mode === "pick" && (
              <PickMode
                search={search}
                setSearch={setSearch}
                recipes={filteredRecipes}
                ingredients={state.mealRecipeIngredients}
                onPick={handlePickRecipe}
                onCustom={() => setMode("custom")}
              />
            )}

            {mode === "custom" && (
              <CustomMode
                value={customName}
                onChange={setCustomName}
                onSave={handleSaveCustom}
                onBack={() => setMode("pick")}
              />
            )}

            {mode === "check" && pickedRecipe && (
              <CheckMode
                recipe={pickedRecipe}
                ingredients={ingredients}
                checked={checkedIngs}
                setChecked={setCheckedIngs}
                totalChecked={totalChecked}
                onConfirm={handleConfirmRecipe}
                onBack={() => setMode("pick")}
              />
            )}
          </div>
        </div>
      </div>

      {editingRecipe && (
        <RecipeEditorDialog
          open={!!editingRecipe}
          onOpenChange={(o) => {
            if (!o) {
              setEditingRecipe(null);
              setEditingIngs([]);
            }
          }}
          recipe={editingRecipe}
          initialIngredients={editingIngs}
        />
      )}
    </>
  );
}

function ViewMode({
  existing,
  recipe,
  ingredients,
  onEditRecipe,
  onChange,
  onRemove,
}: {
  existing: MealPlanEntry;
  recipe: MealRecipe | null;
  ingredients: MealRecipeIngredient[];
  onEditRecipe: () => void;
  onChange: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-[1.5rem] p-5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-2xl">
            {recipe ? recipe.emoji : "✏️"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-[#171e19] truncate">
              {recipe ? recipe.name : existing.customName}
            </h3>
            {recipe?.cuisine && (
              <p className="text-xs text-[#b7c6c2] font-medium">{recipe.cuisine}</p>
            )}
          </div>
        </div>
        {recipe && ingredients.length > 0 && (
          <div>
            <p className="section-header mb-1.5">Ingredients</p>
            <ul className="text-sm text-[#171e19] space-y-1">
              {ingredients.map((i) => (
                <li key={i.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cantaloupe" />
                  <span>
                    {i.name}
                    {i.quantity && (
                      <span className="text-[#b7c6c2] text-xs ml-1">
                        ({i.quantity})
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {recipe && (
          <button
            onClick={onEditRecipe}
            className="flex-1 h-12 rounded-xl font-semibold text-[#171e19] bg-white border border-[#b7c6c2]/30 hover:bg-[#eeebe3] active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Edit3 size={16} /> Edit recipe
          </button>
        )}
        <button
          onClick={onChange}
          className="flex-1 h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] active:scale-[0.98] transition"
        >
          Change
        </button>
      </div>
      <button
        onClick={onRemove}
        className="w-full h-11 rounded-xl text-sm font-semibold text-[#ca0013] bg-red-50 hover:bg-red-100 active:scale-[0.98] transition"
      >
        Remove from plan
      </button>
    </div>
  );
}

function PickMode({
  search,
  setSearch,
  recipes,
  ingredients,
  onPick,
  onCustom,
}: {
  search: string;
  setSearch: (s: string) => void;
  recipes: MealRecipe[];
  ingredients: MealRecipeIngredient[];
  onPick: (r: MealRecipe) => void;
  onCustom: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b7c6c2]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search your recipes or ingredients…"
          className="w-full h-12 rounded-2xl pl-10 pr-4 bg-white border border-[#b7c6c2]/20 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
        />
      </div>

      <button
        onClick={onCustom}
        className="w-full flex items-center gap-3 rounded-[1.5rem] p-4 bg-white border border-dashed border-[#b7c6c2]/40 hover:border-cantaloupe hover:bg-[#FFF1E6]/40 active:scale-[0.99] transition"
      >
        <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] flex items-center justify-center">
          <Edit3 size={18} className="text-cantaloupe" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold text-[#171e19]">Custom meal</p>
          <p className="text-xs text-[#b7c6c2] font-medium">
            A one-off — like "Pizza delivery"
          </p>
        </div>
        <Plus size={18} className="text-[#b7c6c2]" />
      </button>

      <div>
        <p className="section-header mb-2">Your recipes</p>
        {recipes.length === 0 && (
          <div className="text-center py-6 text-sm text-[#b7c6c2]">
            No recipes yet. Tap "Custom meal" above or add a recipe from the
            Recipes tab.
          </div>
        )}
        <div className="space-y-2">
          {recipes.map((r) => {
            const ings = ingredients.filter((i) => i.recipeId === r.id);
            return (
              <button
                key={r.id}
                onClick={() => onPick(r)}
                className="w-full flex items-center gap-3 rounded-[1.5rem] p-3.5 bg-white border border-[#b7c6c2]/20 hover:border-cantaloupe/40 active:scale-[0.99] transition text-left"
              >
                <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-xl shrink-0">
                  {r.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#171e19] truncate">
                    {r.name}
                  </p>
                  <p className="text-xs text-[#b7c6c2] font-medium">
                    {r.cuisine ? `${r.cuisine} · ` : ""}
                    {ings.length} ingredient{ings.length === 1 ? "" : "s"}
                  </p>
                </div>
                <Check size={16} className="text-[#b7c6c2]" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CustomMode({
  value,
  onChange,
  onSave,
  onBack,
}: {
  value: string;
  onChange: (s: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm font-semibold text-cantaloupe hover:underline"
      >
        ← Back
      </button>
      <div>
        <label className="section-header block mb-2">Meal name</label>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (value.trim()) onSave();
            }
          }}
          placeholder="e.g. Sushi takeout"
          className="w-full h-12 rounded-2xl px-4 bg-white border border-[#b7c6c2]/20 text-base text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
        />
        <p className="text-xs text-[#b7c6c2] mt-2 font-medium">
          Custom meals don't add anything to the grocery list.
        </p>
      </div>
      <button
        onClick={onSave}
        disabled={!value.trim()}
        className="w-full h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
      >
        Save to plan
      </button>
    </div>
  );
}

function CheckMode({
  recipe,
  ingredients,
  checked,
  setChecked,
  totalChecked,
  onConfirm,
  onBack,
}: {
  recipe: MealRecipe;
  ingredients: MealRecipeIngredient[];
  checked: Record<string, boolean>;
  setChecked: (next: Record<string, boolean>) => void;
  totalChecked: number;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={onBack}
          className="text-sm font-semibold text-cantaloupe hover:underline mb-2"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-2xl">
            {recipe.emoji}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#171e19]">{recipe.name}</h3>
            <p className="text-xs text-[#b7c6c2] font-medium">
              {ingredients.length} ingredients
            </p>
          </div>
        </div>
      </div>

      {ingredients.length === 0 ? (
        <div className="bg-white rounded-[1.5rem] p-5 border border-[#b7c6c2]/20 text-center">
          <p className="text-sm text-[#b7c6c2]">No ingredients listed for this recipe.</p>
        </div>
      ) : (
        <>
          <div className="bg-[#FFF1E6] rounded-2xl p-3.5 border border-cantaloupe/20">
            <p className="text-xs font-semibold text-cantaloupe flex items-center gap-1.5">
              <Sparkles size={14} /> Untick the items you already have
            </p>
            <p className="text-[11px] text-[#171e19]/70 mt-0.5">
              Whatever stays checked will be added to your main grocery list.
            </p>
          </div>

          <div className="bg-white rounded-[1.5rem] border border-[#b7c6c2]/20 divide-y divide-[#b7c6c2]/10 overflow-hidden">
            {ingredients.map((ing) => {
              const isChecked = !!checked[ing.id];
              return (
                <label
                  key={ing.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#FFF1E6]/30 active:scale-[0.99] transition"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setChecked({ ...checked, [ing.id]: !isChecked })
                    }
                    className={cn(
                      "shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition active:scale-90",
                      isChecked
                        ? "bg-cantaloupe border-cantaloupe text-white"
                        : "border-[#b7c6c2]/40 text-transparent",
                    )}
                    aria-label={isChecked ? "Untick" : "Tick"}
                  >
                    <Check size={14} strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        isChecked ? "text-[#171e19]" : "text-[#b7c6c2] line-through",
                      )}
                    >
                      {ing.name}
                    </p>
                    {ing.quantity && (
                      <p className="text-[11px] text-[#b7c6c2] font-medium">
                        {ing.quantity}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}

      <button
        onClick={onConfirm}
        className="w-full h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] active:scale-[0.98] transition flex items-center justify-center gap-2"
      >
        <BookOpen size={16} />
        Save & add {totalChecked} to grocery list
      </button>
    </div>
  );
}
