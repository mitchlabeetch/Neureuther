import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ListChecks, Trophy, ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function HomePage() {
  const { state, getUserById, getUserPoints } = useApp();
  const navigate = useNavigate();
  const [greeting, setGreeting] = useState('');
  const [progressVal, setProgressVal] = useState(0);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const completed = state.checklistItems.filter(i => i.completed).length;
    const total = state.checklistItems.length;
    setProgressVal(total > 0 ? (completed / total) * 100 : 0);
  }, [state.checklistItems]);

  const completedToday = state.checklistItems.filter(i => i.completed).length;
  const totalToday = state.checklistItems.length;

  const topUser = state.users
    .map(u => ({ ...u, points: getUserPoints(u.id) }))
    .sort((a, b) => b.points - a.points)[0];

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{greeting}</p>
          <h1 className="text-3xl font-extrabold text-[#2D2B2A]">Neureuther</h1>
        </div>
        <div className="flex -space-x-2">
          {state.users.slice(0, 4).map(u => (
            <Tooltip key={u.id}>
              <TooltipTrigger asChild>
                <div
                  className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center text-lg shadow-sm cursor-default"
                  style={{ backgroundColor: u.color + '30' }}
                >
                  {u.emoji}
                </div>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                {u.name} — {getUserPoints(u.id)} pts
              </TooltipContent>
            </Tooltip>
          ))}
          {state.users.length > 4 && (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-extrabold text-gray-500 shadow-sm">
              +{state.users.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Today's progress card */}
      <div className="px-5 mb-4">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg shadow-orange-100/50 border border-orange-50">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-extrabold text-[#2D2B2A]">Today's Checklist</h3>
              <p className="text-sm text-gray-400 font-semibold">{completedToday}/{totalToday} done</p>
            </div>
            <div className="w-16 h-16 rounded-full bg-cantaloupe-lighter flex items-center justify-center">
              <span className="text-2xl font-extrabold text-cantaloupe">{Math.round(progressVal)}%</span>
            </div>
          </div>
          <Progress value={progressVal} className="h-3 rounded-full bg-orange-100 [&>div]:bg-cantaloupe [&>div]:rounded-full" />
          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
            {state.checklistItems.slice(0, 5).map(item => (
              <div
                key={item.id}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  item.completed ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400'
                }`}
              >
                {item.completed ? <CheckCircle2 size={12} /> : <Circle size={12} />}
                {item.label}
              </div>
            ))}
            {state.checklistItems.length > 5 && (
              <span className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400">
                +{state.checklistItems.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/wheel')}
            className="group bg-white rounded-3xl p-5 shadow-md shadow-orange-100/30 border border-orange-50 text-left hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-cantaloupe-lighter flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <Sparkles size={24} className="text-cantaloupe" />
            </div>
            <h4 className="font-extrabold text-[#2D2B2A] text-base mb-1">Spin Wheel</h4>
            <p className="text-xs text-gray-400 font-semibold">Pick who does what!</p>
          </button>
          <button
            onClick={() => navigate('/checklist')}
            className="group bg-white rounded-3xl p-5 shadow-md shadow-orange-100/30 border border-orange-50 text-left hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ListChecks size={24} className="text-green-500" />
            </div>
            <h4 className="font-extrabold text-[#2D2B2A] text-base mb-1">Checklist</h4>
            <p className="text-xs text-gray-400 font-semibold">Track daily tasks</p>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-5 mb-4">
        <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">Household Stats</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm">
            <span className="text-2xl">🏆</span>
            <div className="text-2xl font-extrabold text-[#2D2B2A] mt-2">{topUser?.emoji} {topUser?.name}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">{topUser?.points || 0} pts — Top earner</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm">
            <span className="text-2xl">🔥</span>
            <div className="text-2xl font-extrabold text-coral mt-2">{completedToday} tasks</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Completed today</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm">
            <span className="text-2xl">🎡</span>
            <div className="text-2xl font-extrabold text-lavender mt-2">{state.wheelConfigs.length}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Spin wheels</div>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-orange-50 shadow-sm">
            <span className="text-2xl">🎁</span>
            <div className="text-2xl font-extrabold text-mint mt-2">{state.rewardItems.length}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Rewards available</div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 mb-8">
        <button
          onClick={() => navigate('/rewards')}
          className="w-full bg-gradient-to-r from-cantaloupe to-coral rounded-3xl p-5 text-left shadow-lg shadow-orange-200/40 hover:shadow-xl transition-all active:scale-[0.98]"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-extrabold text-white text-lg mb-1">Earn Rewards!</h4>
              <p className="text-white/80 text-sm font-semibold">Complete tasks & spin the wheel to earn points</p>
            </div>
            <ArrowRight size={24} className="text-white" />
          </div>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

export default HomePage;
