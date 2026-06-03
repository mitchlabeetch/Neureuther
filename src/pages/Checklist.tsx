import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Check, Plus, Trash2, Pencil, Star, X, CalendarDays, User, LayoutGrid, ChevronRight, PartyPopper } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import type { ChecklistItem } from '@/lib/store';

function ChecklistPage() {
  const {
    state,
    toggleChecklistItem,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    awardPoints,
    getUserById,
  } = useApp();

  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPoints, setNewPoints] = useState('5');
  const [activePicker, setActivePicker] = useState<string | null>(null);

  // Edit dialog state
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Animated success trigger
  const [successAnimation, setSuccessAnimation] = useState<{
    points: number;
    key: number;
  } | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navigate = useNavigate();

  const completed = state.checklistItems.filter((i) => i.completed).length;
  const total = state.checklistItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const triggerSuccess = (points: number) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setSuccessAnimation({ points, key: Date.now() });
    successTimeoutRef.current = setTimeout(() => setSuccessAnimation(null), 1800);
  };

  const completeItem = (itemId: string, userId: string) => {
    const item = state.checklistItems.find((i) => i.id === itemId);
    if (!item) return;
    toggleChecklistItem(itemId, userId);
    awardPoints(userId, item.points, `Completed: ${item.label}`);
    triggerSuccess(item.points);
  };

  const handleToggle = (id: string) => {
    const item = state.checklistItems.find((i) => i.id === id);
    if (!item) return;
    if (!item.completed) {
      if (state.users.length > 1) {
        setActivePicker(id);
        return;
      }
      const user = state.users[0];
      if (user) {
        completeItem(id, user.id);
      }
    } else {
      toggleChecklistItem(id);
    }
  };

  const handleUserPick = (itemId: string, userId: string) => {
    completeItem(itemId, userId);
    setActivePicker(null);
  };

  const handleCreate = () => {
    const pts = Number(newPoints);
    if (!newLabel.trim() || !Number.isFinite(pts) || pts < 0) return;
    addChecklistItem({
      label: newLabel.trim(),
      points: Math.floor(pts),
      kind: "daily",
      deadline: null,
      flagId: null,
      autoCompleteOnSubtasks: false,
    });
    setNewLabel('');
    setNewPoints('5');
    setShowDialog(false);
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

  const handleDeleteConfirm = () => {
    if (!editingItem) return;
    removeChecklistItem(editingItem.id);
    setShowDeleteConfirm(false);
    setEditingItem(null);
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">
              Daily Checklist
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-1">
              {completed} / {total} tasks done
            </p>
          </div>
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <span className="text-2xl font-semibold text-green-500">{pct}%</span>
          </div>
        </div>
        <Progress
          value={pct}
          className="h-3 rounded-full bg-[#FFF1E6] mt-3 [&>div]:bg-green-400 [&>div]:rounded-full"
        />
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5 mb-3">
        {state.checklistItems.map((item, index) => {
          const completedBy = item.completedBy
            ? getUserById(item.completedBy)
            : null;
          return (
            <div
              key={item.id}
              className={`relative flex items-center gap-3 rounded-[1.5rem] p-4 border transition-all duration-300 active:scale-[0.99] ${
                item.completed
                  ? 'bg-green-50/50 border-green-200/50'
                  : 'bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]'
              } hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)]`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              <button
                onClick={() => handleToggle(item.id)}
                aria-label={item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                className={`shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300 active:scale-90 ${
                  item.completed
                    ? 'bg-green-400 border-green-400 text-white'
                    : 'border-[#b7c6c2]/30 text-transparent hover:border-cantaloupe hover:bg-[#FFF1E6]'
                }`}
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium block truncate transition-colors ${
                    item.completed
                      ? 'text-[#b7c6c2] line-through'
                      : 'text-[#171e19]'
                  }`}
                >
                  {item.label}
                </span>
                {completedBy && (
                  <span className="text-xs font-medium text-green-500 flex items-center gap-1 mt-0.5">
                    {completedBy.emoji} {completedBy.name}
                  </span>
                )}
              </div>
              <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#FDA172] bg-[#FFF1E6] px-2 py-0.5 rounded-full">
                <Star size={10} /> {item.points}
              </span>
              <button
                onClick={() => openEdit(item)}
                aria-label="Edit this task"
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6] transition-all active:scale-90"
              >
                <Pencil size={14} />
              </button>
            </div>
          );
        })}
        {state.checklistItems.length === 0 && (
          <div className="text-center py-8 text-[#b7c6c2] text-sm">
            No tasks yet — tap <strong>Add new task</strong> below to create one
          </div>
        )}
      </div>

      {/* Add task button — below the list, prominent and intuitive */}
      <div className="px-5 mb-5">
        <button
          onClick={() => setShowDialog(true)}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-cantaloupe flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>Add new task</span>
        </button>
      </div>

      {/* Add task dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              New Daily Task
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Task Name</label>
              <Input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Water the plants"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
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
                placeholder="5"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={
                !newLabel.trim() ||
                newPoints === '' ||
                !Number.isFinite(Number(newPoints)) ||
                Number(newPoints) < 0
              }
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
            >
              Add Task
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit task dialog */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => {
          if (!open) closeEdit();
        }}
      >
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              Edit Task
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="section-header block mb-2">Task Name</label>
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="e.g. Water the plants"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
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
                  placeholder="5"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                  onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
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
                    editPoints === '' ||
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

      {/* Delete confirmation */}
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
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="text-[#ca0013]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Delete this task?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{editingItem.label}" will be removed permanently. This can't be undone.
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
                onClick={handleDeleteConfirm}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animated success trigger */}
      {successAnimation && (
        <div
          key={successAnimation.key}
          className="fixed inset-x-0 top-[40%] z-[70] flex justify-center pointer-events-none"
        >
          <div className="animate-points-burst bg-gradient-to-br from-[#69D2A6] to-[#5BCA9B] text-white pl-3 pr-5 py-2.5 rounded-full text-lg font-extrabold shadow-2xl flex items-center gap-2 border-2 border-white/30">
            <PartyPopper size={20} className="text-white" />
            +{successAnimation.points} pts!
          </div>
        </div>
      )}

      {/* User picker modal */}
      {activePicker && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setActivePicker(null)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] px-6 pt-6 pb-32 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-[#171e19]">Who did it?</h3>
              <button
                onClick={() => setActivePicker(null)}
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] hover:bg-[#b7c6c2]/30 transition-all active:scale-90"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {state.users.map((u) => {
                const pickerItem = state.checklistItems.find(
                  (i) => i.id === activePicker
                );
                const points = pickerItem?.points ?? 5;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleUserPick(activePicker, u.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-[1.5rem] border border-[#b7c6c2]/20 bg-white hover:bg-[#FFF1E6] hover:border-cantaloupe/30 transition-all duration-300 active:scale-[0.98] group"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm"
                      style={{ backgroundColor: u.color + '30' }}
                    >
                      {u.emoji}
                    </div>
                    <span className="text-base font-medium text-[#171e19]">
                      {u.name}
                    </span>
                    <span className="ml-auto text-sm font-medium text-cantaloupe bg-[#FFF1E6] px-2.5 py-1 rounded-full group-hover:bg-cantaloupe group-hover:text-white transition-all">
                      +{points} pts
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Reset info */}
      <div className="px-5 mb-4">
        <div className="bg-[#FFF1E6] rounded-[1.5rem] p-4 text-center border border-[#b7c6c2]/20">
          <p className="text-xs font-medium text-cantaloupe">
            🔄 Checklist resets every day at midnight
          </p>
        </div>
      </div>

      {/* Checklist navigation */}
      <div className="px-5 mb-16">
        <div className="space-y-2.5">
          <button
            onClick={() => navigate("/checklist/long-term")}
            className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#69D2A6]/15 flex items-center justify-center shrink-0">
              <CalendarDays className="text-[#69D2A6]" size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-[#171e19]">Long-term checklist</div>
              <div className="text-xs text-[#b7c6c2] mt-0.5">Goals and recurring tasks</div>
            </div>
            <ChevronRight size={16} className="text-[#b7c6c2]" />
          </button>

          <button
            onClick={() => navigate("/checklist/personal")}
            className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/15 flex items-center justify-center shrink-0">
              <User className="text-[#A78BFA]" size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-[#171e19]">Personal checklist</div>
              <div className="text-xs text-[#b7c6c2] mt-0.5">My own private tasks</div>
            </div>
            <ChevronRight size={16} className="text-[#b7c6c2]" />
          </button>

          <button
            onClick={() => navigate("/checklists")}
            className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] flex items-center justify-center shrink-0">
              <LayoutGrid className="text-cantaloupe" size={20} />
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium text-[#171e19]">See all checklists</div>
              <div className="text-xs text-[#b7c6c2] mt-0.5">Browse every checklist</div>
            </div>
            <ChevronRight size={16} className="text-[#b7c6c2]" />
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default ChecklistPage;
