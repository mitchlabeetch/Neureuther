// Create / edit dialog for a saved meal recipe.
// Lets the user enter name, emoji, cuisine, rich notes, and a list of
// ingredients with quantities.
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";
import type { MealRecipe, MealRecipeIngredient } from "@/lib/store";
import { RichTextEditor } from "./RichTextEditor";
import { IngredientInput, type IngredientRow } from "./IngredientInput";
import { showSuccess, showError, showUndo } from "@/utils/toast";

interface RecipeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: MealRecipe | null;
  initialIngredients?: MealRecipeIngredient[];
}

const EMOJI_OPTIONS = [
  "🍽️",
  "🍝",
  "🍕",
  "🥗",
  "🍲",
  "🍜",
  "🥘",
  "🌮",
  "🍱",
  "🥙",
  "🍳",
  "🥞",
  "🍔",
  "🌯",
  "🥪",
  "🍣",
  "🍛",
  "🍤",
  "🥩",
  "🍗",
];

export function RecipeEditorDialog({
  open,
  onOpenChange,
  recipe,
  initialIngredients,
}: RecipeEditorDialogProps) {
  const { addMealRecipe, updateMealRecipe, removeMealRecipe, fetchIngredientSuggestions } =
    useApp();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [cuisine, setCuisine] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<IngredientRow[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const seededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      seededKeyRef.current = null;
      return;
    }
    // Seed the form only once per open session. Without this guard, the store's
    // background refetch (every 60s / on tab focus) changes the identity of
    // `recipe`/`initialIngredients` and would wipe the user's in-progress edits.
    const key = recipe?.id ?? "__new__";
    if (seededKeyRef.current === key) return;
    seededKeyRef.current = key;
    if (recipe) {
      setName(recipe.name);
      setEmoji(recipe.emoji || "🍽️");
      setCuisine(recipe.cuisine || "");
      setNotes(recipe.notes || "");
      setRows(
        (initialIngredients ?? [])
          .filter((i) => i.name.trim())
          .map((i) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity || "",
          })),
      );
    } else {
      setName("");
      setEmoji("🍽️");
      setCuisine("");
      setNotes("");
      setRows([{ id: crypto.randomUUID(), name: "", quantity: "" }]);
    }
    setShowEmojiPicker(false);
    setShowDeleteConfirm(false);
  }, [open, recipe, initialIngredients]);

  const validRows = rows.filter((r) => r.name.trim().length > 0);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        emoji,
        cuisine: cuisine.trim() || null,
        notes: notes.trim(),
        ingredients: validRows.map((r) => ({
          name: r.name.trim(),
          quantity: r.quantity.trim() || undefined,
        })),
      };
      if (recipe) {
        await updateMealRecipe(recipe.id, payload);
        showSuccess("Recipe saved");
      } else {
        await addMealRecipe(payload);
        showSuccess("Recipe added");
      }
      onOpenChange(false);
    } catch {
      showError("Couldn't save the recipe. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe) return;
    const snapshot = {
      name: recipe.name,
      emoji: recipe.emoji,
      notes: recipe.notes,
      cuisine: recipe.cuisine,
      ingredients: (initialIngredients ?? []).map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity ?? undefined,
      })),
    };
    try {
      await removeMealRecipe(recipe.id);
      showUndo("Recipe deleted", async () => {
        try {
          await addMealRecipe(snapshot);
          showSuccess("Recipe restored");
        } catch {
          showError("Couldn't restore the recipe.");
        }
      });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch {
      showError("Couldn't delete the recipe. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[92vh] overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {recipe ? "Edit recipe" : "New recipe"}
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4 overflow-y-auto flex-1">
            {/* Name + emoji row */}
            <div className="flex gap-2 items-start">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-2xl shrink-0 active:scale-95 transition"
                >
                  {emoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute z-40 mt-1 left-0 bg-white rounded-2xl shadow-xl border border-[#b7c6c2]/30 p-2 grid grid-cols-5 gap-1 w-[220px]">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => {
                          setEmoji(e);
                          setShowEmojiPicker(false);
                        }}
                        className="w-9 h-9 rounded-xl text-xl flex items-center justify-center hover:bg-[#FFF1E6] active:scale-90 transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Recipe name (e.g. Pasta Bolognese)"
                className="flex-1 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>

            <div>
              <label className="section-header block mb-2">Cuisine (optional)</label>
              <Input
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g. Italian, Thai, Mexican…"
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>

            <div>
              <label className="section-header block mb-2">Ingredients</label>
              <IngredientInput
                rows={rows}
                onChange={setRows}
                fetchSuggestions={fetchIngredientSuggestions}
              />
            </div>

            <div>
              <label className="section-header block mb-2">Notes & method</label>
              <RichTextEditor
                value={notes}
                onChange={setNotes}
                placeholder="Write the steps, the secrets, the things to remember…"
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-[#b7c6c2]/20 bg-white flex gap-2 shrink-0">
            {recipe && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 active:scale-95 transition"
                aria-label="Delete recipe"
              >
                <Trash2 size={18} />
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 active:scale-[0.98] transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex-1 h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
            >
              {saving ? "Saving…" : recipe ? "Save" : "Add recipe"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {showDeleteConfirm && recipe && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="text-[#ca0013]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Delete recipe?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{recipe.name}" will be removed from your recipes. It will also be removed from any meal plan slots that reference it.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
