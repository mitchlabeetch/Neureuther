import { NavLink, useLocation } from 'react-router-dom';
import { Home, ListChecks, Sparkles, Trophy, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/checklist', icon: ListChecks, label: 'Checklist' },
  { to: '/wheel', icon: Sparkles, label: 'Wheel' },
  { to: '/rewards', icon: Trophy, label: 'Rewards' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="app-container w-full px-3 pb-3 pointer-events-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-lg shadow-orange-200/30 border border-orange-100/50 px-2 py-2 flex items-center justify-around">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            const isWheel = to === '/wheel';
            return (
              <NavLink
                key={to}
                to={to}
                className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl transition-all duration-200 active:scale-90 ${
                  isWheel
                    ? '-mt-8 rounded-full w-14 h-14 bg-cantaloupe shadow-lg shadow-orange-400/40 border-[3px] border-white flex items-center justify-center'
                    : 'w-14 h-12 hover:bg-orange-50'
                }`}
              >
                <Icon
                  size={isWheel ? 24 : 20}
                  className={`transition-all duration-200 ${
                    isWheel
                      ? 'text-white'
                      : isActive
                      ? 'text-cantaloupe'
                      : 'text-gray-400'
                  }`}
                  strokeWidth={isActive || isWheel ? 2.5 : 2}
                />
                {!isWheel && (
                  <span
                    className={`text-[9px] font-bold tracking-tight transition-colors ${
                      isActive ? 'text-cantaloupe' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
