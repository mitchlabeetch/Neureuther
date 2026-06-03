import { useState } from 'react';
import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Check, Plus, Trash2, GripVertical, X, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function ChecklistPage() {
  const {
    state, toggleChecklistItem, addChecklistItem, removeChecklistItem,
    updateChecklistItem, getUserById, awardPoints,
  } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [activePicker, setActivePicker] = useState<string | null>(null);

  const completed = state.checklistItems.filter(i => i.completed).length;
  const total = state.checklistItems.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggle = (id: string) => {
    const item = state.checklistItems.find(i => i.id === id);
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
    const item = state.checklistItems.find(i => i.id === itemId);
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
      <div className="px-5 pt-14 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#2D2B2A]">Daily Checklist</h1>
            <p className="text-sm text-gray-400 font-semibold mt-1">{completed}/{total} tasks done</p>
          </div>
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
            <span className="text-2xl font-extrabold text-green-500">{pct}%</span>
          </div>
        </div>
        <Progress
          value={pct}
          className="h-3 rounded-full bg-orange-100 mt-3 [&>div]:bg-green-400 [&>div]:rounded-full"
        />
      </div>

      {/* List */}
      <div className="px-5 space-y-2 mb-4">
        {state.checklistItems.map(item => {
          const completedBy = item.completedBy ? getUserById(item.completedBy) : null;
          return (
            <div
              key={item.id}
              className={`relative flex items-center gap-3 rounded-2xl p-4 border transition-all active:scale-[0.99] ${
                item.completed
                  ? 'bg-green-50/50 border-green-200'
                  : 'bg-white border-orange-100 shadow-sm'
              }`}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleToggle(item.id)}
                    className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                      item.completed
                        ? 'bg-green-400 border-green-400 text-white'
                        : 'border-gray-300 text-transparent hover:border-cantaloupe'
                    }`}
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                  {item.completed ? 'Mark as incomplete' : 'Mark as complete'}
                </TooltipContent>
              </Tooltip>
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-extrabold block truncate ${
                  item.completed ? 'text-gray-400 line-through' : 'text-[#2D2B2A]'
                }`}>
                  {item.label}
                </span>
                {completedBy && (
                  <span className="text-xs font-semibold text-green-500 flex items-center gap-1 mt-0.5">
                    {completedBy.emoji} {completedBy.name}
                  </span>
                )}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => removeChecklistItem(item.id)}
                    className="p-2 rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                  Remove this task
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}

        {/* Add button */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <button className="w-full flex items-center gap-3 rounded-2xl p-4 bg-white/50 border-2 border-dashed border-orange-200 text-gray-400 hover:text-cantaloupe hover:border-cantaloupe transition-all active:scale-[0.99]">
              <Plus size={20} />
              <span className="text-sm font-extrabold">Add new task</span>
            </button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl max-w-[380px] mx-auto p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-3">
              <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">New Daily Task</DialogTitle>
            </DialogHeader>
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task Name</label>
                <Input
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="e.g. Water the plants"
                  className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={!newLabel.trim()}
                className="w-full py-3 rounded-xl font-extrabold text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 disabled:text-gray-500 transition-all active:scale-[0.98]"
              >
                Add Task
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* User picker modal */}
      {activePicker && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setActivePicker(null)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-extrabold text-[#2D2B2A]">Who did it?</h3>
              <button onClick={() => setActivePicker(null)} className="p-2 rounded-full hover:bg-gray-100">
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="space-y-2">
              {state.users.map(u => (
                <button
                  key={u.id}
                  onClick={() => handleUserPick(activePicker, u.id)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl border border-orange-100 bg-white hover:bg-orange-50 transition-all active:scale-[0.98]"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: u.color + '30' }}
                  >
                    {u.emoji}
                  </div>
                  <span className="text-base font-extrabold text-[#2D2B2A]">{u.name}</span>
                  <span className="ml-auto text-sm font-bold text-cantaloupe">+5 pts</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset info */}
      <div className="px-5 mb-16">
        <div className="bg-cantaloupe-lighter rounded-2xl p-4 text-center">
          <p className="text-xs font-semibold text-cantaloupe">🔄 Checklist resets every day at midnight</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

export default ChecklistPage;
