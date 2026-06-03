/* Floating blob background */
/* Animated blob behind */
/* Main nav bar - glassy light */
/* Blob shadow */
/* Main floating button */
import { NavLink, useLocation } from "react-router-dom";
import { Home, ListChecks, Disc, Trophy, Settings } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const navItems = [{
    to: "/",
    icon: Home,
    label: "Home"
}, {
    to: "/checklist",
    icon: ListChecks,
    label: "Checklist"
}, {
    to: "/wheel",
    icon: Disc,
    label: "Spin"
}, {
    to: "/rewards",
    icon: Trophy,
    label: "Rewards"
}, {
    to: "/settings",
    icon: Settings,
    label: "Settings"
}];

export function BottomNav() {
    const location = useLocation();

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="app-container w-full px-4 pb-4 pointer-events-auto">
                {}
                <div className="relative">
                    {}
                    <div
                        className="absolute inset-x-4 -top-3 bottom-1 bg-gradient-to-r from-cantaloupe/20 via-[#b7c6c2]/15 to-cantaloupe/20 rounded-[2.5rem] blur-xl animate-blob" />
                    {}
                    <div
                        className="relative bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(183,198,194,0.3)] border border-white/60 px-2 py-2.5 flex items-center justify-around overflow-visible">
                        {navItems.map((
                            {
                                to,
                                icon: Icon,
                                label
                            }
                        ) => {
                            const isActive = location.pathname === to;
                            const isWheel = to === "/wheel";

                            if (isWheel) {
                                return (
                                    <Tooltip key={to} delayDuration={300}>
                                        <TooltipTrigger asChild>
                                            <NavLink to={to} className="relative -mt-7 group">
                                                {}
                                                <div
                                                    className="absolute inset-0 rounded-full bg-cantaloupe/30 blur-lg scale-150 animate-pulse-soft" />
                                                {}
                                                <div
                                                    className="relative w-14 h-14 rounded-full from-cantaloupe to-[#ff9147] flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(253,161,114,0.5)] border-[3px] border-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_-4px_rgba(253,161,114,0.6)] group-active:scale-95 bg-[#ff7b00]">
                                                    <Icon
                                                        size={24}
                                                        className="text-white transition-transform duration-300 group-hover:rotate-180"
                                                        strokeWidth={2.5} />
                                                </div>
                                            </NavLink>
                                        </TooltipTrigger>
                                        <TooltipContent
                                            side="top"
                                            sideOffset={8}
                                            className="rounded-xl bg-[#171e19] text-white border-none text-xs font-medium px-3 py-2 shadow-lg">
                                            {label}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return (
                                <Tooltip key={to} delayDuration={300}>
                                    <TooltipTrigger asChild>
                                        <NavLink
                                            to={to}
                                            className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 active:scale-90 w-14 h-12 ${isActive ? "bg-[#FFF1E6] text-cantaloupe" : "text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6]/50"}`}>
                                            <div className={`relative ${isActive ? "animate-icon-pop" : ""}`}>
                                                <Icon
                                                    size={20}
                                                    className="transition-all duration-300"
                                                    strokeWidth={isActive ? 2.5 : 2} />
                                            </div>
                                            <span
                                                className={`text-[9px] font-medium tracking-wide transition-colors ${isActive ? "text-cantaloupe" : "text-[#95a5a0]"}`}>
                                                {label}
                                            </span>
                                        </NavLink>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="top"
                                        sideOffset={8}
                                        className="rounded-xl bg-[#171e19] text-white border-none text-xs font-medium px-3 py-2 shadow-lg">
                                        {label}
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>
            </div>
        </nav>
    );
}