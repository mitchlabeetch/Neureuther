import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { PageHeader } from "@/components/PageHeader";
import {
  Archive as ArchiveIcon,
  ChevronRight,
  Trash2,
  RotateCcw,
  Inbox,
  Flag,
  Star,
  ListTree,
  Check,
  CalendarDays,
  User,
  ListChecks,
  Shuffle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";

type ArchiveTab = "tasks" | "checklists";

export default function ChecklistArchivePage() {
  const {
    state,
    removeChecklistItem,
    updateChecklistItem,
    removePersonalChecklist,
    updatePersonalChecklist,
    getUserById,
    getFlagById,
  } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<ArchiveTab>("tasks");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  // Archived checklist items (daily, long_term, random)
  const archivedItems = useMemo(
    () =>
      state.checklistItems
        .filter((i) => i.archived)
        .sort((a, b) => {
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        }),
    [state.checklistItems],
  );

  // Archived personal checklists
  const archivedChecklists = useMemo(
    () => state.personalChecklists.filter((c) => c.archived),
    [state.personalChecklists],
  );

  const itemToDelete = archivedItems.find((i) => i.id === deleteId) ||
    (tab === "checklists"
      ? null
      : null);
  const clToDelete = archivedChecklists.find((c) => c.id === deleteId);

  const itemToRestore = archivedItems.find((i) => i.id === restoreId);

  const kindLabel = (kind: string) => {
    if (kind === "daily") return "Daily";
    if (kind === "long_term") return "Long-term";
    if (kind === "random") return "Random";
    return kind;
  };
  const kindColor = (kind: string) => {
    if (kind === "daily") return "#FDA172";
    if (kind === "long_term") return "#69D2A6";
    if (kind === "random") return "#F472B6";
    return "#b7c6c2";
  };
  const kindIcon = (kind: string) => {
    if (kind === "daily") return ListChecks;
    if (kind === "long_term") return CalendarDays;
    if (kind === "random") return Shuffle;
    return ListChecks;
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <PageHeader
        title="Checklist Archive"
        subtitle="Restore or permanently delete"
        backTo="/checklists"
        backLabel="All checklists"
        icon={<div className="w-12 h-12 rounded-[1.25rem] bg-[#eeebe3] flex items-center justify-center"><ArchiveIcon className="text-[#171e19]" size={24} /></div>}
      />

      {/* Tab switcher */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 bg-white rounded-[1.25rem] p-1.5 border border-[#b7c6c2]/20">
          <button
            onClick={() => setTab("tasks")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "tasks"
                ? "bg-[#171e19] text-white"
                : "text-[#b7c6c2] hover:text-[#171e19]"
            }`}
          >
            Tasks ({archivedItems.length})
          </button>
          <button
            onClick={() => setTab("checklists")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === "checklists"
                ? "bg-[#171e19] text-white"
                : "text-[#b7c6c2] hover:text-[#171e19]"
            }`}
          >
            Checklists ({archivedChecklists.length})
          </button>
        </div>
      </div>

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div className="px-5 space-y-2.5 mb-16">
          {archivedItems.length === 0 && (
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4">
                <Inbox className="text-[#b7c6c2]" size={32} />
              </div>
              <h2 className="text-lg font-semibold text-[#171e19] mb-1">
                Archive is empty
              </h2>
              <p className="text-sm text-[#b7c6c2] max-w-[240px]">
                Deleted or completed tasks will appear here.
              </p>
            </div>
          )}

          {archivedItems.map((item, index) => {
            const completedBy = item.completedBy
              ? getUserById(item.completedBy)
              : null;
            const flag = getFlagById(item.flagId);
            const KindIcon = kindIcon(item.kind);
            const completedAt = item.completedAt
              ? new Date(item.completedAt)
              : null;

            return (
              <div
                key={item.id}
                className="rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 bg-white/70"
                style={{
                  animationDelay: `${index * 40}ms`,
                  boxShadow: flag
                    ? `0 0 0 2px ${flag.color}20`
                    : undefined,
                }}
              >
                {flag && (
                  <div
                    className="flex items-center gap-1.5 mb-1.5"
                    style={{ color: flag.color }}
                  >
                    <Flag size={11} fill={flag.color} strokeWidth={0} />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em]">
                      {flag.name}
                    </span>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#b7c6c2] line-through">
                      {item.label}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2]">
                      {/* Kind badge */}
                      <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: kindColor(item.kind) + "15",
                          color: kindColor(item.kind),
                        }}
                      >
                        <KindIcon size={9} />
                        {kindLabel(item.kind)}
                      </span>
                      {completedAt && (
                        <span>
                          {completedAt.toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}
                      {completedBy && (
                        <span className="inline-flex items-center gap-1">
                          · {completedBy.emoji} {completedBy.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {item.kind !== "daily" && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#69D2A6] bg-green-50 px-2 py-0.5 rounded-full">
                      <Star size={10} /> {item.points}
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 mt-3">
                  {(item.kind === "long_term" || item.kind === "daily") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setRestoreId(item.id)}
                          className="px-3 py-1.5 rounded-full bg-[#eeebe3] text-[#b7c6c2] hover:text-[#10B981] hover:bg-green-50 transition-all active:scale-90 flex items-center gap-1.5 text-[11px] font-semibold"
                          aria-label="Restore task"
                        >
                          <RotateCcw size={12} /> Reinstate
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                      >
                        Move back to {kindLabel(item.kind)} checklist
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="px-3 py-1.5 rounded-full bg-[#eeebe3] text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90 flex items-center gap-1.5 text-[11px] font-semibold"
                    aria-label="Delete permanently"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checklists tab */}
      {tab === "checklists" && (
        <div className="px-5 space-y-2.5 mb-16">
          {archivedChecklists.length === 0 && (
            <div className="flex flex-col items-center text-center py-12">
              <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4">
                <Inbox className="text-[#b7c6c2]" size={32} />
              </div>
              <h2 className="text-lg font-semibold text-[#171e19] mb-1">
                No archived checklists
              </h2>
              <p className="text-sm text-[#b7c6c2] max-w-[240px]">
                Completed or deleted checklists will appear here.
              </p>
            </div>
          )}

          {archivedChecklists.map((cl) => {
            const flag = getFlagById(cl.flagId);
            const user = getUserById(cl.userId);
            const pct =
              cl.totalTasks > 0
                ? Math.round((cl.doneTasks / cl.totalTasks) * 100)
                : 0;

            return (
              <div
                key={cl.id}
                className="rounded-[1.5rem] border border-[#b7c6c2]/20 bg-white/70 overflow-hidden"
                style={{
                  backgroundColor: cl.bgColor,
                  boxShadow: flag
                    ? `0 0 0 2px ${flag.color}20`
                    : undefined,
                }}
              >
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
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-semibold text-[#b7c6c2] line-through line-clamp-2 leading-snug">
                        {cl.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2]">
                        {user && (
                          <span className="inline-flex items-center gap-1">
                            {user.emoji} {user.name}
                          </span>
                        )}
                        <span>
                          {cl.doneTasks}/{cl.totalTasks} done
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={async () => {
                            await updatePersonalChecklist(cl.id, {
                              archived: false,
                            });
                          }}
                          className="px-3 py-1.5 rounded-full bg-white/60 text-[#b7c6c2] hover:text-[#10B981] hover:bg-green-50 transition-all active:scale-90 flex items-center gap-1.5 text-[11px] font-semibold"
                          aria-label="Restore checklist"
                        >
                          <RotateCcw size={12} /> Reinstate
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                      >
                        Move back to personal space
                      </TooltipContent>
                    </Tooltip>
                    <button
                      onClick={() => setDeleteId(cl.id)}
                      className="px-3 py-1.5 rounded-full bg-white/60 text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90 flex items-center gap-1.5 text-[11px] font-semibold"
                      aria-label="Delete permanently"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent delete confirmation */}
      {deleteId && (itemToDelete || clToDelete) && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setDeleteId(null)}
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
                Delete permanently?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                {itemToDelete
                  ? `"${itemToDelete.label}" will be removed forever. This can't be undone.`
                  : clToDelete
                  ? `"${clToDelete.name}" and all its tasks will be removed forever. This can't be undone.`
                  : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (itemToDelete) {
                    await removeChecklistItem(itemToDelete.id);
                  } else if (clToDelete) {
                    await removePersonalChecklist(clToDelete.id);
                  }
                  setDeleteId(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore (reinstate) confirmation for tasks */}
      {restoreId && itemToRestore && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => setRestoreId(null)}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                <RotateCcw className="text-[#10B981]" size={28} />
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Reinstate this task?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{itemToRestore.label}" will be moved back to the{" "}
                <strong>{kindLabel(itemToRestore.kind)}</strong> checklist.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRestoreId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await updateChecklistItem(itemToRestore.id, {
                    archived: false,
                    completed: false,
                    completedBy: null,
                    completedAt: null,
                  });
                  setRestoreId(null);
                }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#10B981] hover:bg-[#059669] transition-all active:scale-[0.98]"
              >
                Reinstate
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
