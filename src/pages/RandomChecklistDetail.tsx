import { useState, useMemo, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  X,
  Flag,
  Trash2,
  Clock,
  ChevronRight,
  CircleAlert,
  Settings2,
  Archive as ArchiveIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";
import type { PersonalChecklist, PersonalChecklistTask } from "@/lib/store";

const FLAG_COLORS = [
  "#ca0013", "#3B82F6", "#10B981", "#FBBF24",
  "#A78BFA", "#F472B6", "#FDA172", "#171e19",
];

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface TaskFormState {
  label: string;
  deadline: string;
}

const EMPTY_TASK_FORM: TaskFormState = { label: "", deadline: "" };

export default function RandomChecklistDetailPage() {
  const navigate = useNavigate();
  const { checklistId } = useParams<{ checklistId: string }>();
  const {
    state,
    updatePersonalChecklist,
    removePersonalChecklist,
    addPersonalChecklistTask,
    updatePersonalChecklistTask,
    removePersonalChecklistTask,
    syncPersonalChecklistDeadline,
    addFlag,
    updateFlag,
    removeFlag,
    getFlagById,
  } = useApp();

  const checklist = state.personalChecklists.find((c) => c.id === checklistId);

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

  // ── Task create / edit dialog ──
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<PersonalChecklistTask | null>(null);
  const [taskForm, setTaskForm] = useState<TaskFormState>(EMPTY_TASK_FORM);
  const [showTaskDeleteConfirm, setShowTaskDeleteConfirm] = useState(false);

  // ── Checklist edit sheet ──
  const [showChecklistEdit, setShowChecklistEdit] = useState(false);
  const [clForm, setClForm] = useState({ name: "", bgColor: "#ffffff", flagId: "", deadline: "" });
  const [showClDeleteConfirm, setShowClDeleteConfirm] = useState(false);

  // ── Archive completed checklist confirmation ──
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // ── Inline new task ──
  const [newTaskLabel, setNewTaskLabel] = useState("");

  // ── Flag manager dialog ──
  const [flagManagerOpen, setFlagManagerOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [flagForm, setFlagForm] = useState({ name: "", color: "#ca0013" });
  const [flagDeleteConfirm, setFlagDeleteConfirm] = useState<{ id: string; name: string; color: string } | null>(null);

  const openCreateTask = useCallback(() => {
    setEditingTask(null);
    setTaskForm(EMPTY_TASK_FORM);
    setShowTaskDialog(true);
  }, []);

  const openEditTask = useCallback((task: PersonalChecklistTask) => {
    setEditingTask(task);
    setTaskForm({
      label: task.label,
      deadline: toLocalInput(task.deadline),
    });
    setShowTaskDeleteConfirm(false);
    setShowTaskDialog(true);
  }, []);

  const closeTaskDialog = useCallback(() => {
    setShowTaskDialog(false);
    setEditingTask(null);
    setShowTaskDeleteConfirm(false);
  }, []);

  const handleTaskSubmit = useCallback(async () => {
    if (!taskForm.label.trim() || !checklistId) return;
    const deadline = fromLocalInput(taskForm.deadline);

    if (editingTask) {
      await updatePersonalChecklistTask(editingTask.id, {
        label: taskForm.label.trim(),
        deadline,
      });
    } else {
      await addPersonalChecklistTask({
        checklistId,
        label: taskForm.label.trim(),
        deadline,
      });
    }
    closeTaskDialog();
  }, [taskForm, checklistId, editingTask, addPersonalChecklistTask, updatePersonalChecklistTask, closeTaskDialog]);

  const handleTaskDelete = useCallback(async () => {
    if (!editingTask) return;
    await removePersonalChecklistTask(editingTask.id);
    closeTaskDialog();
  }, [editingTask, removePersonalChecklistTask, closeTaskDialog]);

  const handleToggleTask = useCallback(async (task: PersonalChecklistTask) => {
    await updatePersonalChecklistTask(task.id, {
      completed: !task.completed,
    });
  }, [updatePersonalChecklistTask]);

  const handleInlineAdd = useCallback(async () => {
    const label = newTaskLabel.trim();
    if (!label || !checklistId) return;
    await addPersonalChecklistTask({ checklistId, label, deadline: null });
    setNewTaskLabel("");
  }, [newTaskLabel, checklistId, addPersonalChecklistTask]);

  // ── Checklist edit ──
  const openChecklistEdit = useCallback(() => {
    if (!checklist) return;
    setClForm({
      name: checklist.name,
      bgColor: checklist.bgColor,
      flagId: checklist.flagId ?? "",
      deadline: toLocalInput(checklist.deadline),
    });
    setShowClDeleteConfirm(false);
    setShowChecklistEdit(true);
  }, [checklist]);

  const handleChecklistSave = useCallback(async () => {
    if (!clForm.name.trim() || !checklistId) return;
    const deadline = fromLocalInput(clForm.deadline);
    const flagId = clForm.flagId || null;
    await updatePersonalChecklist(checklistId, {
      name: clForm.name.trim(),
      bgColor: clForm.bgColor,
      flagId,
      deadline,
    });
    setShowChecklistEdit(false);
  }, [clForm, checklistId, updatePersonalChecklist]);

  const handleChecklistDelete = useCallback(async () => {
    if (!checklistId) return;
    await updatePersonalChecklist(checklistId, { archived: true });
    navigate("/checklist/random");
  }, [checklistId, updatePersonalChecklist, navigate]);

  const handleSyncDeadline = useCallback(async () => {
    if (!checklistId) return;
    await syncPersonalChecklistDeadline(checklistId);
  }, [checklistId, syncPersonalChecklistDeadline]);

  // ── Flag helpers ──
  const openFlagCreate = useCallback(() => {
    setEditingFlag(null);
    setFlagForm({ name: "", color: "#ca0013" });
    setFlagManagerOpen(true);
  }, []);

  const openFlagEdit = useCallback((f: { id: string; name: string; color: string }) => {
    setEditingFlag(f);
    setFlagForm({ name: f.name, color: f.color });
    setFlagManagerOpen(true);
  }, []);

  const closeFlagManager = useCallback(() => {
    setFlagManagerOpen(false);
    setEditingFlag(null);
  }, []);

  const handleFlagSubmit = useCallback(async () => {
    const name = flagForm.name.trim();
    if (!name || !/^#[0-9a-fA-F]{6}$/.test(flagForm.color)) return;
    if (editingFlag) {
      await updateFlag(editingFlag.id, { name, color: flagForm.color });
    } else {
      await addFlag({ name, color: flagForm.color });
    }
    closeFlagManager();
  }, [flagForm, editingFlag, addFlag, updateFlag, closeFlagManager]);

  if (!checklist) {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 animate-fade-in-up">
          <button
            onClick={() => navigate("/checklist/random")}
            className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
          >
            <ChevronRight size={16} className="rotate-180" /> Back
          </button>
          <div className="text-center py-16">
            <h2 className="text-lg font-semibold text-[#171e19]">Checklist not found</h2>
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  const flag = getFlagById(checklist.flagId);
  const deadline = describeDeadline(checklist.deadline);
  const pct = checklist.totalTasks > 0 ? Math.round((checklist.doneTasks / checklist.totalTasks) * 100) : 0;

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 animate-fade-in-up">
        <button
          onClick={() => navigate("/checklist/random")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> Back to random checklists
        </button>

        {/* Checklist hero card */}
        <div
          className="rounded-[2rem] border border-[#b7c6c2]/20 overflow-hidden shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] p-5"
          style={{
            backgroundColor: checklist.bgColor,
            boxShadow: flag ? `0 0 0 2px ${flag.color}30, 0 8px 30px -12px rgba(0,0,0,0.06)` : undefined,
          }}
        >
          {flag && (
            <div className="flex items-center gap-1.5 mb-2" style={{ color: flag.color }}>
              <Flag size={11} fill={flag.color} strokeWidth={0} />
              <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">{flag.name}</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-[#171e19] tracking-tight">{checklist.name}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {deadline && (
                  <span
                    className="text-[10px] font-extrabold uppercase tracking-[0.08em] inline-flex items-center gap-1"
                    style={{
                      color: deadline.urgency === "overdue"
                        ? "#ca0013"
                        : deadline.urgency === "today" || deadline.urgency === "soon"
                          ? "#F59E0B"
                          : "#b7c6c2",
                    }}
                  >
                    <Clock size={10} />
                    {deadline.label}
                  </span>
                )}
                {checklist.totalTasks > 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2]">
                    {checklist.doneTasks}/{checklist.totalTasks} done
                  </span>
                )}
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={openChecklistEdit}
                  className="p-2.5 rounded-full bg-white/60 text-[#95a5a0] hover:text-[#171e19] hover:bg-white transition-all active:scale-90"
                  aria-label="Edit checklist settings"
                >
                  <Settings2 size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                Settings
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Progress bar */}
          {checklist.totalTasks > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 h-2.5 rounded-full bg-[#b7c6c2]/20 overflow-hidden">
                <div className="h-full rounded-full bg-[#F472B6] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-[#F472B6]">{pct}%</span>
            </div>
          )}

          {/* Household-wide badge */}
          <div className="mt-3 px-3 py-1.5 rounded-xl bg-[#b7c6c2]/10 inline-flex items-center gap-1.5">
            <CircleAlert size={11} className="text-[#b7c6c2]" />
            <span className="text-[10px] font-bold text-[#b7c6c2] uppercase tracking-[0.08em]">Shared — everyone can see</span>
          </div>
        </div>
      </div>

      {/* Sync deadline button */}
      {checklist.totalTasks > 0 && (
        <div className="px-5 mt-3 mb-2">
          <button
            onClick={handleSyncDeadline}
            className="w-full flex items-center justify-center gap-2 rounded-[1.25rem] p-3 bg-white border border-[#b7c6c2]/20 text-[#b7c6c2] hover:text-[#171e19] hover:bg-[#eeebe3] transition-all active:scale-[0.98] text-xs font-semibold"
          >
            <Clock size={14} />
            Sync deadline to latest task
          </button>
        </div>
      )}

      {/* Archive completed checklist button */}
      {checklist.totalTasks > 0 && checklist.doneTasks === checklist.totalTasks && (
        <div className="px-5 mt-2 mb-2">
          <button
            onClick={() => setShowArchiveConfirm(true)}
            className="w-full flex items-center justify-center gap-2 rounded-[1.25rem] p-3 bg-[#eeebe3] border border-[#b7c6c2]/20 text-[#171e19] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98] text-xs font-semibold"
          >
            <ArchiveIcon size={14} />
            Archive this completed checklist
          </button>
        </div>
      )}

      {/* Open tasks */}
      <div className="px-5 mt-3 space-y-2.5">
        {openTasks.map((task, index) => {
          const taskDeadline = describeDeadline(task.deadline);
          return (
            <div
              key={task.id}
              className="rounded-[1.5rem] overflow-hidden border transition-all duration-300 bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-3.5 flex items-center gap-3">
                <button
                  onClick={() => handleToggleTask(task)}
                  aria-label="Mark as complete"
                  className="shrink-0 w-9 h-9 rounded-full border-2 border-[#b7c6c2]/30 text-transparent hover:border-[#F472B6] hover:bg-pink-50 flex items-center justify-center transition-all duration-300 active:scale-90"
                >
                  <Check size={16} strokeWidth={3} />
                </button>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium line-clamp-2 leading-snug text-[#171e19]">{task.label}</span>
                  {taskDeadline && (
                    <span
                      className="text-[10px] font-extrabold uppercase tracking-[0.08em] inline-flex items-center gap-1 mt-0.5"
                      style={{
                        color: taskDeadline.urgency === "overdue" ? "#ca0013" : taskDeadline.urgency === "today" || taskDeadline.urgency === "soon" ? "#F59E0B" : "#b7c6c2",
                      }}
                    >
                      {taskDeadline.urgency === "overdue" && <CircleAlert size={10} />}
                      {taskDeadline.label}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => openEditTask(task)}
                  aria-label="Edit task"
                  className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#F472B6] hover:bg-pink-50 transition-all active:scale-90"
                >
                  <Pencil size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {openTasks.length === 0 && doneTasks.length === 0 && (
          <div className="text-center py-6 text-[#b7c6c2] text-sm">
            No tasks yet — add your first one below
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="pt-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b7c6c2] mb-2">
              Completed ({doneTasks.length})
            </p>
            {doneTasks.map((task) => {
              const taskDeadline = describeDeadline(task.deadline);
              return (
                <div
                  key={task.id}
                  className="rounded-[1.5rem] overflow-hidden border border-[#b7c6c2]/10 bg-white/60 mb-2"
                >
                  <div className="p-3.5 flex items-center gap-3">
                    <button
                      onClick={() => handleToggleTask(task)}
                      aria-label="Re-open task"
                      className="shrink-0 w-9 h-9 rounded-full bg-[#F472B6] border-2 border-[#F472B6] text-white flex items-center justify-center transition-all duration-300 active:scale-90"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-medium line-clamp-2 leading-snug text-[#b7c6c2] line-through">{task.label}</span>
                      {taskDeadline && (
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2] mt-0.5 inline-flex items-center gap-1">
                          {taskDeadline.label}
                        </span>
                      )}
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
              );
            })}
          </div>
        )}

        {/* Inline add task */}
        <div className="flex items-center gap-2 pt-2">
          <Input
            value={newTaskLabel}
            onChange={(e) => setNewTaskLabel(e.target.value)}
            placeholder="Quick add a task…"
            className="flex-1 h-11 rounded-xl bg-white border-[#b7c6c2]/20 text-sm focus:border-[#F472B6] focus:ring-[#F472B6]"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleInlineAdd(); }
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleInlineAdd}
                disabled={!newTaskLabel.trim()}
                className="shrink-0 w-11 h-11 rounded-xl bg-[#F472B6] text-white flex items-center justify-center disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-90 shadow-[0_4px_12px_-2px_rgba(244,114,182,0.3)]"
                aria-label="Add task"
              >
                <Plus size={18} strokeWidth={2.5} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
              Add task
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Detailed add button */}
        <button
          onClick={openCreateTask}
          className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#b7c6c2] hover:text-[#171e19] py-2 transition-colors"
        >
          <Plus size={14} /> Add with deadline
        </button>
      </div>

      {/* ── Task create / edit dialog ── */}
      <Dialog open={showTaskDialog} onOpenChange={(open) => { if (!open) closeTaskDialog(); }}>
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingTask ? "Edit Task" : "New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Task Name</label>
              <Input
                value={taskForm.label}
                onChange={(e) => setTaskForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Water the plants"
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                onKeyDown={(e) => e.key === "Enter" && handleTaskSubmit()}
              />
            </div>
            <div>
              <label className="section-header block mb-2">Deadline (optional)</label>
              <Input
                type="datetime-local"
                value={taskForm.deadline}
                onChange={(e) => setTaskForm((f) => ({ ...f, deadline: e.target.value }))}
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6] text-sm"
              />
              {taskForm.deadline && (
                <button
                  onClick={() => setTaskForm((f) => ({ ...f, deadline: "" }))}
                  className="mt-1.5 text-[11px] font-semibold text-[#b7c6c2] hover:text-[#ca0013] transition-colors"
                >
                  Clear deadline
                </button>
              )}
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
                Add Task
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
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <Trash2 className="text-[#ca0013]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Delete this task?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{editingTask.label}" will be removed permanently.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTaskDeleteConfirm(false)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]">Cancel</button>
              <button onClick={handleTaskDelete} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Checklist edit dialog ── */}
      <Dialog open={showChecklistEdit} onOpenChange={(open) => { if (!open) setShowChecklistEdit(false); }}>
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">Checklist Settings</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Name</label>
              <Input
                value={clForm.name}
                onChange={(e) => setClForm((f) => ({ ...f, name: e.target.value }))}
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
              />
            </div>
            <div>
              <label className="section-header block mb-2">Background Color</label>
              <div className="flex flex-wrap gap-2">
                {[
                  "#ffffff", "#fff8e1", "#e8f5e9", "#e3f2fd", "#fce4ec",
                  "#f3e5f5", "#fff3e0", "#e0f2f1", "#ede7f6", "#fbe9e7",
                ].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setClForm((f) => ({ ...f, bgColor: c }))}
                    className={`w-9 h-9 rounded-xl border-2 transition-all active:scale-90 ${clForm.bgColor === c ? "border-[#171e19] scale-110 shadow-md" : "border-[#b7c6c2]/20"}`}
                    style={{ backgroundColor: c }}
                  >
                    {clForm.bgColor === c && <Check size={14} className="text-[#F472B6] mx-auto" />}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="section-header block mb-2">Flag</label>
              <FlagSelector
                flags={state.taskFlags}
                value={clForm.flagId}
                onChange={(id) => setClForm((f) => ({ ...f, flagId: id }))}
                onCreate={openFlagCreate}
                onEdit={openFlagEdit}
              />
            </div>
            <div>
              <label className="section-header block mb-2">Deadline</label>
              <Input
                type="datetime-local"
                value={clForm.deadline}
                onChange={(e) => setClForm((f) => ({ ...f, deadline: e.target.value }))}
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6] text-sm"
              />
              {clForm.deadline && (
                <button
                  onClick={() => setClForm((f) => ({ ...f, deadline: "" }))}
                  className="mt-1.5 text-[11px] font-semibold text-[#b7c6c2] hover:text-[#ca0013] transition-colors"
                >
                  Clear deadline
                </button>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowClDeleteConfirm(true)}
                className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Trash2 size={16} /> Delete
              </button>
              <button
                onClick={handleChecklistSave}
                disabled={!clForm.name.trim()}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Save
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist delete confirmation */}
      {showClDeleteConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowClDeleteConfirm(false)}
        >
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#eeebe3] flex items-center justify-center mb-3">
                <Trash2 className="text-[#171e19]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Move to Archive?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{checklist.name}" will be moved to the Archive, where you can delete it permanently or reuse it.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleChecklistDelete} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]">Yes, move to Archive</button>
              <button onClick={() => setShowClDeleteConfirm(false)} className="w-full py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Flag manager dialog */}
      {flagManagerOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={closeFlagManager}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 pb-32 animate-slide-up max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#171e19]">{editingFlag ? "Edit Flag" : "New Flag"}</h3>
              <button onClick={closeFlagManager} className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] hover:bg-[#b7c6c2]/30 transition-all active:scale-90" aria-label="Close">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="section-header block mb-2">Name</label>
                <Input value={flagForm.name} onChange={(e) => setFlagForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Urgent" className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]" />
              </div>
              <div>
                <label className="section-header block mb-2">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FLAG_COLORS.map((c) => (
                    <button key={c} onClick={() => setFlagForm((f) => ({ ...f, color: c }))} className={`w-8 h-8 rounded-full border-2 transition-all active:scale-90 ${flagForm.color === c ? "border-[#171e19] scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={flagForm.color} onChange={(e) => setFlagForm((f) => ({ ...f, color: e.target.value }))} className="w-8 h-8 rounded-full cursor-pointer bg-transparent" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                {editingFlag && (
                  <button onClick={() => setFlagDeleteConfirm(editingFlag)} className="py-3 px-4 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button onClick={handleFlagSubmit} disabled={!flagForm.name.trim()} className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]">
                  {editingFlag ? "Save" : "Add Flag"}
                </button>
              </div>
            </div>
            {state.taskFlags.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#b7c6c2]/20">
                <h4 className="section-header mb-3">Existing flags</h4>
                <div className="space-y-2">
                  {state.taskFlags.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#eeebe3]/50">
                      <div className="w-7 h-7 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="flex-1 text-sm font-medium text-[#171e19]">{f.name}</span>
                      <button onClick={() => openFlagEdit(f)} className="p-2 rounded-full text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-all active:scale-90"><Pencil size={14} /></button>
                      <button onClick={() => setFlagDeleteConfirm(f)} className="p-2 rounded-full text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"><Trash2 size={14} /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Flag delete confirmation */}
      {flagDeleteConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5" onClick={() => setFlagDeleteConfirm(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: flagDeleteConfirm.color + "20" }}>
                <Flag className="text-[#171e19]" size={28} fill={flagDeleteConfirm.color} strokeWidth={0} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Delete this flag?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">"{flagDeleteConfirm.name}" will be removed and unlinked.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setFlagDeleteConfirm(null)} className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] transition-all active:scale-[0.98]">Cancel</button>
              <button onClick={async () => {
                await removeFlag(flagDeleteConfirm.id);
                if (editingFlag?.id === flagDeleteConfirm.id) { setEditingFlag(null); setFlagForm({ name: "", color: "#ca0013" }); closeFlagManager(); }
                setClForm((f) => f.flagId === flagDeleteConfirm.id ? { ...f, flagId: "" } : f);
                setFlagDeleteConfirm(null);
              }} className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Archive completed checklist confirmation */}
      {showArchiveConfirm && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowArchiveConfirm(false)}
        >
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#eeebe3] flex items-center justify-center mb-3">
                <ArchiveIcon className="text-[#171e19]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Archive this checklist?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{checklist.name}" will be moved to the Archive, where you can delete it permanently or reuse it.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  await updatePersonalChecklist(checklistId!, { archived: true });
                  navigate("/checklist/random");
                }}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Yes, move to Archive
              </button>
              <button
                onClick={() => setShowArchiveConfirm(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// ── Flag selector dropdown ──
function FlagSelector({
  flags, value, onChange, onCreate, onEdit,
}: {
  flags: Array<{ id: string; name: string; color: string }>;
  value: string;
  onChange: (id: string) => void;
  onCreate: () => void;
  onEdit: (flag: { id: string; name: string; color: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = flags.find((f) => f.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3.5 h-11 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 hover:border-[#F472B6]/30 transition-all"
      >
        {selected ? (
          <>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
            <span className="flex-1 text-left text-sm font-medium text-[#171e19]">{selected.name}</span>
          </>
        ) : (
          <>
            <Flag size={14} className="text-[#b7c6c2] shrink-0" />
            <span className="flex-1 text-left text-sm font-medium text-[#b7c6c2]">No flag</span>
          </>
        )}
        <ChevronRight size={14} className={`text-[#b7c6c2] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-[300] mt-1 left-0 right-0 bg-white rounded-[1.25rem] border border-[#b7c6c2]/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] p-1.5 max-h-60 overflow-y-auto animate-fade-in-up">
          <button type="button" onClick={() => { onChange(""); setOpen(false); }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!value ? "bg-[#eeebe3] text-[#171e19]" : "text-[#171e19] hover:bg-[#eeebe3]"}`}>
            <span className="w-3 h-3 rounded-full border border-[#b7c6c2]/40" />
            <span className="flex-1 text-left">No flag</span>
          </button>
          {flags.map((f) => (
            <div key={f.id} className={`flex items-center gap-1 rounded-xl transition-colors ${value === f.id ? "bg-[#eeebe3]" : "hover:bg-[#eeebe3]"}`}>
              <button type="button" onClick={() => { onChange(f.id); setOpen(false); }} className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#171e19] text-left">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                <span className="flex-1">{f.name}</span>
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(f); }} className="p-1.5 rounded-lg text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-colors active:scale-90"><Pencil size={12} /></button>
            </div>
          ))}
          <div className="border-t border-[#b7c6c2]/20 mt-1 pt-1">
            <button type="button" onClick={() => { setOpen(false); onCreate(); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#F472B6] hover:bg-pink-50 transition-colors">
              <Plus size={14} strokeWidth={2.5} />
              <span className="flex-1 text-left">Add a flag</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
