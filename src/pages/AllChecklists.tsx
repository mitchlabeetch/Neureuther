import { BottomNav } from "@/components/BottomNav";
import { LayoutGrid, ArrowLeft, CalendarDays, User, ListChecks, Archive as ArchiveIcon, Shuffle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function AllChecklistsPage() {
  const navigate = useNavigate();

  const checklists = [
    {
      id: "daily",
      label: "Daily Checklist",
      desc: "Evening routine & everyday shared tasks",
      icon: ListChecks,
      path: "/checklist",
      color: "#FDA172",
    },
    {
      id: "longterm",
      label: "Long-term Checklist",
      desc: "To-dos and bigger goals",
      icon: CalendarDays,
      path: "/checklist/long-term",
      color: "#69D2A6",
    },
    {
      id: "personal",
      label: "Personal Checklist",
      desc: "My own private tasks",
      icon: User,
      path: "/checklist/personal",
      color: "#A78BFA",
    },
    {
      id: "random",
      label: "Random Checklist",
      desc: "Habits, rules & quick quests",
      icon: Shuffle,
      path: "/checklist/random",
      color: "#F472B6",
    },
    {
      id: "archive",
      label: "Checklist Archive",
      desc: "Archived tasks & checklists",
      icon: ArchiveIcon,
      path: "/checklist/archive",
      color: "#95a5a0",
    },
  ];

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate("/checklist")}
          className="flex items-center gap-1.5 text-sm font-medium text-[#b7c6c2] hover:text-[#171e19] transition-colors mb-3"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-[1.25rem] bg-[#FFF1E6] flex items-center justify-center">
            <LayoutGrid className="text-cantaloupe" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              All Checklists
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              Browse every checklist
            </p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-5 space-y-3 mb-16">
        {checklists.map((c) => (
          <button
            key={c.id}
            onClick={() => navigate(c.path)}
            className="w-full flex items-center gap-4 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] hover:-translate-y-0.5"
          >
            <div
              className="w-12 h-12 rounded-[1.25rem] flex items-center justify-center shrink-0"
              style={{ backgroundColor: c.color + "20" }}
            >
              <c.icon size={22} style={{ color: c.color }} />
            </div>
            <div className="text-left flex-1">
              <div className="text-sm font-medium text-[#171e19]">{c.label}</div>
              <div className="text-xs text-[#b7c6c2] mt-0.5">{c.desc}</div>
            </div>
            <ArrowLeft size={16} className="text-[#b7c6c2] rotate-180" />
          </button>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
