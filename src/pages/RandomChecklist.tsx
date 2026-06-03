import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  Star,
  X,
  Shuffle,
  Archive,
  ChevronRight,
  PartyPopper,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChecklistItem } from "@/lib/store";

function RandomChecklistPage() {
  const {
    state,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
    awardPoints,
  } = useApp();

  const navigate = useNavigate();

  // Random items (kind === 'random', not archived)
  const randomItems = useMemo(
    () => state.checklistItems.filter((i) => i.kind === "random" && !i.archived),
    [state.checklistItems],
  );

  const completed = randomItems.filter((i) => i.completed).length;
  const total = randomItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newPoints, setNewPoints] = useState("3");

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Archive confirmation
  const [archiveItemId, setArchiveItemId] = useState<string | null>(null);
  const [archiveAllConfirm, setArchiveAllConfirm] = useState(false);

  // Animated success trigger
  const [successAnimation, setSuccessAnimation] = useState<{
    points: number;
    key: number;
  } | null>(null);

  const triggerSuccess = (points: number) => {
    setSuccessAnimation({ points, key: Date.now() });
    setTimeout(() => setSuccessAnimation(null), 1800);
  };

  const handleCreate = () => {
    const pts = Number(newPoints);
    if (!newLabel.trim() || !Number.isFinite(pts) || pts < 0) return;
    addChecklistItem({
      label: newLabel.trim(),
      points: Math.floor(pts),
      kind: "random",
      deadline: null,
      flagId: null,
      autoCompleteOnSubtasks: false,
    });
    setNewLabel("");
    setNewPoints("3");
    setShowDialog(false);
  };

  const handleToggle = (id: string) => {
    const item = randomItems.find((i) => i.id === id);
    if (!item) return;
    if (!item.completed) {
      toggleChecklistItem(id, state.users[0]?.id);
      if (state.users[0]) {
        awardPoints(state.users[0].id, item.points, `Completed: ${item.label}`);
      }
      triggerSuccess(item.points);
    } else {
      toggleChecklistItem(id);
    }
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setEditLabel(item.label);
    setEditPoints(String(item.points));
    setShowDeleteConfirm(false);
  };

  const closeEdit = () => {
    setEditingItem(null);
    setShowDeleteConfirm(false);
  };

  const handleEditSave = () => {
    if (!editingItem) return;
    const pts = Number(editPoints);
    if (!editLabel.trim() || !Number.isFinite(pts) || pts < 0) return;
    updateChecklistItem(editingItem.id, {
      label: editLabel.trim(),
      points: Math.floor(pts),
    });
    closeEdit();
  };

  // Delete → archive
  const handleArchiveItem = async () => {
    if (!editingItem) return;
    await updateChecklistItem(editingItem.id, { archived: true });
    setShowDeleteConfirm(false);
    setEditingItem(null);
  };

  // Complete all → archive
  const handleArchiveAllCompleted = async () => {
    const completedItems = randomItems.filter((i) => i.completed);
    for (const item of completedItems) {
      await updateChecklistItem(item.id, { archived: true });
    }
    setArchiveAllConfirm(false);
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate("/checklists")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> Back
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1.25rem] bg-pink-50 flex items-center justify-center">
              <Shuffle className="text-[#F472B6]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
                Random Checklists
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
                Quick everyday quest lists
              </p>
            </div>
          </div>
          {total > 0 && (
            <div className="w-14 h-14 rounded-full bg-pink-50 flex items-center justify-center">
              <span className="text-lg font-semibold text-[#F472B6]">{pct}%</span>
            </div>
          )}
        </div>
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5 mb-3">
        {randomItems.map((item, index) => {
          const completedBy = item.completedBy
            ? state.users.find((u) => u.id === item.completedBy)
            : null;
          return (
            <div
              key={item.id}
              className={`relative flex items-center gap-3 rounded-[1.5rem] p-4 border transition-all duration-300 active:scale-[0.99] ${
                item.completed
                  ? "bg-pink-50/30 border-pink-200/30"
                  : "bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
              } hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)]`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => handleToggle(item.id)}
                aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
                className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                  item.completed
                    ? "bg-[#F472B6] border-[#F472B6] text-white"
                    : "border-[#b7c6c2]/30 text-transparent hover:border-[#F472B6] hover:bg-pink-50"
                }`}
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium block truncate transition-colors ${
                    item.completed
                      ? "text-[#b7c6c2] line-through"
                      : "text-[#171e19]"
                  }`}
                >
                  {item.label}
                </span>
                {completedBy && (
                  <span className="text-xs font-medium text-[#F472B6] flex items-center gap-1 mt-0.5">
                    {completedBy.emoji} {completedBy.name}
                  </span>
                )}
              </div>
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#F472B6] bg-pink-50 px-2 py-0.5 rounded-full">
                <Star size={10} /> {item.points}
              </span>
              <button
                onClick={() => openEdit(item)}
                aria-label="Edit this task"
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#F472B6] hover:bg-pink-50 transition-all active:scale-90"
              >
                <Pencil size={14} />
              </button>
            </div>
          );
        })}
        {randomItems.length === 0 && (
          <div className="text-center py-8 text-[#b7c6c2] text-sm">
            No quests yet — tap <strong>Add new quest</strong> below to create one
          </div>
        )}
      </div>

      {/* Add quest button */}
      <div className="px-5 mb-3">
        <button
          onClick={() => setShowDialog(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-[#F472B6] flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>Add new quest</span>
        </button>
      </div>

      {/* Archive completed button */}
      {completed > 0 && (
        <div className="px-5 mb-3">
          <button
            onClick={() => setArchiveAllConfirm(true)}
            className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-3.5 bg-white border border-[#b7c6c2]/20 text-[#171e19] font-semibold hover:bg-[#eeebe3] transition-all active:scale-[0.98]"
          >
            <Archive size={16} className="text-[#b7c6c2]" />
            <span>Archive completed ({completed})</span>
          </button>
        </div>
      )}

      {/* Add quest dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              New Random Quest
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Quest Name</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Walk the dog"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <label className="section-header block mb-2">Points</label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={newPoints}
                onChange={(e) => setNewPoints(e.target.value)}
                placeholder="3"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={
                !newLabel.trim() ||
                newPoints === "" ||
                !Number.isFinite(Number(newPoints)) ||
                Number(newPoints) < 0
              }
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
            >
              Add Quest
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit quest dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              Edit Quest
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="section-header block mb-2">Quest Name</label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Walk the dog"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                  onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                />
              </div>
              <div>
                <label className="section-header block mb-2">Points</label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={editPoints}
                  onChange={(e) => setEditPoints(e.target.value)}
                  placeholder="3"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                  onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={handleEditSave}
                  disabled={
                    !editLabel.trim() ||
                    editPoints === "" ||
                    !Number.isFinite(Number(editPoints)) ||
                    Number(editPoints) < 0
                  }
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation → moves to archive */}
      {showDeleteConfirm && editingItem && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#eeebe3] flex items-center justify-center mb-3">
                <Archive className="text-[#171e19]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Move to Archive?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{editingItem.label}" will be moved to the Archive section, where you can delete it permanently or reuse it.
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
                onClick={handleArchiveItem}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Move to Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive all completed confirmation */}
      {archiveAllConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setArchiveAllConfirm(false)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#eeebe3] flex items-center justify-center mb-3">
                <Archive className="text-[#171e19]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Archive completed quests?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                {completed} completed quest{completed > 1 ? "s" : ""} will be moved to the Archive section, where you can delete or reuse them.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setArchiveAllConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveAllCompleted}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Move to Archive
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated success */}
      {successAnimation && (
        <div
          key={successAnimation.key}
          className="fixed inset-x-0 top-[40%] z-[70] flex justify-center pointer-events-none"
        >
          <div className="animate-points-burst bg-gradient-to-br from-[#F472B6] to-[#ec4899] text-white pl-3 pr-5 py-2.5 rounded-full text-lg font-extrabold shadow-2xl flex items-center gap-2 border-2 border-white/30">
            <PartyPopper size={20} className="text-white" />
            +{successAnimation.points} pts!
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default RandomChecklistPage;