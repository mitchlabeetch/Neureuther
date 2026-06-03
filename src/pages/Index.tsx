/* Header */
/* Today's progress card */
/* Decorative blob */
/* Quick actions */
/* Stats cards */
/* CTA */
import { useApp } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";

import {
    Disc,
    ListChecks,
    ArrowRight,
    ClipboardList,
    Wallet,
    ChefHat,
    FolderLock,
    Moon,
    IceCream,
    Heart,
    Lightbulb,
    Star,
    Trophy,
    Sparkles,
} from "lucide-react";

import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";

function HomePage() {
    const {
        state,
        getUserById,
        getUserPoints
    } = useApp();

    const navigate = useNavigate();
    const [greeting, setGreeting] = useState("");
    const [progressVal, setProgressVal] = useState(0);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const hour = new Date().getHours();

        if (hour < 12)
            setGreeting("Good morning");
        else if (hour < 18)
            setGreeting("Good afternoon");
        else
            setGreeting("Good evening");

        const dailyItems = state.checklistItems.filter(i => i.kind === "daily" && !i.archived);
        const completed = dailyItems.filter(i => i.completed).length;
        const total = dailyItems.length;
        setProgressVal(total > 0 ? (completed / total) * 100 : 0);
    }, [state.checklistItems]);

    const completedToday = state.checklistItems.filter(i => i.kind === "daily" && !i.archived && i.completed).length;
    const totalToday = state.checklistItems.filter(i => i.kind === "daily" && !i.archived).length;

    const topUser = state.users.map(u => ({
        ...u,
        points: getUserPoints(u.id)
    })).sort((a, b) => b.points - a.points)[0];

    // Frenchie / Widdy habits from the document
    const frenchieDone = state.checklistItems.some(i => i.kind === "random" && !i.archived && i.completed && i.label.includes("Frenchie: Minimum 15 series"));
    const widdyDone = state.checklistItems.some(i => i.kind === "random" && !i.archived && i.completed && i.label.includes("Widdy: Minimum 3 workouts"));

    return (
        <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
            {}
            <div
                className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in-up">
                <div>
                    <p
                        className="text-xs font-extrabold text-[#b7c6c2] uppercase tracking-[0.1em]">
                        {greeting}
                    </p>
                    <h1
                        className="text-[1.875rem] font-semibold text-[#171e19] mt-0.5 tracking-tight leading-tight">Neureuther
                                                                                                                                  </h1>
                </div>
                <div className="flex -space-x-2">
                    {state.users.slice(0, 4).map(u => (<div
                        key={u.id}
                        className="w-11 h-11 rounded-full border-[2.5px] border-white flex items-center justify-center text-lg shadow-sm cursor-default transition-transform hover:scale-110 hover:z-10 relative"
                        style={{
                            backgroundColor: u.color + "30"
                        }}
                        aria-label={`${u.name}: ${getUserPoints(u.id)} pts`}>
                        {u.emoji}
                    </div>))}
                    {state.users.length > 4 && (<div
                        className="w-11 h-11 rounded-full border-[2.5px] border-white bg-[#eeebe3] flex items-center justify-center text-xs font-semibold text-[#b7c6c2] shadow-sm">+{state.users.length - 4}
                    </div>)}
                </div>
            </div>
            {}
            <div className="px-5 mb-5">
                <div
                    className="bg-white rounded-[2.5rem] p-6 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] border border-[#b7c6c2]/20 relative overflow-hidden transition-all hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.1)]">
                    {}
                    <div
                        className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-[#b7c6c2]/10" />
                    <div
                        onClick={() => navigate("/checklist")}
                        className="cursor-pointer relative z-10 active:scale-[0.99] transition-transform">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h3 className="text-lg font-semibold text-[#171e19] tracking-tight">Today's Checklist</h3>
                                <p className="text-sm text-[#b7c6c2] font-medium mt-1">
                                    {completedToday}/{totalToday} done
                                                                                                              </p>
                            </div>
                            <div
                                className="w-16 h-16 rounded-full bg-[#FFF1E6] flex items-center justify-center">
                                <span className="text-xl font-semibold text-cantaloupe">{Math.round(progressVal)}%</span>
                            </div>
                        </div>
                        <Progress
                            value={progressVal}
                            className="h-3 rounded-full bg-[#FFF1E6] [&>div]:bg-cantaloupe [&>div]:rounded-full" />
                    </div>
                    <button
                        onClick={() => navigate("/checklist/long-term")}
                        className="mt-4 w-full flex items-center justify-between px-4 py-2.5 rounded-[1.25rem] bg-[#eeebe3] border border-[#b7c6c2]/20 text-xs font-medium text-[#171e19] transition-all active:scale-[0.99] hover:bg-[#b7c6c2]/15 relative z-10">
                        <span>See long-term checklist</span>
                        <ArrowRight size={14} className="text-[#b7c6c2]" />
                    </button>
                </div>
            </div>

            {/* ── Evening Routine Mini-Card ── */}
            <div className="px-5 mb-5">
                <button
                    onClick={() => navigate("/checklist")}
                    className="w-full rounded-[1.5rem] p-5 bg-[#171e19] text-left shadow-[0_12px_40px_-8px_rgba(23,30,25,0.35)] transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden group"
                >
                    <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/[0.04]" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-[#ca0013] flex items-center justify-center">
                            <Moon size={20} className="text-white" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-white text-base tracking-tight">10-Min Evening Clean Up</h4>
                            <p className="text-white/60 text-xs font-medium">Walk, tea, prep, tidy, plan</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#b7c6c2]">
                            Evening Routine
                        </span>
                        <ArrowRight size={12} className="text-[#b7c6c2] group-hover:translate-x-1 transition-transform" />
                    </div>
                </button>
            </div>

            {/* ── Reflection + Ice Cream Rules ── */}
            <div className="px-5 mb-5">
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate("/checklist/random")}
                        className="group bg-white rounded-[1.5rem] p-4 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                            <Lightbulb size={20} className="text-[#3B82F6]" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-sm mb-1 tracking-tight">Reflect</h4>
                        <p className="text-[11px] text-[#b7c6c2] font-medium leading-snug">
                            How was it? What was good? What needs to improve?
                        </p>
                    </button>
                    <button
                        onClick={() => navigate("/checklist/random")}
                        className="group bg-white rounded-[1.5rem] p-4 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden"
                    >
                        <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                            <IceCream size={20} className="text-[#F472B6]" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-sm mb-1 tracking-tight">Ice Cream Rules</h4>
                        <p className="text-[11px] text-[#b7c6c2] font-medium leading-snug">
                            Once a week only if checklist is done ✓
                        </p>
                    </button>
                </div>
            </div>

            {/* ── Individual Daily Habits ── */}
            <div className="px-5 mb-5">
                <h3 className="section-header mb-3">DAILY HABITS</h3>
                <div className="space-y-3">
                    {/* Frenchie */}
                    <button
                        onClick={() => navigate("/checklist/random")}
                        className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#A78BFA]/15 flex items-center justify-center text-lg shrink-0">
                            👩‍💻
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#171e19]">Frenchie</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[11px] font-medium text-[#b7c6c2]">15 series · 2 messages · Groomed</span>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${frenchieDone ? "bg-[#69D2A6] border-[#69D2A6] text-white" : "border-[#b7c6c2]/30 text-transparent"}`}>
                            <Star size={12} />
                        </div>
                    </button>
                    {/* Widdy */}
                    <button
                        onClick={() => navigate("/checklist/random")}
                        className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-[#38BDF8]/15 flex items-center justify-center text-lg shrink-0">
                            🤴
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-[#171e19]">Widdy</div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[11px] font-medium text-[#b7c6c2]">Outside · 3 workouts · 2 messages · Groomed</span>
                            </div>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${widdyDone ? "bg-[#69D2A6] border-[#69D2A6] text-white" : "border-[#b7c6c2]/30 text-transparent"}`}>
                            <Star size={12} />
                        </div>
                    </button>
                </div>
            </div>
            {}
            <div className="px-5 mb-5">
                <h3 className="section-header mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => navigate("/wheel")}
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Disc size={24} className="text-cantaloupe" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">Spin Wheel</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Pick who does what!</p>
                    </button>
                    <button
                        onClick={() => navigate("/checklist")}
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <ListChecks size={24} className="text-green-500" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">Checklist</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Time to fill today's quest list</p>
                    </button>
                </div>
            </div>
            {}
            <div className="px-5 mb-5">
                <h3 className="section-header mb-3">HOUSEHOLD</h3>
                <div className="grid grid-cols-2 gap-3">
                    <a
                        href="/checklist"
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden no-underline">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <ClipboardList size={24} className="text-cantaloupe" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">All the checklists</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Daily, long-term, personal</p>
                    </a>
                    <a
                        href="/money"
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden no-underline">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <Wallet size={24} className="text-[#ca0013]" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">Money</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Manage payment balance</p>
                    </a>
                    <a
                        href="/kitchen"
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden no-underline">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <ChefHat size={24} className="text-green-500" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">Kitchen</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Rules, fridge, and cleaning</p>
                    </a>
                    <a
                        href="/documents"
                        className="group bg-white rounded-[1.5rem] p-5 text-left border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden no-underline">
                        <div
                            className="absolute top-0 right-0 w-20 h-20 rounded-full bg-[#b7c6c2]/10 -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div
                            className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                            <FolderLock size={24} className="text-[#A78BFA]" />
                        </div>
                        <h4 className="font-semibold text-[#171e19] text-base mb-1 tracking-tight">Documents</h4>
                        <p className="text-xs text-[#b7c6c2] font-medium">Our vault</p>
                    </a>
                </div>
            </div>
            {}
            <div className="px-5 mb-8">
                <button
                    onClick={() => navigate("/rewards")}
                    className="w-full rounded-[2.5rem] p-5 text-left shadow-[0_12px_40px_-8px_rgba(202,0,19,0.25)] hover:shadow-[0_16px_50px_-8px_rgba(202,0,19,0.35)] transition-all duration-300 hover:-translate-y-1 active:scale-[0.97] relative overflow-hidden group bg-[#ff6600]">
                    <div
                        className="absolute inset-0 bg-gradient-to-r from-[#ca0013] to-[#e31b30] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h4 className="font-semibold text-white text-lg mb-1 tracking-tight">Earn Rewards!</h4>
                            <p className="text-white/70 text-sm font-medium">Complete tasks & spin the wheel to earn points
                                                                                                                                                                              </p>
                        </div>
                        <div
                            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowRight size={22} className="text-white" />
                        </div>
                    </div>
                </button>
            </div>
            <BottomNav />
        </div>
    );
}

export default HomePage;
