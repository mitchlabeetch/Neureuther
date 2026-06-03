import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Check, Plus, Trash2, Circle, X, CalendarDays, User, LayoutGrid, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

function ChecklistPage() {
  const {
    state,
    toggleChecklistItem,
    addChecklistItem,
    removeChecklistItem,
    awardPoints,
    getUserById,
  } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [activePicker, setActivePicker] = useState<string | null>(null);
  const navigate = useNavigate();

  const completed = state.checklistItems.filter((i) => i.completed).length;
  const total = state.checklistItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

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
        toggleChecklistItem(id, user.id);
        awardPoints(user.id, 5, `Completed: ${item.label}`);
      }
    } else {
      toggleChecklistItem(id);
    }
  };

  const handleUserPick = (itemId: string, userId: string) => {
    toggleChecklistItem(itemId, userId);
    const item = state.checklistItems.find((i) => i.id === itemId);
    if (item) {
      awardPoints(userId, 5, `Completed: ${item.label}`);
    }
    setActivePicker(null);
  };

  const handleCreate = () => {
    if (!newLabel.trim()) return;
    addChecklistItem({ label: newLabel.trim(), completed: false });
    setNewLabel('');
    setShowDialog(false);
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
      <div className="px-5 space-y-2.5 mb-5">
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
              <button
                onClick={() => removeChecklistItem(item.id)}
                aria-label="Remove this task"
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}

        {/* Add button */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-[1.5rem] p-4 bg-white/60 border-2 border-dashed border-[#b7c6c2]/30 text-[#b7c6c2] hover:text-cantaloupe hover:border-cantaloupe transition-all duration-300 active:scale-[0.99]">
              <div className="w-9 h-9 rounded-full bg-[#eeebe3] flex items-center justify-center">
                <Plus size={18} />
              </div>
              <span className="text-sm font-medium">Add new task</span>
            </button>
          </DialogTrigger>
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
              <button
                onClick={handleCreate}
                disabled={!newLabel.trim()}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Add Task
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User picker modal */}
      {activePicker && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setActivePicker(null)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 animate-slide-up"
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
              {state.users.map((u) => (
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
                    +5 pts
                  </span>
                </button>
              ))}
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
