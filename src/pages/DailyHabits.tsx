import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  X,
  Trash2,
  ChevronRight,
  Trophy,
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface TaskFormState {
  label: string;
}

const EMPTY_TASK_FORM: TaskFormState = { label: "" };

export default function DailyHabitsPage() {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  const {
    state,
    addPersonalChecklist,
    addPersonalChecklistTask,
    updatePersonalChecklistTask,
    removePersonalChecklistTask,
    awardPoints,
    getUserPoints,
  } = useApp();

  const user = state.users.find((u) => u.id === userId);

  // Find the daily_habit checklist for this user, or auto-create one
  const dailyHabitChecklist = useMemo(
    () =>
      state.personalChecklists.find(
        (c) => c.userId === userId && c.kind === "daily_habit" && !c.archived,
      ),
    [state.personalChecklists, userId],
  );

  const [creating, setCreating] = useState(false);

  // Auto-create the checklist if it doesn't exist
  useEffect(() => {
    if (!userId || dailyHabitChecklist || creating) return;
    // Only create if data has loaded
    if (state.users.length === 0) return;
    setCreating(true);
    addPersonalChecklist({
      userId,
      kind: "daily_habit",
      name: "My daily habits",
      bgColor: "#ffffff",
      flagId: null,
      deadline: null,
    }).finally(() => setCreating(false));
  }, [userId, dailyHabitChecklist, creating, state.users.length, addPersonalChecklist]);

  const checklistId = dailyHabitChecklist?.id;

  const tasks = useMemo(
    () =>
      checklistId
        ? state.personalChecklistTasks
            .filter((t) => t.checklistId === checklistId)
            .sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              return a.sortOrder - b.sortOrder;
            })
        : [],
    [state.personalChecklistTasks, checklistId],
  );

  const openTasks = tasks.filter((t) => !t.completed);
  const doneTasks = tasks.filter((t) => t.completed);
  const allDone = tasks.length > 0 && openTasks.length === 0;

  // ── Daily reward tracking ──
  const [rewardAwarded, setRewardAwarded] = useState(false);

  useEffect(() => {
    if (!userId || !allDone) return;
    // Check if already awarded today
    const today = new Date().toISOString().slice(0, 10);
    const alreadyAwardedToday = state.pointsLog.some(
      (log) =>
        log.userId === userId &&
        log.reason === "Daily habits completed" &&
        log.timestamp.slice(0, 10) === today,
    );
    if (alreadyAwardedToday) {
      setRewardAwarded(true);
    }
  }, [userId, allDone, state.pointsLog]);

  const handleClaimReward = useCallback(async () => {
    if (!userId || rewardAwarded) return;
    await awardPoints(userId, 10, "Daily habits completed");
    setRewardAwarded(true);
  }, [userId, rewardAwarded, awardPoints]);

  // ── Task create / edit dialog ──
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<
    (typeof tasks)[number] | null
  >(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);

  // ── Inline new task ──
  const [newTaskLabel, setNewTaskLabel] = useState("");

  const openCreateTask = useCallback(() => {
    setEditingTask(null);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskDialog(true);
  }, []);

  const openEditTask = useCallback(
    (task: (typeof tasks)[number]) => {
      setEditingTask(task);
      setTaskForm({ label: task.label });
      setShowTaskDeleteConfirm(false);
      setShowTaskDialog(true);
    },
    [],
  );

  const closeTaskDialog = useCallback(() => {
    setShowTaskDialog(false);
    setEditingTask(null);
    setShowTaskDeleteConfirm(false);
  }, []);

  const handleTaskSubmit = useCallback(async () => {
    if (!taskForm.label.trim() || !checklistId) return;

    if (editingTask) {
      await updatePersonalChecklistTask(editingTask.id, {
        label: taskForm.label.trim(),
      });
    } else {
      await addPersonalChecklistTask({
        checklistId,
        label: taskForm.label.trim(),
        deadline: null,
      });
    }
    closeTaskDialog();
  }, [
    taskForm,
    checklistId,
    editingTask,
    addPersonalChecklistTask,
    updatePersonalChecklistTask,
    closeTaskDialog,
  ]);

  const handleTaskDelete = useCallback(async () => {
    if (!editingTask) return;
    await removePersonalChecklistTask(editingTask.id);
    closeTaskDialog();
  }, [editingTask, removePersonalChecklistTask, closeTaskDialog]);

  const handleToggleTask = useCallback(
    async (task: (typeof tasks)[number]) => {
      await updatePersonalChecklistTask(task.id, {
        completed: !task.completed,
      });
    },
    [updatePersonalChecklistTask],
  );

  const handleInlineAdd = useCallback(async () => {
    const label = newTaskLabel.trim();
    if (!label || !checklistId) return;
    await addPersonalChecklistTask({ checklistId, label, deadline: null });
    setNewTaskLabel("");
  }, [newTaskLabel, checklistId, addPersonalChecklistTask]);

  if (!user) {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 animate-fade-in-up">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
          >
            <ChevronRight size={16} className="rotate-180" /> Back
          </button>
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-[#171e19]">User not found</h2>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const userPoints = getUserPoints(user.id);

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 animate-fade-in-up">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> Back to home
        </button>

        {/* Hero card */}
        <div className="rounded-[2rem] bg-white border border-[#b7c6c2]/20 overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] p-5 relative">
          {/* Decorative blob */}
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" />

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: user.color + "30" }}
                >
                  {user.emoji}
                </div>
                <div>
                  <p className="text-[10px] font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">
                    {user.name}'s
                  </p>
                  <h1 className="text-2xl font-bold text-[#171e19] tracking-tight">
                    My daily habits
                  </h1>
                </div>
              </div>
              {tasks.length > 0 && (
                <p className="text-xs text-[#b7c6c2] font-medium mt-2">
                  {doneTasks.length}/{tasks.length} done
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-[#eeebe3] flex items-center gap-1.5">
                <Trophy size={12} className="text-cantaloupe" />
                <span className="text-xs font-bold text-[#171e19]">{userPoints}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {tasks.length > 0 && (
            <div className="mt-3 flex items-center gap-3 relative z-10">
              <div className="flex-1 h-2.5 rounded-full bg-[#b7c6c2]/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cantaloupe transition-all duration-500"
                  style={{
                    width: `${Math.round((doneTasks.length / tasks.length) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-[11px] font-bold text-cantaloupe">
                {Math.round((doneTasks.length / tasks.length) * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Completion reward */}
      {allDone && (
        <div className="px-5 mt-3 mb-1 animate-fade-in-up">
          <div className="rounded-[1.5rem] bg-gradient-to-r from-[#ca0013] to-[#e31b30] p-5 text-center shadow-[0_12px_40px_-8px_rgba(202,0,19,0.3)]">
            <div className="flex items-center justify-center mb-2">
              <div className="w-14 h-14 rounded-full bg-white/15 flex items-center justify-center">
                <Sparkles size={28} className="text-white" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              All done for today! 🎉
            </h3>
            <p className="text-white/70 text-sm font-medium mb-3">
              {user.name} completed every habit!
            </p>
            {rewardAwarded ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 text-white text-sm font-semibold">
                <Trophy size={16} /> +10 points earned!
              </div>
            ) : (
              <button
                onClick={handleClaimReward}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#ca0013] text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-[0.97]"
              >
                <Trophy size={16} /> Claim 10 points
              </button>
            )}
          </div>
        </div>
      )}

      {/* Open tasks */}
      <div className="px-5 mt-3 space-y-2.5">
        {openTasks.map((task, index) => (
          <div
            key={task.id}
            className="rounded-[1.5rem] overflow-hidden border transition-all duration-300 bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="p-3.5 flex items-center gap-3">
              <button
                onClick={() => handleToggleTask(task)}
                aria-label="Mark as complete"
                className="shrink-0 w-9 h-9 rounded-full border-2 border-[#b7c6c2]/30 text-transparent hover:border-cantaloupe hover:bg-cantaloupe/10 flex items-center justify-center transition-all duration-300 active:scale-90"
              >
                <Check size={16} strokeWidth={3} />
              </button>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium line-clamp-2 leading-snug text-[#171e19]">
                  {task.label}
                </span>
              </div>
              <button
                onClick={() => openEditTask(task)}
                aria-label="Edit task"
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-cantaloupe hover:bg-cantaloupe/10 transition-all active:scale-90"
              >
                <Pencil size={14} />
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && !creating && (
          <div className="text-center py-8">
            <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4 mx-auto">
              <span className="text-3xl">{user.emoji}</span>
            </div>
            <h2 className="text-lg font-semibold text-[#171e19] mb-1">
              Start building habits
            </h2>
            <p className="text-sm text-[#b7c6c2] max-w-[260px] mx-auto">
              Add your first daily habit below. Complete all of them each day to
              earn bonus points!
            </p>
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b7c6c2] mb-2">
              Completed ({doneTasks.length})
            </p>
            {doneTasks.map((task) => (
              <div
                key={task.id}
                className="rounded-[1.5rem] overflow-hidden border border-[#b7c6c2]/10 bg-white/60 mb-2"
              >
                <div className="p-3.5 flex items-center gap-3">
                  <button
                    onClick={() => handleToggleTask(task)}
                    aria-label="Re-open task"
                    className="shrink-0 w-9 h-9 rounded-full bg-green-500 border-2 border-green-500 text-white flex items-center justify-center transition-all duration-300 active:scale-90"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium line-clamp-2 leading-snug text-[#b7c6c2] line-through">
                      {task.label}
                    </span>
                  </div>
                  <button
                    onClick={() => openEditTask(task)}
                    aria-label="Edit task"
                    className="p-2 rounded-full text-[#b7c6c2] hover:text-[#171e19] transition-all active:scale-90 opacity-50"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Inline add task */}
        <div className="flex items-center gap-2 pt-2 pb-4">
          <Input
            value={newTaskLabel}
            onChange={(e) => setNewTaskLabel(e.target.value)}
            placeholder="Quick add a habit…"
            className="flex-1 h-11 rounded-xl bg-white border-[#b7c6c2]/20 text-sm focus:border-cantaloupe focus:ring-cantaloupe"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleInlineAdd();
              }
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleInlineAdd}
                disabled={!newTaskLabel.trim()}
                className="shrink-0 w-11 h-11 rounded-xl bg-cantaloupe text-white flex items-center justify-center disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-90 shadow-[0_4px_12px_-2px_rgba(255,153,0,0.3)]"
                aria-label="Add habit"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
            >
              Add habit
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Detailed add button */}
        <button
          onClick={openCreateTask}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#b7c6c2] hover:text-[#171e19] py-2 transition-colors mb-4"
        >
          <Plus size={14} /> Add with details
        </button>
      </div>

      {/* ── Task create / edit dialog ── */}
      <Dialog
        open={showTaskDialog}
        onOpenChange={(open) => {
          if (!open) closeTaskDialog();
        }}
      >
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingTask ? "Edit Habit" : "New Habit"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Habit Name</label>
              <Input
                value={taskForm.label}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Read 20 pages"
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                onKeyDown={(e) => e.key === "Enter" && handleTaskSubmit()}
              />
            </div>

            {editingTask ? (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowTaskDeleteConfirm(true)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={handleTaskSubmit}
                  disabled={!taskForm.label.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleTaskSubmit}
                disabled={!taskForm.label.trim()}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Add Habit
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Task delete confirmation */}
      {showTaskDeleteConfirm && editingTask && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowTaskDeleteConfirm(false)}
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
                Delete this habit?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{editingTask.label}" will be removed permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowTaskDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={handleTaskDelete}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
