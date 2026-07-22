// Groceries hub: live "main" shopping list + named custom lists.
import { useMemo, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  ShoppingBasket,
  Plus,
  Trash2,
  X,
  Check,
  Sparkles,
  ChevronRight,
  Edit3,
  Archive,
  Eraser,
  Search,
  ListChecks,
} from "lucide-react";
import { useApp } from "@/lib/store";
import type { GroceryList, GroceryListItem, GroceryMainItem } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { showError, showSuccess, showUndo } from "@/utils/toast";
import { hapticToggle } from "@/lib/haptics";

const EMOJI_OPTIONS = [
  "🛒", "🎉", "🎂", "🍖", "🥩", "🥖", "🍷", "🍺", "🥂",
  "🥳", "🎄", "🎁", "🏖️", "🏕️", "🍴", "☕", "🧀", "🥕",
];

function GroceriesPage() {
  const {
    state,
    isLoading,
    addGroceryMainItem,
    updateGroceryMainItem,
    removeGroceryMainItem,
    clearGroceryMain,
    addGroceryList,
    updateGroceryList,
    removeGroceryList,
    addGroceryListItem,
    updateGroceryListItem,
    removeGroceryListItem,
    fetchIngredientSuggestions,
  } = useApp();

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListEmoji, setNewListEmoji] = useState("🛒");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [openList, setOpenList] = useState<GroceryList | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteList, setConfirmDeleteList] = useState(false);

  // ── Main list derived data ──
  const mainUnchecked = state.groceryMainItems.filter((i) => !i.checked);
  const mainChecked = state.groceryMainItems.filter((i) => i.checked);

  // ── Smart suggestions for the main list input ──
  const mainNamesLower = useMemo(
    () => new Set(state.groceryMainItems.map((i) => i.name.toLowerCase())),
    [state.groceryMainItems],
  );
  const [mainSuggestions, setMainSuggestions] = useState<
    { name: string; useCount: number }[]
  >([]);
  const [showMainSuggest, setShowMainSuggest] = useState(false);
  const filteredMainSuggestions = mainSuggestions
    .filter((s) => !mainNamesLower.has(s.name.toLowerCase()))
    .slice(0, 5);

  // ── Custom list dialog state ──
  const [listItemName, setListItemName] = useState("");
  const [listItemQty, setListItemQty] = useState("");
  const [listSuggestions, setListSuggestions] = useState<
    { name: string; useCount: number }[]
  >([]);
  const [showListSuggest, setShowListSuggest] = useState(false);
  const listUnchecked = openList
    ? state.groceryListItems.filter(
        (i) => i.listId === openList.id && !i.checked,
      )
    : [];
  const listChecked = openList
    ? state.groceryListItems.filter(
        (i) => i.listId === openList.id && i.checked,
      )
    : [];
  const listNamesLower = useMemo(
    () =>
      new Set(
        state.groceryListItems
          .filter((i) => openList && i.listId === openList.id)
          .map((i) => i.name.toLowerCase()),
      ),
    [state.groceryListItems, openList],
  );
  const filteredListSuggestions = listSuggestions
    .filter((s) => !listNamesLower.has(s.name.toLowerCase()))
    .slice(0, 5);

  if (isLoading) {
    return <div className="app-container min-h-screen bg-cream page-content"><div className="px-5 pt-14 pb-6"><LoadingSkeleton rows={5} /></div><BottomNav /></div>;
  }

  const handleAddMain = async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) return;
    if (
      state.groceryMainItems.some(
        (i) => i.name.toLowerCase() === trimmed.toLowerCase() && !i.checked,
      )
    ) {
      setNewItemName("");
      return;
    }
    await addGroceryMainItem({
      name: trimmed,
      quantity: newItemQty.trim() || undefined,
    });
    setNewItemName("");
    setNewItemQty("");
    setMainSuggestions([]);
  };

  const handleAddListItem = async () => {
    if (!openList) return;
    const trimmed = listItemName.trim();
    if (!trimmed) return;
    await addGroceryListItem({
      listId: openList.id,
      name: trimmed,
      quantity: listItemQty.trim() || undefined,
    });
    setListItemName("");
    setListItemQty("");
    setListSuggestions([]);
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    const created = await addGroceryList({
      name: newListName.trim(),
      emoji: newListEmoji,
    });
    setNewListName("");
    setNewListEmoji("🛒");
    setShowEmojiPicker(false);
    setCreatingList(false);
    setOpenList(created);
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <PageHeader
        title="Groceries"
        subtitle={
          mainUnchecked.length === 0
            ? "Shopping list is clear"
            : `${mainUnchecked.length} to buy`
        }
        backTo="/kitchen"
        backLabel="Kitchen"
        icon={
          <div className="w-12 h-12 rounded-2xl bg-[#69D2A6]/15 flex items-center justify-center">
            <ShoppingBasket size={24} className="text-[#69D2A6]" />
          </div>
        }
        right={
          state.groceryMainItems.length > 0 ? (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs font-semibold text-[#ca0013] bg-red-50 hover:bg-red-100 px-3 py-2 rounded-full active:scale-95 transition flex items-center gap-1"
            >
              <Eraser size={12} /> Clear
            </button>
          ) : undefined
        }
      />

      {/* Main list — add item */}
      <div className="px-5 mb-3 animate-fade-in-up" style={{ animationDelay: "60ms" }}>
        <SmartAddBar
          name={newItemName}
          qty={newItemQty}
          onName={async (v) => {
            setNewItemName(v);
            if (v.trim()) {
              const s = await fetchIngredientSuggestions(v.trim());
              setMainSuggestions(s);
              setShowMainSuggest(true);
            } else {
              setMainSuggestions([]);
              setShowMainSuggest(false);
            }
          }}
          onQty={setNewItemQty}
          onSubmit={handleAddMain}
          suggestions={filteredMainSuggestions}
          showSuggestions={showMainSuggest}
          onPickSuggestion={(name) => {
            setNewItemName(name);
            setShowMainSuggest(false);
          }}
          onBlur={() => setTimeout(() => setShowMainSuggest(false), 150)}
          placeholder="Add to shopping list…"
        />
      </div>

      {/* Main list — items */}
      <div className="px-5 mb-6 animate-fade-in-up" style={{ animationDelay: "120ms" }}>
        {state.groceryMainItems.length === 0 ? (
          <MainEmptyState />
        ) : (
          <MainList
            unchecked={mainUnchecked}
            checked={mainChecked}
            onToggle={async (item, next) => {
              await hapticToggle();
              await updateGroceryMainItem(item.id, { checked: next });
            }}
            onRemove={async (item) => {
              try {
                await removeGroceryMainItem(item.id);
                showUndo("Item removed", async () => {
                  try { await addGroceryMainItem({ name: item.name, quantity: item.quantity ?? undefined }); showSuccess("Item restored"); }
                  catch { showError("Couldn't restore the item."); }
                });
              } catch { showError("Couldn't remove the item."); }
            }}
          />
        )}
      </div>

      {/* Other lists */}
      <div
        className="px-5 mb-3 animate-fade-in-up"
        style={{ animationDelay: "180ms" }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="section-header">Other lists</p>
          <button
            onClick={() => setCreatingList(true)}
            className="text-xs font-semibold text-cantaloupe hover:underline flex items-center gap-1"
          >
            <Plus size={12} /> New list
          </button>
        </div>
        {state.groceryLists.length === 0 ? (
          <button
            onClick={() => setCreatingList(true)}
            className="w-full flex items-center gap-3 rounded-[1.5rem] p-4 bg-white border border-dashed border-[#b7c6c2]/40 hover:border-cantaloupe/60 hover:bg-[#FFF1E6]/30 active:scale-[0.99] transition text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-[#FFF1E6] flex items-center justify-center text-xl">
              <Sparkles size={18} className="text-cantaloupe" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#171e19]">
                Create a custom list
              </p>
              <p className="text-xs text-[#b7c6c2] font-medium">
                For an event, trip, or party
              </p>
            </div>
            <Plus size={18} className="text-[#b7c6c2]" />
          </button>
        ) : (
          <div className="space-y-2">
            {state.groceryLists.map((l) => {
              const items = state.groceryListItems.filter(
                (i) => i.listId === l.id,
              );
              const remaining = items.filter((i) => !i.checked).length;
              return (
                <button
                  key={l.id}
                  onClick={() => setOpenList(l)}
                  className="w-full flex items-center gap-3 rounded-[1.5rem] p-4 bg-white border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] active:scale-[0.99] transition text-left"
                >
                  <div className="w-11 h-11 rounded-2xl bg-[#eeebe3] flex items-center justify-center text-xl shrink-0">
                    {l.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#171e19] truncate">
                      {l.name}
                    </p>
                    <p className="text-xs text-[#b7c6c2] font-medium">
                      {items.length === 0
                        ? "Empty"
                        : `${remaining} of ${items.length} to go`}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#b7c6c2]" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hint card */}
      <div className="px-5 mb-6">
        <div className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#69D2A6]/15 flex items-center justify-center shrink-0">
            <Sparkles size={16} className="text-[#69D2A6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171e19]">
              How the main list stays smart
            </p>
            <p className="text-xs text-[#b7c6c2] font-medium leading-snug mt-1">
              When you plan a meal, its ingredients land here. Check them off
              as you shop — at the end, clear the list and start fresh.
            </p>
          </div>
        </div>
      </div>

      {/* Create custom list dialog */}
      <Dialog open={creatingList} onOpenChange={setCreatingList}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              New custom list
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker((v) => !v)}
                  className="w-12 h-12 rounded-2xl bg-[#eeebe3] flex items-center justify-center text-2xl active:scale-95 transition"
                >
                  {newListEmoji}
                </button>
                {showEmojiPicker && (
                  <div className="absolute z-40 mt-1 left-0 bg-white rounded-2xl shadow-xl border border-[#b7c6c2]/30 p-2 grid grid-cols-6 gap-1 w-[240px]">
                    {EMOJI_OPTIONS.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setNewListEmoji(e);
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
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                placeholder="e.g. Birthday party"
                className="flex-1 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                autoFocus
              />
            </div>
            <button
              onClick={handleCreateList}
              disabled={!newListName.trim()}
              className="w-full h-12 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
            >
              Create list
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom list detail sheet */}
      {openList && (
        <CustomListSheet
          list={openList}
          items={state.groceryListItems.filter(
            (i) => i.listId === openList.id,
          )}
          unchecked={listUnchecked}
          checked={listChecked}
          newItemName={listItemName}
          newItemQty={listItemQty}
          onName={async (v) => {
            setListItemName(v);
            if (v.trim()) {
              const s = await fetchIngredientSuggestions(v.trim());
              setListSuggestions(s);
              setShowListSuggest(true);
            } else {
              setListSuggestions([]);
              setShowListSuggest(false);
            }
          }}
          onQty={setListItemQty}
          onSubmit={handleAddListItem}
          suggestions={filteredListSuggestions}
          showSuggestions={showListSuggest}
          onPickSuggestion={(name) => {
            setListItemName(name);
            setShowListSuggest(false);
          }}
          onClose={() => setOpenList(null)}
          onToggle={async (item, next) => {
            await hapticToggle();
            await updateGroceryListItem(item.id, { checked: next });
          }}
          onRemove={async (item) => {
            try {
              await removeGroceryListItem(item.id);
              showUndo("Item removed", async () => {
                try { await addGroceryListItem({ listId: openList.id, name: item.name, quantity: item.quantity ?? undefined }); showSuccess("Item restored"); }
                catch { showError("Couldn't restore the item."); }
              });
            } catch { showError("Couldn't remove the item."); }
          }}
          onRename={(name) => updateGroceryList(openList.id, { name })}
          onChangeEmoji={(emoji) => updateGroceryList(openList.id, { emoji })}
          onDelete={() => setConfirmDeleteList(true)}
        />
      )}

      {/* Clear main confirmation */}
      {confirmClear && (
        <ConfirmModal
          title="Clear main list?"
          subtitle="This removes every item from your main shopping list. Custom lists won't be affected."
          confirmLabel="Clear list"
          onConfirm={async () => {
            await clearGroceryMain();
            setConfirmClear(false);
          }}
          onCancel={() => setConfirmClear(false)}
        />
      )}

      {/* Delete list confirmation */}
      {confirmDeleteList && openList && (
        <ConfirmModal
          title="Delete this list?"
          subtitle={`"${openList.name}" and all its items will be permanently removed.`}
          confirmLabel="Delete list"
          onConfirm={async () => {
            const id = openList.id;
            const snapshot = { ...openList, items: state.groceryListItems.filter((item) => item.listId === id) };
            setOpenList(null);
            setConfirmDeleteList(false);
            try {
              await removeGroceryList(id);
              showUndo("List deleted", async () => {
                try {
                  const restored = await addGroceryList({ name: snapshot.name, emoji: snapshot.emoji });
                  for (const item of snapshot.items) await addGroceryListItem({ listId: restored.id, name: item.name, quantity: item.quantity ?? undefined });
                  showSuccess("List restored");
                } catch { showError("Couldn't restore the list."); }
              });
            } catch { showError("Couldn't delete the list."); }
          }}
          onCancel={() => setConfirmDeleteList(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}

function MainEmptyState() {
  return (
    <div className="bg-white rounded-[2rem] p-8 border border-[#b7c6c2]/20 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="w-16 h-16 mx-auto rounded-full bg-[#69D2A6]/10 flex items-center justify-center mb-3">
        <ListChecks size={28} className="text-[#69D2A6]" />
      </div>
      <p className="text-sm font-semibold text-[#171e19]">Your list is empty</p>
      <p className="text-xs text-[#b7c6c2] font-medium mt-1 max-w-[240px] mx-auto">
        Add items above, or plan a meal — ingredients show up here automatically.
      </p>
    </div>
  );
}

function MainList({
  unchecked,
  checked,
  onToggle,
  onRemove,
}: {
  unchecked: GroceryMainItem[];
  checked: GroceryMainItem[];
  onToggle: (item: GroceryMainItem, next: boolean) => void;
  onRemove: (item: GroceryMainItem) => void;
}) {
  return (
    <div className="space-y-2">
      {unchecked.map((item) => (
        <GroceryRow
          key={item.id}
          item={item}
          onToggle={onToggle}
          onRemove={onRemove}
        />
      ))}
      {checked.length > 0 && (
        <details className="mt-2">
          <summary className="text-xs font-semibold text-[#b7c6c2] uppercase tracking-wider cursor-pointer px-1 py-2 hover:text-[#171e19]">
            Already in basket ({checked.length})
          </summary>
          <div className="space-y-2 mt-1">
            {checked.map((item) => (
              <GroceryRow
                key={item.id}
                item={item}
                onToggle={onToggle}
                onRemove={onRemove}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function GroceryRow({
  item,
  onToggle,
  onRemove,
}: {
  item: GroceryMainItem | GroceryListItem;
  onToggle: (item: GroceryMainItem | GroceryListItem, next: boolean) => void;
  onRemove: (item: GroceryMainItem | GroceryListItem) => void;
}) {
  return (
    <div
      className={cn(
        "group flex items-center gap-3 rounded-[1.25rem] p-3 border transition",
        item.checked
          ? "bg-[#69D2A6]/10 border-[#69D2A6]/20"
          : "bg-white border-[#b7c6c2]/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]",
      )}
    >
      <button
        onClick={() => onToggle(item, !item.checked)}
        className={cn(
          "shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition active:scale-90",
          item.checked
            ? "bg-[#69D2A6] border-[#69D2A6] text-white"
            : "border-[#b7c6c2]/40 text-transparent hover:border-[#69D2A6]",
        )}
        aria-label={item.checked ? "Uncheck" : "Check"}
      >
        <Check size={14} strokeWidth={3} />
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium",
            item.checked ? "text-[#b7c6c2] line-through" : "text-[#171e19]",
          )}
        >
          {item.name}
        </p>
        {item.quantity && (
          <p className="text-[11px] text-[#b7c6c2] font-medium">
            {item.quantity}
          </p>
        )}
      </div>
      <button
        onClick={() => onRemove(item)}
        className="w-11 h-11 rounded-full flex items-center justify-center text-muted-ink hover:text-[#ca0013] hover:bg-red-50 active:scale-90 transition"
        aria-label="Remove"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function SmartAddBar({
  name,
  qty,
  onName,
  onQty,
  onSubmit,
  suggestions,
  showSuggestions,
  onPickSuggestion,
  onBlur,
  placeholder,
}: {
  name: string;
  qty: string;
  onName: (v: string) => void;
  onQty: (v: string) => void;
  onSubmit: () => void;
  suggestions: { name: string; useCount: number }[];
  showSuggestions: boolean;
  onPickSuggestion: (name: string) => void;
  onBlur?: () => void;
  placeholder: string;
}) {
  return (
    <div className="bg-white rounded-[1.5rem] p-3 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          onFocus={() => name && onPickSuggestion(name)}
          onBlur={onBlur}
          placeholder={placeholder}
          className="flex-1 h-11 rounded-xl px-3 bg-[#eeebe3]/50 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:bg-[#eeebe3] focus:ring-1 focus:ring-cantaloupe transition"
        />
        <input
          value={qty}
          onChange={(e) => onQty(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="qty"
          className="w-16 h-11 rounded-xl px-3 bg-[#eeebe3]/50 text-sm text-[#171e19] placeholder:text-[#b7c6c2] focus:outline-none focus:bg-[#eeebe3] focus:ring-1 focus:ring-cantaloupe transition"
        />
        <button
          onClick={onSubmit}
          disabled={!name.trim()}
          className="w-11 h-11 rounded-xl bg-[#69D2A6] text-white flex items-center justify-center active:scale-90 transition disabled:bg-[#eeebe3] disabled:text-[#b7c6c2]"
          aria-label="Add"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 animate-fade-in-up">
          <span className="text-[10px] font-bold text-[#b7c6c2] uppercase tracking-wider self-center mr-1">
            From your pantry
          </span>
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onPickSuggestion(s.name);
              }}
              className="px-2.5 py-1 rounded-full bg-[#eeebe3] text-[#171e19] text-xs font-medium hover:bg-[#69D2A6]/15 hover:text-[#69D2A6] active:scale-95 transition flex items-center gap-1"
            >
              {s.name}
              {s.useCount > 1 && (
                <span className="text-[10px] font-semibold opacity-60">
                  ×{s.useCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CustomListSheet({
  list,
  items,
  unchecked,
  checked,
  newItemName,
  newItemQty,
  onName,
  onQty,
  onSubmit,
  suggestions,
  showSuggestions,
  onPickSuggestion,
  onClose,
  onToggle,
  onRemove,
  onRename,
  onChangeEmoji,
  onDelete,
}: {
  list: GroceryList;
  items: GroceryListItem[];
  unchecked: GroceryListItem[];
  checked: GroceryListItem[];
  newItemName: string;
  newItemQty: string;
  onName: (v: string) => void | Promise<void>;
  onQty: (v: string) => void;
  onSubmit: () => void;
  suggestions: { name: string; useCount: number }[];
  showSuggestions: boolean;
  onPickSuggestion: (name: string) => void;
  onClose: () => void;
  onToggle: (item: GroceryListItem, next: boolean) => void;
  onRemove: (item: GroceryListItem) => void;
  onRename: (name: string) => void;
  onChangeEmoji: (emoji: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const [showEmoji, setShowEmoji] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[92vh] flex flex-col shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
        </div>
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="w-12 h-12 rounded-2xl bg-[#eeebe3] flex items-center justify-center text-2xl active:scale-95 transition"
            >
              {list.emoji}
            </button>
            {showEmoji && (
              <div className="absolute z-40 mt-1 left-0 bg-white rounded-2xl shadow-xl border border-[#b7c6c2]/30 p-2 grid grid-cols-6 gap-1 w-[240px]">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onChangeEmoji(e);
                      setShowEmoji(false);
                    }}
                    className="w-9 h-9 rounded-xl text-xl flex items-center justify-center hover:bg-[#FFF1E6] active:scale-90 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onRename(editName.trim() || list.name);
                    setEditing(false);
                  } else if (e.key === "Escape") {
                    setEditName(list.name);
                    setEditing(false);
                  }
                }}
                onBlur={() => {
                  onRename(editName.trim() || list.name);
                  setEditing(false);
                }}
                autoFocus
                className="w-full text-lg font-semibold text-[#171e19] bg-white border border-[#b7c6c2]/30 rounded-lg px-2 py-1 focus:outline-none focus:border-cantaloupe focus:ring-1 focus:ring-cantaloupe"
              />
            ) : (
              <button
                onClick={() => {
                  setEditName(list.name);
                  setEditing(true);
                }}
                className="text-left w-full group"
              >
                <h2 className="text-lg font-semibold text-[#171e19] truncate group-hover:text-cantaloupe transition">
                  {list.name}
                </h2>
                <p className="text-xs text-[#b7c6c2] font-medium flex items-center gap-1">
                  <Edit3 size={10} /> Tap to rename
                </p>
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-4">
          <SmartAddBar
            name={newItemName}
            qty={newItemQty}
            onName={onName}
            onQty={onQty}
            onSubmit={onSubmit}
            suggestions={suggestions}
            showSuggestions={showSuggestions}
            onPickSuggestion={onPickSuggestion}
            placeholder="Add to this list…"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
          {items.length === 0 && (
            <div className="text-center py-6 text-sm text-[#b7c6c2]">
              No items yet — add your first one above.
            </div>
          )}
          {unchecked.map((item) => (
            <GroceryRow
              key={item.id}
              item={item}
              onToggle={onToggle}
              onRemove={onRemove}
            />
          ))}
          {checked.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs font-semibold text-[#b7c6c2] uppercase tracking-wider cursor-pointer px-1 py-2 hover:text-[#171e19]">
                Done ({checked.length})
              </summary>
              <div className="space-y-2 mt-1">
                {checked.map((item) => (
                  <GroceryRow
                    key={item.id}
                    item={item}
                    onToggle={onToggle}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </details>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#b7c6c2]/20 bg-white flex gap-2 shrink-0">
          <button
            onClick={onDelete}
            className="w-12 h-11 rounded-xl flex items-center justify-center text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 active:scale-95 transition"
            aria-label="Delete list"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 active:scale-[0.98] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({
  title,
  subtitle,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  subtitle: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Archive className="text-[#ca0013]" size={28} />
          </div>
          <h3 className="text-lg font-semibold text-[#171e19]">{title}</h3>
          <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default GroceriesPage;
