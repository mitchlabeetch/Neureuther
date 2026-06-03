import { BottomNav } from "@/components/BottomNav";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LongTermChecklistPage() {
  const navigate = useNavigate();

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
            <CalendarDays className="text-cantaloupe" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#171e19] tracking-tight">
              Long-term Checklist
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              Track goals and recurring tasks
            </p>
          </div>
        </div>
      </div>

      {/* Placeholder */}
      <div className="px-5 flex-1 flex flex-col items-center justify-center text-center py-16 mb-16">
        <div className="w-20 h-20 rounded-full bg-[#eeebe3] flex items-center justify-center mb-4">
          <CalendarDays className="text-[#b7c6c2]" size={32} />
        </div>
        <h2 className="text-lg font-semibold text-[#171e19] mb-1">
          Coming Soon
        </h2>
        <p className="text-sm text-[#b7c6c2] max-w-[240px]">
          Organize weekly, monthly, and custom recurring tasks here.
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
