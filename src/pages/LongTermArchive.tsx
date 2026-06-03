import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import {
  Archive,
  ChevronRight,
  Trash2,
  Flag,
  Star,
  ListTree,
  Inbox,
  Users,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { describeDeadline } from "@/lib/deadline";

function LongTermArchivePage() {
  const {
    state,
    removeChecklistItem,
    getUserById,
    getFlagById,
  } = useApp();
  const navigate = useNavigate();

  const archived = useMemo(
    () =>
      state.checklistItems
        .filter((i) => i.kind === "long_term" && i.archived)
        .sort((a, b) => {
          // Most recently completed first
          const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
          const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
          return bTime - aTime;
        }),
    [state.checklistItems],
  );

  const subtasksByTask = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of state.checklistSubtasks) {
      map.set(s.taskId, (map.get(s.taskId) ?? 0) + 1);
    }
    return map;
  }, [state.checklistSubtasks]);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const itemToDelete = archived.find((i) => i.id === deleteId);

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate("/checklist/long-term")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ChevronRight size={16} className="rotate-180" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-[#eeebe3] flex items-center justify-center">
            <Archive className="text-[#171e19]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              Long-term Archive
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              {archived.length} completed {archived.length === 1 ? "task" : "tasks"}
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-5 space-y-2.5 mb-16">
        {archived.length === 0 && (
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4">
              <Inbox className="text-[#b7c6c2]" size={32} />
            </div>
            <h2 className="text-lg font-semibold text-[#171e19] mb-1">
              Archive is empty
            </h2>
            <p className="text-sm text-[#b7c6c2] max-w-[240px]">
              Completed long-term tasks will appear here automatically.
            </p>
          </div>
        )}

        {archived.map((item, index) => {
          const completedBy = item.completedBy
            ? getUserById(item.completedBy)
            : null;
          const flag = getFlagById(item.flagId);
          const subtaskCount = subtasksByTask.get(item.id) ?? 0;
          const completedAt = item.completedAt
            ? new Date(item.completedAt)
            : null;
          const wasOverdue = item.deadline
            ? describeDeadline(item.deadline, completedAt ?? new Date())?.urgency === "overdue"
            : false;

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
                  <div className="text-sm font-medium text-[#171e19] line-through text-[#b7c6c2]">
                    {item.label}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#b7c6c2]">
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
                    {item.deadline && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="inline-flex items-center gap-1"
                            style={{
                              color: wasOverdue ? "#ca0013" : undefined,
                            }}
                          >
                            ·{" "}
                            {new Date(item.deadline).toLocaleDateString(
                              undefined,
                              { day: "2-digit", month: "short" },
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          Deadline:{" "}
                          {new Date(item.deadline).toLocaleString()}
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {subtaskCount > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center gap-1">
                            · <ListTree size={10} /> {subtaskCount}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="rounded-xl bg-[#171e19] text-white border-none text-[11px] font-medium px-2.5 py-1.5 shadow-lg"
                        >
                          {subtaskCount} sub-task
                          {subtaskCount === 1 ? "" : "s"}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>

                <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-[#69D2A6] bg-green-50 px-2 py-0.5 rounded-full">
                  <Star size={10} /> {item.points}
                </span>
              </div>

              <div className="flex justify-end mt-3">
                <button
                  onClick={() => setDeleteId(item.id)}
                  className="px-3 py-1.5 rounded-full bg-[#eeebe3] text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 transition-all active:scale-90 flex items-center gap-1.5 text-[11px] font-semibold"
                  aria-label="Delete archived task"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation */}
      {deleteId && itemToDelete && (
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
                Delete this archived task?
              </h3>
              <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
                "{itemToDelete.label}" and its sub-tasks will be removed
                permanently. This can't be undone.
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
                  await removeChecklistItem(itemToDelete.id);
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

      <BottomNav />
    </div>
  );
}

export default LongTermArchivePage;
