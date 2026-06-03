import { NavLink, useLocation } from 'react-router-dom';
import { Home, ListChecks, Disc, Trophy, Settings } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/checklist', icon: ListChecks, label: 'Checklist' },
  { to: '/wheel', icon: Disc, label: 'Spin the Wheel' },
  { to: '/rewards', icon: Trophy, label: 'Rewards' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="app-container w-full px-3 pb-3 pointer-events-auto">
        <div className="bg-[#171e19]/90 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_-4px_rgba(23,30,25,0.4)] border border-white/10 px-2 py-2 flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            const isWheel = to === '/wheel';
            return (
              <Tooltip key={to} delayDuration={300}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-300 active:scale-90 ${
                      isWheel
                        ? '-mt-8 rounded-full w-14 h-14 bg-[#ca0013] shadow-[0_8px_24px_-4px_rgba(202,0,19,0.4)] border-[3px] border-[#eeebe3] flex items-center justify-center hover:bg-[#b30011]'
                        : isActive
                        ? 'w-14 h-12 bg-white/15'
                        : 'w-14 h-12 hover:bg-white/5'
                    }`}
                  >
                    <Icon
                      size={isWheel ? 24 : 20}
                      className={`transition-all duration-300 ${
                        isWheel
                          ? 'text-white'
                          : isActive
                          ? 'text-cantaloupe'
                          : 'text-[#b7c6c2]/60'
                      }`}
                      strokeWidth={isActive || isWheel ? 2.5 : 2}
                    />
                    {!isWheel && (
                      <span
                        className={`text-[9px] font-black tracking-tight transition-colors ${
                          isActive ? 'text-cantaloupe' : 'text-[#b7c6c2]/50'
                        }`}
                      >
                        {label}
                      </span>
                    )}
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="rounded-xl bg-[#171e19] text-white border-none text-xs font-bold px-3 py-2 shadow-lg"
                >
                  {label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
