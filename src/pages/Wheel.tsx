import { useState } from 'react';
import { useApp } from '@/lib/store';
import { SpinWheel } from '@/components/SpinWheel';
import { BottomNav } from '@/components/BottomNav';
import { Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

function WheelPage() {
  const { state, addWheelConfig, removeWheelConfig, getUserById, awardPoints, updateWheelConfig } = useApp();
  const [activeConfigId, setActiveConfigId] = useState(state.wheelConfigs[0]?.id || '');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(state.users.map(u => u.id));

  const activeConfig = state.wheelConfigs.find(w => w.id === (activeConfigId || state.wheelConfigs[0]?.id));
  const activeUsers = activeConfig?.users.map(id => getUserById(id)).filter(Boolean) ?? [];
  const segments = activeUsers.map((u) => ({
    label: u!.name,
    color: u!.color,
    emoji: u!.emoji,
  }));

  const handleResult = (index: number, label: string) => {
    if (activeUsers[index]) {
      awardPoints(activeUsers[index]!.id, 10, `Selected by wheel: ${activeConfig?.title || 'task'}`);
    }
  };

  const handleCreate = () => {
    if (!newTitle.trim() || selectedUsers.length < 2) return;
    addWheelConfig({ title: newTitle.trim(), users: selectedUsers });
    setNewTitle('');
    setSelectedUsers(state.users.map(u => u.id));
    setShowNewDialog(false);
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const toggleConfigUser = (configId: string, uid: string) => {
    const config = state.wheelConfigs.find(w => w.id === configId);
    if (!config) return;
    const newUsers = config.users.includes(uid)
      ? config.users.filter(id => id !== uid)
      : [...config.users, uid];
    updateWheelConfig(configId, { users: newUsers });
  };

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-[#2D2B2A]">Spin Wheel</h1>
          <p className="text-sm text-gray-400 font-semibold mt-1">Who's up for what?</p>
        </div>
      </div>

      {/* Wheel selector */}
      <div className="px-5 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {state.wheelConfigs.map(config => (
            <button
              key={config.id}
              onClick={() => setActiveConfigId(config.id)}
              className={`shrink-0 px-4 py-2.5 rounded-full font-bold text-sm transition-all active:scale-95 ${
                activeConfig?.id === config.id
                  ? 'bg-[#2D2B2A] text-white shadow-lg'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-cantaloupe'
              }`}
            >
              {config.title}
            </button>
          ))}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DialogTrigger asChild>
                  <button className="shrink-0 w-10 h-10 rounded-full bg-cantaloupe text-white flex items-center justify-center shadow-md hover:shadow-lg transition-all active:scale-90">
                    <Plus size={20} />
                  </button>
                </DialogTrigger>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                Create a new wheel
              </TooltipContent>
            </Tooltip>
            <DialogContent className="rounded-3xl max-w-[380px] mx-auto p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">New Wheel</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task / Question</label>
                  <Input
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="e.g. Who cooks tonight?"
                    className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Include People (min 2)</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {state.users.map(u => (
                      <button
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-90 ${
                          selectedUsers.includes(u.id)
                            ? 'text-white shadow-md'
                            : 'bg-gray-100 text-gray-500 border border-gray-200'
                        }`}
                        style={selectedUsers.includes(u.id) ? { backgroundColor: u.color } : {}}
                      >
                        {u.emoji} {u.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || selectedUsers.length < 2}
                  className="w-full py-3 rounded-xl font-extrabold text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 disabled:text-gray-500 transition-all active:scale-[0.98]"
                >
                  Create Wheel
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Config management */}
      {activeConfig && (
        <div className="px-5 mb-4 flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">People:</span>
          {activeUsers.map(u => (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                key={u!.id}
                onClick={() => toggleConfigUser(activeConfig.id, u!.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                  activeConfig.users.includes(u!.id) ? 'text-white' : 'bg-gray-200 text-gray-500 line-through'
                }`}
                style={activeConfig.users.includes(u!.id) ? { backgroundColor: u!.color } : {}}
              >
                {u!.emoji} {u!.name}
              </button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
              {activeConfig.users.includes(u!.id) ? 'Click to remove from wheel' : 'Click to add to wheel'}
            </TooltipContent>
          </Tooltip>
          ))}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => removeWheelConfig(activeConfig.id)}
                className="ml-auto p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
              Delete this wheel
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Wheel */}
      {segments.length >= 2 ? (
        <div className="px-5">
          <SpinWheel segments={segments} onResult={handleResult} />
        </div>
      ) : (
        <div className="px-5 py-20 text-center">
          <div className="text-5xl mb-4">🎡</div>
          <h2 className="text-xl font-extrabold text-[#2D2B2A] mb-2">Add at least 2 people</h2>
          <p className="text-gray-400 text-sm font-semibold">Go to Settings to add users, then create a wheel!</p>
        </div>
      )}

      {/* Recent picks */}
      {state.pointsLog.length > 0 && (
        <div className="px-5 mt-8 mb-4">
          <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">Recent picks</h3>
          <div className="space-y-2">
            {state.pointsLog.filter(l => l.reason.startsWith('Selected by wheel')).slice(-5).reverse().map((log, i) => {
              const user = getUserById(log.userId);
              return (
                <div key={i} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-orange-100">
                  <span className="text-xl">{user?.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-extrabold text-[#2D2B2A]">{user?.name}</div>
                    <div className="text-xs text-gray-400 font-semibold">{log.reason}</div>
                  </div>
                  <span className="text-sm font-extrabold text-cantaloupe">+{log.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default WheelPage;
