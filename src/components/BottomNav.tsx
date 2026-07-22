import { useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  ListChecks,
  Disc,
  ChefHat,
  Menu,
  Trophy,
  Wallet,
  FolderLock,
  Archive,
  Settings as SettingsIcon,
  X,
  Star,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useApp } from "@/lib/store";

type Tab = {
  to: string;
  icon: typeof Home;
  label: string;
  match: (pathname: string) => boolean;
};

// Primary tabs to the left and right of the centered Spin FAB.
const LEFT_TABS: Tab[] = [
  { to: "/", icon: Home, label: "Home", match: (p) => p === "/" },
  {
    to: "/checklist",
    icon: ListChecks,
    label: "Lists",
    // Covers /checklist, /checklist/*, and /checklists.
    match: (p) => p.startsWith("/checklist"),
  },
];

const RIGHT_TABS: Tab[] = [
  {
    to: "/kitchen",
    icon: ChefHat,
    label: "Kitchen",
    // Kitchen is the hub for meals + groceries too.
    match: (p) =>
      p === "/kitchen" || p.startsWith("/meals") || p.startsWith("/groceries"),
  },
];

// Secondary destinations, surfaced through the "More" sheet.
const MORE_LINKS = [
  { to: "/rewards", icon: Trophy, label: "Rewards", color: "#FDA172" },
  { to: "/money", icon: Wallet, label: "Money", color: "#ca0013" },
  { to: "/documents", icon: FolderLock, label: "Documents", color: "#A78BFA" },
  { to: "/checklist/archive", icon: Archive, label: "Archive", color: "#95a5a0" },
  { to: "/checklist/long-term/archive", icon: Archive, label: "Long-term archive", color: "#95a5a0" },
  { to: "/settings", icon: SettingsIcon, label: "Settings", color: "#69D2A6" },
];

const MORE_PATHS = ["/rewards", "/money", "/documents", "/settings", "/daily-habits"];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  const pathname = location.pathname;
  const moreActive = MORE_PATHS.some((p) => pathname.startsWith(p));

  const go = (to: string) => {
    setMoreOpen(false);
    navigate(to);
  };

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="app-container w-full px-4 pb-4 pointer-events-auto">
          <div className="relative">
            <div className="absolute inset-x-4 -top-3 bottom-1 bg-gradient-to-r from-cantaloupe/20 via-[#b7c6c2]/15 to-cantaloupe/20 rounded-[2.5rem] blur-xl animate-blob" />
            <div className="relative bg-white/70 backdrop-blur-2xl rounded-[2rem] shadow-[0_8px_40px_-12px_rgba(183,198,194,0.3)] border border-white/60 px-2 py-2.5 flex items-center justify-around overflow-visible">
              {LEFT_TABS.map((t) => (
                <TabButton key={t.to} tab={t} active={t.match(pathname)} />
              ))}

              {/* Center Spin FAB */}
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <NavLink to="/wheel" className="relative -mt-7 group" aria-label="Spin">
                    <div className="absolute inset-0 rounded-full bg-cantaloupe/30 blur-lg scale-150 animate-pulse-soft" />
                    <div className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-[0_8px_24px_-4px_rgba(253,161,114,0.5)] border-[3px] border-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_12px_32px_-4px_rgba(253,161,114,0.6)] group-active:scale-95 bg-[#ff7b00]">
                      <Disc
                        size={24}
                        className="text-white transition-transform duration-300 group-hover:rotate-180"
                        strokeWidth={2.5}
                      />
                    </div>
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="rounded-xl bg-[#171e19] text-white border-none text-xs font-medium px-3 py-2 shadow-lg"
                >
                  Spin
                </TooltipContent>
              </Tooltip>

              {RIGHT_TABS.map((t) => (
                <TabButton key={t.to} tab={t} active={t.match(pathname)} />
              ))}

              {/* More */}
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(true)}
                    aria-label="More"
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 active:scale-90 w-14 h-12 ${
                      moreActive
                        ? "bg-[#FFF1E6] text-cantaloupe"
                        : "text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6]/50"
                    }`}
                  >
                    <Menu size={20} strokeWidth={moreActive ? 2.5 : 2} />
                    <span
                      className={`text-[9px] font-medium tracking-wide ${
                        moreActive ? "text-cantaloupe" : "text-[#95a5a0]"
                      }`}
                    >
                      More
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="rounded-xl bg-[#171e19] text-white border-none text-xs font-medium px-3 py-2 shadow-lg"
                >
                  More
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          />
          <div className="relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[85vh] overflow-y-auto shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up pb-6">
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
            </div>
            <div className="px-6 pt-2 pb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#171e19]">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 grid grid-cols-2 gap-3">
              {MORE_LINKS.map((l) => (
                <button
                  key={l.to}
                  type="button"
                  onClick={() => go(l.to)}
                  className="flex items-center gap-3 bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] active:scale-[0.97] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition text-left"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: l.color + "20" }}
                  >
                    <l.icon size={20} style={{ color: l.color }} />
                  </div>
                  <span className="text-sm font-semibold text-[#171e19]">
                    {l.label}
                  </span>
                </button>
              ))}
            </div>

            {state.users.length > 0 && (
              <div className="px-5 mt-5">
                <p className="section-header mb-2">Daily habits</p>
                <div className="space-y-2">
                  {state.users.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => go(`/daily-habits/${u.id}`)}
                      className="w-full flex items-center gap-3 bg-white rounded-[1.5rem] p-3.5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] active:scale-[0.99] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] transition text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                        style={{ backgroundColor: u.color + "30" }}
                      >
                        {u.emoji}
                      </div>
                      <span className="flex-1 text-sm font-medium text-[#171e19]">
                        {u.name}
                      </span>
                      <Star size={14} className="text-[#b7c6c2]" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function TabButton({ tab, active }: { tab: Tab; active: boolean }) {
  const { to, icon: Icon, label } = tab;
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <NavLink
          to={to}
          className={`relative flex flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-300 active:scale-90 w-14 h-12 ${
            active
              ? "bg-[#FFF1E6] text-cantaloupe"
              : "text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6]/50"
          }`}
        >
          <div className={`relative ${active ? "animate-icon-pop" : ""}`}>
            <Icon size={20} className="transition-all duration-300" strokeWidth={active ? 2.5 : 2} />
          </div>
          <span
            className={`text-[9px] font-medium tracking-wide transition-colors ${
              active ? "text-cantaloupe" : "text-[#95a5a0]"
            }`}
          >
            {label}
          </span>
        </NavLink>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="rounded-xl bg-[#171e19] text-white border-none text-xs font-medium px-3 py-2 shadow-lg"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
