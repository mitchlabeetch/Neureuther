import { useMemo, useRef, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  X,
  CalendarDays,
  PartyPopper,
  Flag,
  Star,
  Archive,
  ChevronDown,
  ChevronRight,
  Users,
  CircleAlert,
  Trash2,
  ListTree,
  Info,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";
import type { ChecklistItem, ChecklistSubtask, TaskFlag } from "@/lib/store";

// ── Form state for the create / edit dialog ───────────────────────────
interface TaskFormState {
  label: string;
  points: string;
  deadline: string; // datetime-local value, or '' for none
  flagId: string; // '' means none
  autoCompleteOnSubtasks: boolean;
}

const EMPTY_FORM: TaskFormState = {
  label: "",
  points: "10",
  deadline: "",
  flagId: "",
  autoCompleteOnSubtasks: false,
};

// ── Helpers ───────────────────────────────────────────────────────────
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // datetime-local needs YYYY-MM-DDTHH:mm
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

// ── Main page component ───────────────────────────────────────────────
function LongTermChecklistPage() {
  const {
    state,
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
    toggleChecklistItem,
    addSubtask,
    updateSubtask,
    removeSubtask,
    addFlag,
    updateFlag,
    removeFlag,
    awardPoints,
    awardPointsToMany,
    getUserById,
    getFlagById,
  } = useApp();

  const navigate = useNavigate();

  // ── Active list ────────────────────────────────────────────────
  const longTermItems = useMemo(
    () =>
      state.checklistItems
        .filter((i) => i.kind === "long_term" && !i.archived)
        .sort((a, b) => {
          // Open tasks first, completed last; then by sort_order
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return 0;
        }),
    [state.checklistItems],
  );

  const subtasksByTask = useMemo(() => {
    const map = new Map<string, ChecklistSubtask[]>();
    for (const s of state.checklistSubtasks) {
      const list = map.get(s.taskId) ?? [];
      list.push(s);
      map.set(s.taskId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [state.checklistSubtasks]);

  // ── Dialog state ───────────────────────────────────────────────
  const [showDialog, setShowDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  const [form, setForm] = useState<TaskFormState>(EMPTY_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // User picker ("Who did it?") with "We all participated" option
  const [activePicker, setActivePicker] = useState<{
    itemId: string;
    recipients: "single" | "all";
  } | null>(null);

  // Animated "+ pts" celebration
  const [successAnimation, setSuccessAnimation] = useState<{
    points: number;
    key: number;
  } | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Flag manager dialog
  const [flagManagerOpen, setFlagManagerOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<TaskFlag | null>(null);
  const [flagForm, setFlagForm] = useState<{ name: string; color: string }>({
    name: "",
    color: "#ca0013",
  });
  const [flagDeleteConfirm, setFlagDeleteConfirm] = useState<TaskFlag | null>(null);

  // Per-task subtask input (when expanded)
  const [newSubtaskLabel, setNewSubtaskLabel] = useState("");

  // ── Celebration helper ─────────────────────────────────────────
  const triggerSuccess = (points: number) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setSuccessAnimation({ points, key: Date.now() });
    successTimeoutRef.current = setTimeout(() => setSuccessAnimation(null), 1800);
  };

  // ── Completion handler ─────────────────────────────────────────
  const completeItemForUsers = async (itemId: string, userIds: string[]) => {
    const item = state.checklistItems.find((i) => i.id === itemId);
    if (!item) return;
    // Pick the first user as the "completer" for the toggle — points are
    // awarded separately, so the completedBy field is just a record.
    const completerId = userIds[0];
    await toggleChecklistItem(itemId, completerId);
    // Move to archive on completion (long-term tasks auto-archive).
    await updateChecklistItem(itemId, { archived: true });
    if (userIds.length === state.users.length && state.users.length > 1) {
      await awardPointsToMany(userIds, item.points, `Completed: ${item.label}`);
    } else {
      // Award to each user individually to keep the points log granular.
      for (const uid of userIds) {
        await awardPoints(uid, item.points, `Completed: ${item.label}`);
      }
    }
    // The celebration burst shows the *total* points awarded (e.g. 3
    // users × 10 pts = 30 pts!) so the user sees the real payoff.
    triggerSuccess(item.points * userIds.length);
  };

  const handleToggle = (id: string) => {
    const item = state.checklistItems.find((i) => i.id === id);
    if (!item) return;
    if (!item.completed) {
      // Open the user picker
      setActivePicker({ itemId: id, recipients: "single" });
      return;
    }
    // Re-opening an archived completed task isn't expected from this
    // page (those live in the Archive), but allow it for safety.
    toggleChecklistItem(id);
  };

  // ── Open create / edit dialogs ─────────────────────────────────
  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const openEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setForm({
      label: item.label,
      points: String(item.points),
      deadline: toLocalInput(item.deadline),
      flagId: item.flagId ?? "",
      autoCompleteOnSubtasks: item.autoCompleteOnSubtasks,
    });
    setShowDeleteConfirm(false);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setShowDeleteConfirm(false);
  };

  const handleSubmit = async () => {
    const pts = Number(form.points);
    if (!form.label.trim() || !Number.isFinite(pts) || pts < 0) return;
    const deadline = fromLocalInput(form.deadline);
    const flagId = form.flagId || null;

    if (editingItem) {
      await updateChecklistItem(editingItem.id, {
        label: form.label.trim(),
        points: Math.floor(pts),
        deadline,
        flagId,
        autoCompleteOnSubtasks: form.autoCompleteOnSubtasks,
      });
    } else {
      await addChecklistItem({
        label: form.label.trim(),
        points: Math.floor(pts),
        kind: "long_term",
        deadline,
        flagId,
        autoCompleteOnSubtasks: form.autoCompleteOnSubtasks,
      });
    }
    closeDialog();
  };

  const handleDelete = async () => {
    if (!editingItem) return;
    await removeChecklistItem(editingItem.id);
    setShowDeleteConfirm(false);
    setShowDialog(false);
    setEditingItem(null);
  };

  // ── Subtask helpers ────────────────────────────────────────────
  const handleAddSubtask = async (taskId: string) => {
    const label = newSubtaskLabel.trim();
    if (!label) return;
    await addSubtask(taskId, label);
    setNewSubtaskLabel("");
  };

  const handleToggleSubtask = async (
    task: ChecklistItem,
    subtask: ChecklistSubtask,
  ) => {
    const next = !subtask.completed;
    await updateSubtask(subtask.id, { completed: next });

    // If auto-complete is on and this was the last unchecked subtask,
    // pop the "Who did it?" picker (mirroring the parent task flow).
    if (
      next &&
      task.autoCompleteOnSubtasks &&
      !task.completed &&
      task.kind === "long_term" &&
      !task.archived
    ) {
      const all = subtasksByTask.get(task.id) ?? [];
      const updated = all.map((s) =>
        s.id === subtask.id ? { ...s, completed: true } : s,
      );
      if (updated.every((s) => s.completed)) {
        setActivePicker({ itemId: task.id, recipients: "single" });
      }
    }
  };

  // ── Flag manager helpers ───────────────────────────────────────
  const openFlagCreate = () => {
    setEditingFlag(null);
    setFlagForm({ name: "", color: "#ca0013" });
    setFlagManagerOpen(true);
  };

  const openFlagEdit = (flag: TaskFlag) => {
    setEditingFlag(flag);
    setFlagForm({ name: flag.name, color: flag.color });
    setFlagManagerOpen(true);
  };

  const closeFlagManager = () => {
    setFlagManagerOpen(false);
    setEditingFlag(null);
  };

  const handleFlagSubmit = async () => {
    const name = flagForm.name.trim();
    if (!name) return;
    if (!/^#[0-9a-fA-F]{6}$/.test(flagForm.color)) return;
    if (editingFlag) {
      await updateFlag(editingFlag.id, { name, color: flagForm.color });
    } else {
      await addFlag({ name, color: flagForm.color });
    }
    closeFlagManager();
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate("/checklist")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-green-50 flex items-center justify-center">
            <CalendarDays className="text-[#69D2A6]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              Long-term Checklist
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              {longTermItems.length} active{" "}
              {longTermItems.length === 1 ? "task" : "tasks"}
            </p>
          </div>
        </div>
        <p className="text-xs text-[#b7c6c2] font-medium mt-2.5 flex items-center gap-1.5">
          <Info size={12} /> Click on a task to see more
        </p>
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5 mb-3">
        {longTermItems.map((item, index) => {
          const flag = getFlagById(item.flagId);
          const subtasks = subtasksByTask.get(item.id) ?? [];
          const deadline = describeDeadline(item.deadline);
          const isExpanded = expandedTaskId === item.id;
          const hasSubtasks = subtasks.length > 0;
          const doneSubtasks = subtasks.filter((s) => s.completed).length;

          return (
            <div
              key={item.id}
              className="rounded-[1.5rem] overflow-hidden border transition-all duration-300 bg-white border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]"
              style={{
                animationDelay: `${index * 50}ms`,
                // Subtle flag-tinted outline when a flag is set
                boxShadow: flag
                  ? `0 0 0 2px ${flag.color}30, 0 4px 20px -4px rgba(0,0,0,0.04)`
                  : undefined,
              }}
            >
              {/* Top row: flag label (only if flagged) */}
              {flag && (
                <div
                  className="px-4 pt-2.5 pb-0 flex items-center gap-1.5"
                  style={{ color: flag.color }}
                >
                  <Flag size={11} fill={flag.color} strokeWidth={0} />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                    {flag.name}
                  </span>
                </div>
              )}

              <div className="p-4 flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggle(item.id);
                  }}
                  aria-label="Mark as complete"
                  className="shrink-0 w-9 h-9 rounded-full border-2 border-[#b7c6c2]/30 text-transparent hover:border-[#69D2A6] hover:bg-green-50 flex items-center justify-center transition-all duration-300 active:scale-90"
                >
                  <Check size={16} strokeWidth={3} />
                </button>

                <button
                  onClick={() =>
                    setExpandedTaskId(isExpanded ? null : item.id)
                  }
                  className="flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
                >
                  <span className="text-sm font-medium block truncate text-[#171e19]">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {deadline && (
                      <span
                        className="text-[10px] font-extrabold uppercase tracking-[0.08em] inline-flex items-center gap-1"
                        style={{
                          color:
                            deadline.urgency === "overdue"
                              ? "#ca0013"
                              : deadline.urgency === "today" ||
                                  deadline.urgency === "soon"
                                ? "#F59E0B"
                                : "#b7c6c2",
                        }}
                      >
                        {deadline.urgency === "overdue" && (
                          <CircleAlert size={10} />
                        )}
                        {deadline.label}
                      </span>
                    )}
                    {hasSubtasks && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2] inline-flex items-center gap-1">
                            <ListTree size={10} />
                            {doneSubtasks}/{subtasks.length}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          {doneSubtasks} of {subtasks.length} sub-tasks done
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {item.autoCompleteOnSubtasks && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2] inline-flex items-center gap-1">
                            <CircleAlert size={10} />
                            Auto
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Completes automatically when all sub-tasks are done
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </button>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#69D2A6] bg-green-50 px-2 py-0.5 rounded-full">
                      <Star size={10} /> {item.points}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                  >
                    Worth {item.points} points
                  </TooltipContent>
                </Tooltip>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openEdit(item);
                  }}
                  aria-label="Edit this task"
                  className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#69D2A6] hover:bg-green-50 transition-all active:scale-90"
                >
                  <Pencil size={14} />
                </button>
              </div>

              {/* Expanded: sub-tasks */}
              {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in-up">
                  <div className="bg-[#eeebe3]/50 rounded-[1.25rem] p-3 space-y-2">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <ListTree size={12} className="text-[#b7c6c2]" />
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#b7c6c2]">
                        Sub-tasks ({doneSubtasks}/{subtasks.length})
                      </span>
                    </div>
                    {subtasks.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center gap-2.5 bg-white rounded-xl p-2.5"
                      >
                        <button
                          onClick={() => handleToggleSubtask(item, s)}
                          aria-label={s.completed ? "Re-open sub-task" : "Complete sub-task"}
                          className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all active:scale-90 ${
                            s.completed
                              ? "bg-[#69D2A6] border-[#69D2A6] text-white"
                              : "border-[#b7c6c2]/40 text-transparent hover:border-[#69D2A6]"
                          }`}
                        >
                          <Check size={12} strokeWidth={3} />
                        </button>
                        <span
                          className={`flex-1 text-xs font-medium ${
                            s.completed
                              ? "text-[#b7c6c2] line-through"
                              : "text-[#171e19]"
                          }`}
                        >
                          {s.label}
                        </span>
                        <button
                          onClick={() => removeSubtask(s.id)}
                          aria-label="Delete sub-task"
                          className="p-1 rounded-full text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-colors active:scale-90"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <Input
                        value={newSubtaskLabel}
                        onChange={(e) => setNewSubtaskLabel(e.target.value)}
                        placeholder="Add a sub-task…"
                        className="flex-1 h-9 rounded-xl bg-white border-[#b7c6c2]/20 text-xs focus:border-[#69D2A6] focus:ring-[#69D2A6]"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddSubtask(item.id);
                          }
                        }}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleAddSubtask(item.id)}
                            disabled={!newSubtaskLabel.trim()}
                            className="shrink-0 w-9 h-9 rounded-xl bg-[#171e19] text-white flex items-center justify-center disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-90"
                            aria-label="Add sub-task"
                          >
                            <Plus size={14} strokeWidth={2.5} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Add sub-task
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {longTermItems.length === 0 && (
          <div className="text-center py-8 text-[#b7c6c2] text-sm">
            No long-term tasks yet — tap <strong>Add new task</strong> below to
            create one
          </div>
        )}
      </div>

      {/* Add new task */}
      <div className="px-5 mb-3">
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-[#69D2A6] flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>Add new task</span>
        </button>
      </div>

      {/* See the Archive */}
      <div className="px-5 mb-3">
        <button
          onClick={() => navigate("/checklist/long-term/archive")}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-3.5 bg-white border border-[#b7c6c2]/20 text-[#171e19] font-semibold hover:bg-[#eeebe3] transition-all active:scale-[0.98]"
        >
          <Archive size={16} className="text-[#b7c6c2]" />
          <span>See the Archive</span>
        </button>
      </div>

      {/* ── Create / Edit dialog ─────────────────────────────────── */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingItem ? "Edit Long-term Task" : "New Long-term Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Task Name</label>
              <Input
                value={form.label}
                onChange={(e) =>
                  setForm((f) => ({ ...f, label: e.target.value }))
                }
                placeholder="e.g. Renew car insurance"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#69D2A6] focus:ring-[#69D2A6]"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div>
              <label className="section-header block mb-2">Points</label>
              <Input
                type="number"
                inputMode="numeric"
                min="0"
                value={form.points}
                onChange={(e) =>
                  setForm((f) => ({ ...f, points: e.target.value }))
                }
                placeholder="10"
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#69D2A6] focus:ring-[#69D2A6]"
              />
            </div>

            <div>
              <label className="section-header block mb-2">
                Deadline (optional)
              </label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, deadline: e.target.value }))
                }
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#69D2A6] focus:ring-[#69D2A6] text-sm"
              />
              {form.deadline && (
                <button
                  onClick={() => setForm((f) => ({ ...f, deadline: "" }))}
                  className="mt-1.5 text-[11px] font-semibold text-[#b7c6c2] hover:text-[#ca0013] transition-colors"
                >
                  Clear deadline
                </button>
              )}
            </div>

            <div>
              <label className="section-header block mb-2">
                Flag (optional)
              </label>
              <FlagSelector
                flags={state.taskFlags}
                value={form.flagId}
                onChange={(id) => setForm((f) => ({ ...f, flagId: id }))}
                onCreate={openFlagCreate}
                onEdit={openFlagEdit}
              />
            </div>

            <label className="flex items-center gap-3 bg-[#eeebe3] rounded-xl p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.autoCompleteOnSubtasks}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    autoCompleteOnSubtasks: e.target.checked,
                  }))
                }
                className="w-4 h-4 rounded accent-[#69D2A6]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-[#171e19]">
                  Auto-complete when all sub-tasks are done
                </div>
                <div className="text-[11px] text-[#b7c6c2] mt-0.5">
                  Triggers the "Who did it?" popup automatically
                </div>
              </div>
            </label>

            {editingItem ? (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={
                    !form.label.trim() ||
                    form.points === "" ||
                    !Number.isFinite(Number(form.points)) ||
                    Number(form.points) < 0
                  }
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={
                  !form.label.trim() ||
                  form.points === "" ||
                  !Number.isFinite(Number(form.points)) ||
                  Number(form.points) < 0
                }
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Add Task
              </button>
            )}
          </div>
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
                "{editingItem.label}" and its sub-tasks will be removed
                permanently. This can't be undone.
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

      {/* User picker */}
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
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {/* "We all participated" — only when more than one user */}
              {state.users.length > 1 && (
                <button
                  onClick={async () => {
                    const allIds = state.users.map((u) => u.id);
                    setActivePicker(null);
                    await completeItemForUsers(activePicker.itemId, allIds);
                  }}
                  className="w-full flex items-center gap-3 p-4 rounded-[1.5rem] border-2 border-[#69D2A6]/30 bg-green-50/40 hover:bg-green-50 hover:border-[#69D2A6] transition-all duration-300 active:scale-[0.98] group"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm bg-[#69D2A6]/20">
                    <Users className="text-[#69D2A6]" size={22} />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-base font-medium text-[#171e19] block">
                      We all participated
                    </span>
                    <span className="text-[11px] font-medium text-[#b7c6c2]">
                      Award to everyone
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[#69D2A6] bg-green-50 px-2.5 py-1 rounded-full group-hover:bg-[#69D2A6] group-hover:text-white transition-all">
                    +
                    {(() => {
                      const item = state.checklistItems.find(
                        (i) => i.id === activePicker.itemId,
                      );
                      return (item?.points ?? 5) * state.users.length;
                    })()}{" "}
                    pts
                  </span>
                </button>
              )}

              {state.users.map((u) => {
                const item = state.checklistItems.find(
                  (i) => i.id === activePicker.itemId,
                );
                const points = item?.points ?? 5;
                return (
                  <button
                    key={u.id}
                    onClick={async () => {
                      const id = activePicker.itemId;
                      setActivePicker(null);
                      await completeItemForUsers(id, [u.id]);
                    }}
                    className="w-full flex items-center gap-3 p-4 rounded-[1.5rem] border border-[#b7c6c2]/20 bg-white hover:bg-green-50/40 hover:border-[#69D2A6]/30 transition-all duration-300 active:scale-[0.98] group"
                  >
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-lg shadow-sm"
                      style={{ backgroundColor: u.color + "30" }}
                    >
                      {u.emoji}
                    </div>
                    <span className="text-base font-medium text-[#171e19]">
                      {u.name}
                    </span>
                    <span className="ml-auto text-sm font-medium text-[#69D2A6] bg-green-50 px-2.5 py-1 rounded-full group-hover:bg-[#69D2A6] group-hover:text-white transition-all">
                      +{points} pts
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Animated + points celebration */}
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

      {/* Flag manager dialog */}
      {flagManagerOpen && (
        <div
          className="fixed inset-0 z-[55] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={closeFlagManager}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 animate-slide-up max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#171e19]">
                {editingFlag ? "Edit Flag" : "New Flag"}
              </h3>
              <button
                onClick={closeFlagManager}
                className="p-2 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] hover:bg-[#b7c6c2]/30 transition-all active:scale-90"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="section-header block mb-2">Name</label>
                <Input
                  value={flagForm.name}
                  onChange={(e) =>
                    setFlagForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Urgent"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#69D2A6] focus:ring-[#69D2A6]"
                />
              </div>
              <div>
                <label className="section-header block mb-2">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    "#ca0013",
                    "#3B82F6",
                    "#10B981",
                    "#FBBF24",
                    "#A78BFA",
                    "#F472B6",
                    "#FDA172",
                    "#171e19",
                  ].map((c) => (
                    <button
                      key={c}
                      onClick={() => setFlagForm((f) => ({ ...f, color: c }))}
                      aria-label={`Pick color ${c}`}
                      className={`w-8 h-8 rounded-full border-2 transition-all active:scale-90 ${
                        flagForm.color === c
                          ? "border-[#171e19] scale-110"
                          : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={flagForm.color}
                    onChange={(e) =>
                      setFlagForm((f) => ({ ...f, color: e.target.value }))
                    }
                    className="w-8 h-8 rounded-full cursor-pointer bg-transparent"
                    aria-label="Custom color"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                {editingFlag && (
                  <button
                    onClick={() => setFlagDeleteConfirm(editingFlag)}
                    className="py-3 px-4 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
                <button
                  onClick={handleFlagSubmit}
                  disabled={!flagForm.name.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  {editingFlag ? "Save" : "Add Flag"}
                </button>
              </div>
            </div>

            {state.taskFlags.length > 0 && (
              <div className="mt-6 pt-5 border-t border-[#b7c6c2]/20">
                <h4 className="section-header mb-3">Existing flags</h4>
                <div className="space-y-2">
                  {state.taskFlags.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#eeebe3]/50"
                    >
                      <div
                        className="w-7 h-7 rounded-full shrink-0"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="flex-1 text-sm font-medium text-[#171e19]">
                        {f.name}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openFlagEdit(f)}
                            aria-label={`Edit ${f.name}`}
                            className="p-2 rounded-full text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-all active:scale-90"
                          >
                            <Pencil size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Edit flag
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setFlagDeleteConfirm(f)}
                            aria-label={`Delete ${f.name}`}
                            className="p-2 rounded-full text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Delete flag
                        </TooltipContent>
                      </Tooltip>
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
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setFlagDeleteConfirm(null)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
                style={{ backgroundColor: flagDeleteConfirm.color + "20" }}
              >
                <Flag
                  className="text-[#171e19]"
                  size={28}
                  fill={flagDeleteConfirm.color}
                  strokeWidth={0}
                />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Delete this flag?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{flagDeleteConfirm.name}" will be removed and unlinked from
                any tasks using it. This can't be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setFlagDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await removeFlag(flagDeleteConfirm.id);
                  // If the flag being deleted is currently being edited in
                  // the form, clear it.
                  if (editingFlag?.id === flagDeleteConfirm.id) {
                    setEditingFlag(null);
                    setFlagForm({ name: "", color: "#ca0013" });
                    closeFlagManager();
                  }
                  // Also clear from any open form selection.
                  setForm((f) =>
                    f.flagId === flagDeleteConfirm.id
                      ? { ...f, flagId: "" }
                      : f,
                  );
                  setFlagDeleteConfirm(null);
                }}
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

// ── Flag selector dropdown ────────────────────────────────────────────
function FlagSelector({
  flags,
  value,
  onChange,
  onCreate,
  onEdit,
}: {
  flags: TaskFlag[];
  value: string;
  onChange: (id: string) => void;
  onCreate: () => void;
  onEdit: (flag: TaskFlag) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = flags.find((f) => f.id === value);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Position the portal dropdown directly under the trigger, synced on
  // open + scroll/resize so it never drifts away.
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const trigger = triggerRef.current;
    if (!list || !trigger) return;

    const apply = () => {
      const rect = trigger.getBoundingClientRect();
      list.style.position = "fixed";
      list.style.top = `${rect.bottom + 6}px`;
      list.style.left = `${rect.left}px`;
      list.style.width = `${rect.width}px`;
      list.style.zIndex = "300";
    };

    apply();
    window.addEventListener("scroll", apply, true);
    window.addEventListener("resize", apply, true);
    return () => {
      window.removeEventListener("scroll", apply, true);
      window.removeEventListener("resize", apply, true);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3.5 h-11 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 hover:border-[#69D2A6]/30 transition-all"
      >
        {selected ? (
          <>
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: selected.color }}
            />
            <span className="flex-1 text-left text-sm font-medium text-[#171e19]">
              {selected.name}
            </span>
          </>
        ) : (
          <>
            <Flag size={14} className="text-[#b7c6c2] shrink-0" />
            <span className="flex-1 text-left text-sm font-medium text-[#b7c6c2]">
              No flag
            </span>
          </>
        )}
        <ChevronDown
          size={14}
          className={`text-[#b7c6c2] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop overlay */}
            <div
              className="fixed inset-0 z-[299]"
              onClick={() => setOpen(false)}
            />
            {/* Dropdown list */}
            <div
              ref={listRef}
              className="bg-white rounded-[1.25rem] border border-[#b7c6c2]/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.18)] p-1.5 max-h-60 overflow-y-auto animate-fade-in-up"
            >
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  !value
                    ? "bg-[#eeebe3] text-[#171e19]"
                    : "text-[#171e19] hover:bg-[#eeebe3]"
                }`}
              >
                <span className="w-3 h-3 rounded-full border border-[#b7c6c2]/40" />
                <span className="flex-1 text-left">No flag</span>
              </button>
              {flags.map((f) => (
                <div
                  key={f.id}
                  className={`flex items-center gap-1 rounded-xl transition-colors ${
                    value === f.id ? "bg-[#eeebe3]" : "hover:bg-[#eeebe3]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(f.id);
                      setOpen(false);
                    }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#171e19] text-left"
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: f.color }}
                    />
                    <span className="flex-1">{f.name}</span>
                  </button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpen(false);
                          onEdit(f);
                        }}
                        aria-label={`Edit ${f.name}`}
                        className="p-1.5 rounded-lg text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-colors active:scale-90"
                      >
                        <Pencil size={12} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="left"
                      className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                    >
                      Edit {f.name}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ))}
              <div className="border-t border-[#b7c6c2]/20 mt-1 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    onCreate();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#69D2A6] hover:bg-green-50 transition-colors"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span className="flex-1 text-left">Add a flag</span>
                </button>
              </div>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}

export default LongTermChecklistPage;
