import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Check,
  Plus,
  Pencil,
  X,
  CalendarDays,
  Flag,
  Trash2,
  Palette,
  Clock,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";
import type { PersonalChecklist } from "@/lib/store";

// ── PIN lock helpers ──
const PIN_LOCK_KEY = "personal-checklist-pin-lock";

function getLockUsers(): string[] {
  try {
    const raw = localStorage.getItem(PIN_LOCK_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function isUserLocked(userId: string): boolean {
  return getLockUsers().includes(userId);
}

function setUserLocked(userId: string, locked: boolean) {
  const users = getLockUsers();
  if (locked && !users.includes(userId)) {
    users.push(userId);
  } else if (!locked) {
    const idx = users.indexOf(userId);
    if (idx >= 0) users.splice(idx, 1);
  }
  localStorage.setItem(PIN_LOCK_KEY, JSON.stringify(users));
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  if (!res.ok) throw new Error("Request failed");
  return await res.json() as T;
}

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

export default function PersonalChecklistPage() {
  const navigate = useNavigate();
  const {
    state,
    addPersonalChecklist,
    updatePersonalChecklist,
    removePersonalChecklist,
    addFlag,
    updateFlag,
    removeFlag,
    getFlagById,
  } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // ── PIN lock state ──
  const [pinLocked, setPinLocked] = useState(false);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [pinError, setPinError] = useState("");
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (selectedUserId) {
      setPinLocked(isUserLocked(selectedUserId));
    }
  }, [selectedUserId]);

  const userChecklists = useMemo(
    () =>
      selectedUserId
        ? state.personalChecklists.filter((c) => c.userId === selectedUserId && !c.archived)
        : [],
    [state.personalChecklists, selectedUserId],
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
    if (!form.name.trim() || !selectedUserId) return;
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
        userId: selectedUserId,
        name: form.name.trim(),
        bgColor: form.bgColor,
        flagId,
        deadline,
        kind: "personal",
      });
    }
    closeDialog();
  }, [form, selectedUserId, editingChecklist, addPersonalChecklist, updatePersonalChecklist, closeDialog]);

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

  // ── PIN lock helpers ──
  const handleSelectUser = useCallback((userId: string) => {
    setSelectedUserId(userId);
    setPinLocked(isUserLocked(userId));
    if (isUserLocked(userId)) {
      setPin("");
      setPinConfirm("");
      setPinError("");
      setIsFirstTime(false);
      setShowPinEntry(true);
    } else {
      setShowPinEntry(false);
    }
  }, []);

  const handlePinSubmit = useCallback(async () => {
    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setPinError("Enter a 4-digit PIN");
      return;
    }
    if (isFirstTime && pinConfirm !== pin) {
      setPinError("PINs do not match");
      return;
    }
    setVerifying(true);
    try {
      const result = await api<{ action: string; valid: boolean }>("/api/money/personal/verify-pin", {
        method: "POST",
        body: JSON.stringify({ userId: selectedUserId, pin }),
      });
      if (result.action === "set" || result.valid) {
        setPin("");
        setPinConfirm("");
        setPinError("");
        setIsFirstTime(false);
        setShowPinEntry(false);
      } else {
        setPinError("Wrong PIN. Try again.");
        setPin("");
      }
    } catch {
      setPinError("Something went wrong");
      setPin("");
    }
    setVerifying(false);
  }, [pin, pinConfirm, isFirstTime, selectedUserId]);

  const togglePinLock = useCallback(() => {
    if (!selectedUserId) return;
    const newLocked = !pinLocked;
    if (newLocked) {
      // Enabling lock — check if user has a pin
      setUserLocked(selectedUserId, true);
      setPinLocked(true);
    } else {
      setUserLocked(selectedUserId, false);
      setPinLocked(false);
    }
  }, [selectedUserId, pinLocked]);

  // ── If no user selected: show user picker ──
  if (!selectedUserId) {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 animate-fade-in-up">
          <button
            onClick={() => navigate("/checklist")}
            className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
          >
            <ChevronRight size={16} className="rotate-180" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[1.25rem] bg-[#FFF1E6] flex items-center justify-center">
              <CalendarDays className="text-[#daa520]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
                Personal Checklists
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
                Choose your space
              </p>
            </div>
          </div>
        </div>

        {/* Big user button menu */}
        <div className="px-5 flex-1 flex flex-col items-center justify-center py-8 mb-16">
          {state.users.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4 mx-auto">
                <CalendarDays className="text-[#b7c6c2]" size={32} />
              </div>
              <h2 className="text-lg font-semibold text-[#171e19] mb-1">No users yet</h2>
              <p className="text-sm text-[#b7c6c2] max-w-[240px] mx-auto">
                Add users in Settings first to create personal checklists.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-md space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-[#b7c6c2] text-center mb-4">
                Who are you?
              </p>
              {state.users.map((u) => {
                const count = state.personalChecklists.filter((c) => c.userId === u.id && !c.archived).length;
                const locked = isUserLocked(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u.id)}
                    className="w-full flex items-center gap-4 p-5 rounded-[1.5rem] bg-white border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] transition-all duration-300 active:scale-[0.98] group"
                  >
                    <div
                      className="w-14 h-14 rounded-[1.25rem] flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110"
                      style={{ backgroundColor: u.color + "20" }}
                    >
                      {u.emoji}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="text-lg font-semibold text-[#171e19] block">{u.name}</span>
                      <span className="text-xs text-[#b7c6c2] font-medium">
                        {count} {count === 1 ? "checklist" : "checklists"}
                      </span>
                    </div>
                    {locked && <Lock size={18} className="text-[#b7c6c2]" />}
                    <ChevronRight size={20} className="text-[#b7c6c2] group-hover:text-[#171e19] transition-colors" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  // ── PIN Entry Screen ──
  if (showPinEntry) {
    const user = state.users.find((u) => u.id === selectedUserId)!;
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 flex flex-col items-center animate-fade-in-up">
          <button
            onClick={() => { setSelectedUserId(null); setShowPinEntry(false); setPin(""); setPinConfirm(""); setPinError(""); setIsFirstTime(false); }}
            className="self-start flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-6"
          >
            <ChevronRight size={16} className="rotate-180" /> All users
          </button>
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-3xl mb-4"
            style={{ backgroundColor: user.color + "20" }}
          >
            {user.emoji}
          </div>
          <h2 className="text-xl font-semibold text-[#171e19] mb-1">{user.name}'s Space</h2>
          {isFirstTime ? (
            <>
              <p className="text-sm text-[#b7c6c2] font-medium mb-1">
                {pin.length === 0 ? "First time! Set a 4-digit PIN" : "Confirm your PIN"}
              </p>
              {pin.length === 4 && (
                <p className="text-xs text-[#b7c6c2] font-medium mb-4">Re-enter to confirm</p>
              )}
            </>
          ) : (
            <p className="text-sm text-[#b7c6c2] font-medium mb-6">Enter your PIN</p>
          )}

          {/* PIN dots */}
          <div className="flex gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => {
              const filled = isFirstTime && pin.length === 4
                ? i < pinConfirm.length
                : i < pin.length;
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    filled ? "bg-[#171e19] scale-110" : "bg-[#b7c6c2]/30"
                  }`}
                />
              );
            })}
          </div>

          {pinError && <p className="text-sm text-[#ca0013] font-medium mb-4">{pinError}</p>}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 max-w-[240px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => {
                  if (isFirstTime && pin.length === 4) {
                    if (pinConfirm.length < 4) setPinConfirm(prev => prev + n);
                  } else {
                    if (pin.length < 4) setPin(prev => prev + n);
                  }
                  setPinError("");
                }}
                className="w-16 h-16 rounded-2xl bg-white border border-[#b7c6c2]/20 text-xl font-semibold text-[#171e19] hover:bg-[#eeebe3] transition-all active:scale-95"
              >
                {n}
              </button>
            ))}
            <div />
            <button
              onClick={() => {
                if (isFirstTime && pin.length === 4) setPinConfirm(prev => prev.slice(0, -1));
                else if (pin.length > 0) setPin(prev => prev.slice(0, -1));
                setPinError("");
              }}
              className="w-16 h-16 rounded-2xl bg-white border border-[#b7c6c2]/20 flex items-center justify-center text-[#b7c6c2] hover:bg-red-50 hover:text-[#ca0013] transition-all active:scale-95"
            >
              <X size={20} />
            </button>
            <button
              key={0}
              onClick={() => {
                if (isFirstTime && pin.length === 4) {
                  if (pinConfirm.length < 4) setPinConfirm(prev => prev + '0');
                } else {
                  if (pin.length < 4) setPin(prev => prev + '0');
                }
                setPinError("");
              }}
              className="w-16 h-16 rounded-2xl bg-white border border-[#b7c6c2]/20 text-xl font-semibold text-[#171e19] hover:bg-[#eeebe3] transition-all active:scale-95"
            >
              0
            </button>
          </div>

          <button
            onClick={handlePinSubmit}
            disabled={verifying || (isFirstTime ? (pin.length !== 4 || pinConfirm.length !== 4) : pin.length !== 4)}
            className="mt-6 w-full max-w-[240px] py-3.5 rounded-2xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
          >
            {verifying ? "Verifying…" : isFirstTime ? "Set PIN" : "Unlock"}
          </button>

          {!isFirstTime && (
            <button
              onClick={() => { setIsFirstTime(true); setPin(""); setPinConfirm(""); setPinError(""); }}
              className="mt-3 text-xs text-[#b7c6c2] underline"
            >
              First time? Set PIN
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── User is selected: show dashboard ──
  const user = state.users.find((u) => u.id === selectedUserId)!;

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => setSelectedUserId(null)}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> All users
        </button>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center text-2xl"
            style={{ backgroundColor: user.color + "20" }}
          >
            {user.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              {user.name}'s Space
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              {userChecklists.length} {userChecklists.length === 1 ? "checklist" : "checklists"} · no points here
            </p>
          </div>
          {/* PIN lock toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={togglePinLock}
                className={`p-2.5 rounded-full transition-all active:scale-90 ${
                  pinLocked
                    ? "bg-[#171e19] text-white"
                    : "bg-[#eeebe3] text-[#b7c6c2] hover:text-[#171e19]"
                }`}
                aria-label={pinLocked ? "Unlock space (disable PIN)" : "Lock space with PIN"}
              >
                {pinLocked ? <Lock size={18} /> : <Unlock size={18} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg">
              {pinLocked ? "PIN lock on — tap to disable" : "Tap to lock with your PIN"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Checklist grid */}
      <div className="px-5 mb-3">
        <div className="grid grid-cols-1 gap-3 mb-3">
          {userChecklists.map((cl) => {
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
                onClick={() => navigate(`/checklist/personal/${cl.id}`)}
              >
                {/* Flag strip */}
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

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(cl); }}
                            className="p-2 rounded-full bg-white/60 text-[#95a5a0] hover:text-[#171e19] hover:bg-white transition-all active:scale-90"
                            aria-label="Edit checklist"
                          >
                            <Pencil size={14} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
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
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Delete
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Progress */}
                  {cl.totalTasks > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-2 rounded-full bg-[#b7c6c2]/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#10B981] transition-all duration-500"
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

                  {/* Open chevron */}
                  <div className="flex justify-end mt-2">
                    <ChevronRight size={16} className="text-[#b7c6c2] group-hover:text-[#171e19] transition-colors" />
                  </div>
                </div>
              </div>
            );
          })}

          {userChecklists.length === 0 && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4 mx-auto">
                <CalendarDays className="text-[#b7c6c2]" size={32} />
              </div>
              <h2 className="text-lg font-semibold text-[#171e19] mb-1">No checklists yet</h2>
              <p className="text-sm text-[#b7c6c2] max-w-[260px] mx-auto">
                Create your first personal checklist. Tasks here don't award points — it's your private space.
              </p>
            </div>
          )}
        </div>

        {/* Add new checklist button */}
        <button
          onClick={openCreate}
          className="w-full flex items-center justify-center gap-2.5 rounded-[1.5rem] p-4 bg-[#171e19] text-white font-semibold hover:bg-[#2a302b] transition-all active:scale-[0.98] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.25)]"
        >
          <div className="w-8 h-8 rounded-full bg-[#ca0013] flex items-center justify-center">
            <Plus size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span>New checklist</span>
        </button>
      </div>

      {/* ── Create / Edit dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="rounded-[2rem] max-w-[420px] mx-auto p-0 gap-0 border-[#b7c6c2]/20 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              {editingChecklist ? "Edit Checklist" : "New Checklist"}
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Morning Routine"
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#10B981] focus:ring-[#10B981]"
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
                    {form.bgColor === c && <Check size={14} className="text-[#10B981] mx-auto" />}
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
                className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#10B981] focus:ring-[#10B981] text-sm"
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

      {/* Delete confirmation — asks if willing to "share" by archiving */}
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
                "{editingChecklist.name}" will be moved to the shared Archive. This means others in the household will be able to see and reuse it. Are you okay with sharing it?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Yes, move to shared Archive
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
                  className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#10B981] focus:ring-[#10B981]"
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

// ── Flag selector dropdown (same pattern as LongTermChecklist) ──
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
        className="w-full flex items-center gap-2 px-3.5 h-11 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 hover:border-[#10B981]/30 transition-all"
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
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-[#10B981] hover:bg-green-50 transition-colors"
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