import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  Trash2,
  Flag,
  Palette,
  Clock,
  ChevronRight,
  Shuffle,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";
import type { PersonalChecklist } from "@/lib/store";

const BG_COLORS = [
  "#ffffff", "#fff8e1", "#e8f5e9", "#e3f2fd", "#fce4ec",
  "#f3e5f5", "#fff3e0", "#e0f2f1", "#ede7f6", "#fbe9e7",
  "#f1f8e9", "#e8eaf6", "#fef9e7", "#eef2f7",
];

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

interface ChecklistFormState {
  name: string;
  bgColor: string;
  flagId: string;
  deadline: string;
}

const EMPTY_FORM: ChecklistFormState = {
  name: "",
  bgColor: "#ffffff",
  flagId: "",
  deadline: "",
};

export default function RandomChecklistPage() {
  const navigate = useNavigate();
  const {
    state,
    addPersonalChecklist,
    updatePersonalChecklist,
    addFlag,
    updateFlag,
    removeFlag,
    getFlagById,
  } = useApp();

  const randomChecklists = useMemo(
    () =>
      state.personalChecklists.filter(
        (c) => c.kind === "random" && !c.archived,
      ),
    [state.personalChecklists],
  );

  // ── Create / edit dialog ──
  const [showDialog, setShowDialog] = useState(false);
  const [editingChecklist, setEditingChecklist] = useState<PersonalChecklist | null>(null);
  const [form, setForm] = useState<ChecklistFormState>(EMPTY_FORM);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Flag manager dialog ──
  const [flagManagerOpen, setFlagManagerOpen] = useState(false);
  const [editingFlag, setEditingFlag] = useState<{ id: string; name: string; color: string } | null>(null);
  const [flagForm, setFlagForm] = useState({ name: "", color: "#ca0013" });
  const [flagDeleteConfirm, setFlagDeleteConfirm] = useState<{ id: string; name: string; color: string } | null>(null);

  const openCreate = useCallback(() => {
    setEditingChecklist(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  }, []);

  const openEdit = useCallback((cl: PersonalChecklist) => {
    setEditingChecklist(cl);
    setForm({
      name: cl.name,
      bgColor: cl.bgColor,
      flagId: cl.flagId ?? "",
      deadline: toLocalInput(cl.deadline),
    });
    setShowDeleteConfirm(false);
    setShowDialog(true);
  }, []);

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setEditingChecklist(null);
    setShowDeleteConfirm(false);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    const userId = state.users[0]?.id;
    if (!userId) return;
    const deadline = fromLocalInput(form.deadline);
    const flagId = form.flagId || null;

    if (editingChecklist) {
      await updatePersonalChecklist(editingChecklist.id, {
        name: form.name.trim(),
        bgColor: form.bgColor,
        flagId,
        deadline,
      });
    } else {
      await addPersonalChecklist({
        userId,
        kind: "random",
        name: form.name.trim(),
        bgColor: form.bgColor,
        flagId,
        deadline,
      });
    }
    closeDialog();
  }, [form, state.users, editingChecklist, addPersonalChecklist, updatePersonalChecklist, closeDialog]);

  const handleDelete = useCallback(async () => {
    if (!editingChecklist) return;
    await updatePersonalChecklist(editingChecklist.id, { archived: true });
    setShowDeleteConfirm(false);
    closeDialog();
  }, [editingChecklist, updatePersonalChecklist, closeDialog]);

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
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-pink-50 flex items-center justify-center">
            <Shuffle className="text-[#F472B6]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              Random Checklists
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              {randomChecklists.length} {randomChecklists.length === 1 ? "checklist" : "checklists"} · quick everyday quests
            </p>
          </div>
        </div>
      </div>

      {/* Checklist grid */}
      <div className="px-5 mb-3">
        <div className="grid grid-cols-1 gap-3 mb-3">
          {randomChecklists.map((cl) => {
            const flag = getFlagById(cl.flagId);
            const deadline = describeDeadline(cl.deadline);
            const pct = cl.totalTasks > 0 ? Math.round((cl.doneTasks / cl.totalTasks) * 100) : 0;

            return (
              <div
                key={cl.id}
                className="rounded-[1.5rem] border border-[#b7c6c2]/20 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 active:scale-[0.98] group cursor-pointer"
                style={{
                  backgroundColor: cl.bgColor,
                  boxShadow: flag ? `0 0 0 2px ${flag.color}30, 0 4px 20px -4px rgba(0,0,0,0.04)` : undefined,
                }}
                onClick={() => navigate(`/checklist/random/${cl.id}`)}
              >
                {flag && (
                  <div className="px-4 pt-2.5 pb-0 flex items-center gap-1.5" style={{ color: flag.color }}>
                    <Flag size={11} fill={flag.color} strokeWidth={0} />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">{flag.name}</span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-[#171e19] truncate">{cl.name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                        {!deadline && cl.totalTasks > 0 && (
                          <span className="text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2]">
                            No deadline
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(cl); }}
                            className="p-2 rounded-full bg-white/60 text-[#95a5a0] hover:text-[#F472B6] hover:bg-pink-50 transition-all active:scale-90"
                            aria-label="Edit checklist"
                          >
                            <Pencil size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChecklist(cl);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 rounded-full bg-white/60 text-[#95a5a0] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"
                            aria-label="Delete checklist"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                          Delete
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {cl.totalTasks > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-[#b7c6c2]/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#F472B6] transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#b7c6c2] shrink-0">
                        {cl.doneTasks}/{cl.totalTasks}
                      </span>
                    </div>
                  )}

                  {cl.totalTasks === 0 && (
                    <p className="text-xs text-[#b7c6c2] mt-2">No tasks yet — tap to add some</p>
                  )}

                  <div className="flex justify-end mt-2">
                    <ChevronRight size={16} className="text-[#b7c6c2] group-hover:text-[#171e19] transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}

          {randomChecklists.length === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4 mx-auto">
                <Shuffle className="text-[#b7c6c2]" size={32} />
              </div>
              <h2 className="text-lg font-semibold text-[#171e19] mb-1">No random checklists yet</h2>
              <p className="text-sm text-[#b7c6c2] max-w-[260px] mx-auto">
                Create your first random checklist — quick everyday quest lists for the whole household.
              </p>
            </div>
          )}
        </div>

        {/* Add new checklist button */}
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-[#F472B6] flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>New random checklist</span>
        </button>
      </div>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingChecklist ? "Edit Checklist" : "New Random Checklist"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Weekend Chores"
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <div>
              <label className="section-header block mb-2">
                <Palette size={12} className="inline mr-1" /> Background Color
              </label>
              <div className="flex flex-wrap gap-2">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, bgColor: c }))}
                    className={`w-9 h-9 rounded-xl border-2 transition-all active:scale-90 ${form.bgColor === c ? "border-[#171e19] scale-110 shadow-md" : "border-[#b7c6c2]/20"}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  >
                    {form.bgColor === c && <Check size={14} className="text-[#F472B6] mx-auto" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="section-header block mb-2">
                <Flag size={12} className="inline mr-1" /> Flag (optional)
              </label>
              <FlagSelector
                flags={state.taskFlags}
                value={form.flagId}
                onChange={(id) => setForm((f) => ({ ...f, flagId: id }))}
                onCreate={openFlagCreate}
                onEdit={openFlagEdit}
              />
            </div>

            <div>
              <label className="section-header block mb-2">Deadline (optional)</label>
              <Input
                type="datetime-local"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6] text-sm"
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

            {editingChecklist ? (
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-3 rounded-xl font-semibold text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} /> Delete
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!form.name.trim()}
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!form.name.trim()}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Create Checklist
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      {showDeleteConfirm && editingChecklist && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#eeebe3] flex items-center justify-center mb-3">
                <Trash2 className="text-[#171e19]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Move to Archive?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{editingChecklist.name}" will be moved to the Archive, where you can delete it permanently or reuse it.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Yes, move to Archive
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Flag manager dialog ── */}
      {flagManagerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={closeFlagManager}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 pb-32 animate-slide-up max-h-[80vh] overflow-y-auto"
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
                  onChange={(e) => setFlagForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Urgent"
                  className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#F472B6] focus:ring-[#F472B6]"
                />
              </div>
              <div>
                <label className="section-header block mb-2">Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {FLAG_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setFlagForm((f) => ({ ...f, color: c }))}
                      aria-label={`Pick color ${c}`}
                      className={`w-8 h-8 rounded-full border-2 transition-all active:scale-90 ${flagForm.color === c ? "border-[#171e19] scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={flagForm.color}
                    onChange={(e) => setFlagForm((f) => ({ ...f, color: e.target.value }))}
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
                    <div key={f.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-[#eeebe3]/50">
                      <div className="w-7 h-7 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                      <span className="flex-1 text-sm font-medium text-[#171e19]">{f.name}</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => openFlagEdit(f)}
                            className="p-2 rounded-full text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-all active:scale-90"
                          >
                            <Pencil size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setFlagDeleteConfirm(f)}
                            className="p-2 rounded-full text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90"
                          >
                            <Trash2 size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                          Delete
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
          <div className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: flagDeleteConfirm.color + "20" }}>
                <Flag className="text-[#171e19]" size={28} fill={flagDeleteConfirm.color} strokeWidth={0} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">Delete this flag?</h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{flagDeleteConfirm.name}" will be removed and unlinked from any items using it.
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
                  if (editingFlag?.id === flagDeleteConfirm.id) {
                    setEditingFlag(null);
                    setFlagForm({ name: "", color: "#ca0013" });
                    closeFlagManager();
                  }
                  setForm((f) =>
                    f.flagId === flagDeleteConfirm.id ? { ...f, flagId: "" } : f,
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

// ── Flag selector dropdown ──
function FlagSelector({
  flags,
  value,
  onChange,
  onCreate,
  onEdit,
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
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${!value ? "bg-[#eeebe3] text-[#171e19]" : "text-[#171e19] hover:bg-[#eeebe3]"}`}
          >
            <span className="w-3 h-3 rounded-full border border-[#b7c6c2]/40" />
            <span className="flex-1 text-left">No flag</span>
          </button>
          {flags.map((f) => (
            <div key={f.id} className={`flex items-center gap-1 rounded-xl transition-colors ${value === f.id ? "bg-[#eeebe3]" : "hover:bg-[#eeebe3]"}`}>
              <button
                type="button"
                onClick={() => { onChange(f.id); setOpen(false); }}
                className="flex-1 flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#171e19] text-left"
              >
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: f.color }} />
                <span className="flex-1">{f.name}</span>
              </button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit(f); }}
                    className="p-1.5 rounded-lg text-[#b7c6c2] hover:text-[#171e19] hover:bg-white transition-colors active:scale-90"
                  >
                    <Pencil size={12} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
                  Edit {f.name}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
          <div className="border-t border-[#b7c6c2]/20 mt-1 pt-1">
            <button
              type="button"
              onClick={() => { setOpen(false); onCreate(); }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#F472B6] hover:bg-pink-50 transition-colors"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span className="flex-1 text-left">Add a flag</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
