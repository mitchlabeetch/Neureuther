import { useState } from 'react';
import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { Plus, Trash2, Gift, Star, ShoppingCart } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function RewardsPage() {
  const { state, getUserPoints, addRewardItem, removeRewardItem, awardPoints } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newIcon, setNewIcon] = useState('🎁');
  const [showRedeem, setShowRedeem] = useState<string | null>(null);

  const userPoints = state.users.map(u => ({
    user: u,
    points: getUserPoints(u.id),
  })).sort((a, b) => b.points - a.points);

  const handleCreate = () => {
    if (!newLabel.trim() || !newCost || Number(newCost) <= 0) return;
    addRewardItem({ label: newLabel.trim(), pointsCost: Number(newCost), icon: newIcon || '🎁' });
    setNewLabel('');
    setNewCost('');
    setNewIcon('🎁');
    setShowDialog(false);
  };

  const handleRedeem = (itemId: string, userId: string) => {
    const item = state.rewardItems.find(r => r.id === itemId);
    const userPts = getUserPoints(userId);
    if (!item || userPts < item.pointsCost) {
      toast.error('Not enough points!');
      return;
    }
    awardPoints(userId, -item.pointsCost, `Redeemed: ${item.label}`);
    toast.success(`${state.users.find(u => u.id === userId)?.name} redeemed ${item.label}! 🎉`);
    setShowRedeem(null);
  };

  const maxPoints = Math.max(...userPoints.map(u => u.points), 1);

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Header */}
      <div className="px-5 pt-14 pb-4">
        <h1 className="text-3xl font-extrabold text-[#2D2B2A]">Rewards</h1>
        <p className="text-sm text-gray-400 font-semibold mt-1">Earn points, redeem rewards!</p>
      </div>

      {/* Leaderboard */}
      <div className="px-5 mb-5">
        <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider mb-3">Leaderboard</h3>
        <div className="space-y-2">
          {userPoints.map(({ user, points }, i) => (
            <div
              key={user.id}
              className="flex items-center gap-3 bg-white rounded-2xl p-4 border border-orange-100 shadow-sm"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold ${
                i === 0 ? 'bg-yellow-100 text-yellow-600' :
                i === 1 ? 'bg-gray-100 text-gray-500' :
                i === 2 ? 'bg-orange-100 text-orange-500' :
                'bg-gray-50 text-gray-400'
              }`}>
                {i + 1}
              </div>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                style={{ backgroundColor: user.color + '30' }}
              >
                {user.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-extrabold text-[#2D2B2A]">{user.name}</div>
                <div className="w-full h-2 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(points / maxPoints) * 100}%`,
                      backgroundColor: user.color,
                    }}
                  />
                </div>
              </div>
              <span className="text-lg font-extrabold" style={{ color: user.color }}>{points}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Reward shop */}
      <div className="px-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-extrabold text-gray-400 uppercase tracking-wider">Reward Shop</h3>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-cantaloupe bg-cantaloupe-lighter hover:bg-cantaloupe hover:text-white transition-all active:scale-90">
                <Plus size={14} /> Add
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-[380px] mx-auto p-0 gap-0">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">New Reward</DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reward Name</label>
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="e.g. Pick the movie"
                    className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cost (pts)</label>
                    <Input
                      type="number"
                      value={newCost}
                      onChange={e => setNewCost(e.target.value)}
                      placeholder="50"
                      className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Icon</label>
                    <Input
                      value={newIcon}
                      onChange={e => setNewIcon(e.target.value)}
                      className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 text-center text-xl"
                      maxLength={2}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newLabel.trim() || !newCost || Number(newCost) <= 0}
                  className="w-full py-3 rounded-xl font-extrabold text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 disabled:text-gray-500 transition-all active:scale-[0.98]"
                >
                  Add Reward
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {state.rewardItems.map(item => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-4 border border-orange-100 shadow-sm hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-xl mb-2">
                {item.icon}
              </div>
              <h4 className="text-sm font-extrabold text-[#2D2B2A] mb-1">{item.label}</h4>
              <div className="flex items-center gap-1 text-cantaloupe text-xs font-bold mb-3">
                <Star size={12} /> {item.pointsCost} pts
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowRedeem(item.id)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-cantaloupe hover:bg-[#fda172dd] transition-all active:scale-95"
                >
                  Redeem
                </button>
                <button
                  onClick={() => removeRewardItem(item.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem modal */}
      {showRedeem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowRedeem(null)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-[#2D2B2A] mb-1">Who's redeeming?</h3>
            <p className="text-sm text-gray-400 font-semibold mb-4">
              {state.rewardItems.find(r => r.id === showRedeem)?.label} — {state.rewardItems.find(r => r.id === showRedeem)?.pointsCost} pts
            </p>
            <div className="space-y-2">
              {state.users.map(u => {
                const pts = getUserPoints(u.id);
                const cost = state.rewardItems.find(r => r.id === showRedeem)?.pointsCost || 0;
                return (
                  <button
                    key={u.id}
                    disabled={pts < cost}
                    onClick={() => handleRedeem(showRedeem, u.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border border-orange-100 bg-white hover:bg-orange-50 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ backgroundColor: u.color + '30' }}>
                      {u.emoji}
                    </div>
                    <span className="text-base font-extrabold text-[#2D2B2A]">{u.name}</span>
                    <span className="ml-auto text-sm font-bold" style={{ color: pts < cost ? '#FF6B6B' : '#69D2A6' }}>
                      {pts} pts {pts < cost ? '❌' : '✅'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default RewardsPage;
