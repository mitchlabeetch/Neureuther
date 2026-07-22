import { useState, useMemo } from 'react';
import { useApp } from '@/lib/store';
import { BottomNav } from '@/components/BottomNav';
import { PageHeader } from '@/components/PageHeader';
import { Plus, Trash2, Pencil, Star, Wallet, Sparkles, Film, Shield, Cookie, Users, Clock, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmojiPicker } from '@/components/EmojiPicker';
import { toast } from 'sonner';
import type { RewardItem } from '@/lib/store';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'experience', label: 'Experience', icon: Film },
  { key: 'privilege', label: 'Privilege', icon: Shield },
  { key: 'treat', label: 'Treat', icon: Cookie },
  { key: 'social', label: 'Social', icon: Users },
] as const;

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  experience: { bg: 'bg-[#e8f4f1]', text: 'text-[#2d7a6b]', dot: 'bg-[#2d7a6b]' },
  privilege:  { bg: 'bg-[#fff3e0]', text: 'text-[#e67e00]', dot: 'bg-[#e67e00]' },
  treat:      { bg: 'bg-[#fce4ec]', text: 'text-[#c2185b]', dot: 'bg-[#c2185b]' },
  social:     { bg: 'bg-[#e3f2fd]', text: 'text-[#1565c0]', dot: 'bg-[#1565c0]' },
  general:    { bg: 'bg-[#f3e5f5]', text: 'text-[#6a1b9a]', dot: 'bg-[#6a1b9a]' },
};

function getCategoryStyle(category: string) {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.general;
}

function RewardsPage() {
  const { state, getUserPoints, addRewardItem, updateRewardItem, removeRewardItem, claimReward } = useApp();
  const [showDialog, setShowDialog] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newIcon, setNewIcon] = useState('🎁');
  const [newCategory, setNewCategory] = useState('experience');
  const [newDescription, setNewDescription] = useState('');

  // Redeem flow state
  const [redeemItemId, setRedeemItemId] = useState<string | null>(null);
  const [confirmingUser, setConfirmingUser] = useState<string | null>(null);

  // Edit reward state
  const [editingReward, setEditingReward] = useState<RewardItem | null>(null);

  const filteredItems = useMemo(() => {
    return state.rewardItems;
  }, [state.rewardItems]);

  const recentClaims = useMemo(() => {
    return state.pointsLog
      .filter((p) => p.points < 0 && p.reason.startsWith('Claimed:'))
      .slice(0, 10);
  }, [state.pointsLog]);

  const handleCreate = () => {
    if (!newLabel.trim() || !newCost || Number(newCost) <= 0) return;
    addRewardItem({
      label: newLabel.trim(),
      pointsCost: Number(newCost),
      icon: newIcon || '🎁',
      category: newCategory,
      description: newDescription.trim() || null,
    });
    setNewLabel('');
    setNewCost('');
    setNewIcon('🎁');
    setNewCategory('experience');
    setNewDescription('');
    setShowDialog(false);
  };

  const handleRedeem = async (itemId: string, userId: string) => {
    const success = await claimReward(userId, itemId);
    if (!success) {
      toast.error('Not enough points!');
      return;
    }
    const item = state.rewardItems.find((r) => r.id === itemId);
    const user = state.users.find((u) => u.id === userId);
    if (item && user) {
      toast.success(`${user.name} claimed "${item.label}"! 🎉`);
    }
    setConfirmingUser(null);
    setRedeemItemId(null);
  };

  const handleEditSave = () => {
    if (!editingReward || !editingReward.label.trim() || editingReward.pointsCost <= 0) return;
    updateRewardItem(editingReward.id, {
      label: editingReward.label.trim(),
      pointsCost: editingReward.pointsCost,
      icon: editingReward.icon,
      category: editingReward.category,
      description: editingReward.description,
    });
    setEditingReward(null);
  };


  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content pb-24">
      <PageHeader title="Rewards" subtitle="Earn points, redeem rewards!" backTo="/" backLabel="Home" icon={<div className="w-12 h-12 rounded-2xl bg-[#FFF1E6] flex items-center justify-center"><Star size={24} className="text-cantaloupe" /></div>} />

      {/* Points Account */}
      <div className="px-5 mb-5">
        <h3 className="section-header mb-3">Points Account</h3>
        <div className="grid grid-cols-2 gap-3">
          {state.users.map((u) => {
            const pts = getUserPoints(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center gap-3 bg-white rounded-[1.5rem] p-3 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: u.color + '30' }}
                >
                  {u.emoji}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[#171e19] truncate">{u.name}</div>
                  <div className="text-xs font-semibold mt-0.5" style={{ color: u.color }}>
                    {pts} pts
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {state.users.length === 0 && (
          <p className="text-sm text-[#b7c6c2] text-center py-4">Add people in Settings to see points</p>
        )}
      </div>

      {/* Reward shop */}
      <div className="px-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="section-header">
            Reward Shop
          </h3>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium text-[#FDA172] bg-[#FFF1E6] hover:bg-[#FDA172] hover:text-white transition-all active:scale-90">
                <Plus size={14} /> Add
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle className="text-xl font-semibold text-[#171e19]">
                  New Reward
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="section-header block mb-2">Reward Name</label>
                  <Input
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="e.g. Pick the movie"
                    className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                  />
                </div>
                <div>
                  <label className="section-header block mb-2">Description</label>
                  <Input
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="What does this reward include?"
                    className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="section-header block mb-2">Cost (pts)</label>
                    <Input
                      type="number"
                      value={newCost}
                      onChange={(e) => setNewCost(e.target.value)}
                      placeholder="50"
                      className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                    />
                  </div>
                  <div className="w-20">
                    <label className="section-header block mb-2">Icon</label>
                    <EmojiPicker
                      value={newIcon}
                      onChange={(emoji) => setNewIcon(emoji)}
                      className="mt-1.5 w-full h-10 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 flex items-center justify-center hover:bg-[#b7c6c2]/10 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="section-header block mb-2">Category</label>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
                      const isSelected = newCategory === cat.key;
                      const style = getCategoryStyle(cat.key);
                      return (
                        <button
                          key={cat.key}
                          onClick={() => setNewCategory(cat.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                            isSelected
                              ? `${style.bg} ${style.text} ring-1 ring-current`
                              : 'bg-[#eeebe3] text-[#b7c6c2] hover:bg-[#b7c6c2]/20'
                          }`}
                        >
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newLabel.trim() || !newCost || Number(newCost) <= 0}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
                >
                  Add Reward
                </button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {filteredItems.map((item) => {
                      const catStyle = getCategoryStyle(item.category);
          
                      return (
              <div
                key={item.id}
                className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-1 flex flex-col"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF1E6] flex items-center justify-center text-xl">
                    {item.icon}
                  </div>
                  <button
                    onClick={() => setEditingReward({ ...item })}
                    aria-label="Edit reward"
                    className="p-2 rounded-xl bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] hover:bg-[#b7c6c2]/20 transition-all active:scale-90"
                  >
                    <Pencil size={14} />
                  </button>
                </div>

                <span className={`inline-flex items-center gap-1 self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-2 ${catStyle.bg} ${catStyle.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                  {item.category}
                </span>

                <h4 className="text-sm font-medium text-[#171e19] mb-1 leading-tight">
                  {item.label}
                </h4>
                {item.description && (
                  <p className="text-[11px] text-[#b7c6c2] font-medium leading-relaxed mb-3 line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center gap-1 text-[#FDA172] text-xs font-bold mb-2">
                  <Star size={12} fill="currentColor" /> {item.pointsCost} pts
                </div>

                <div className="flex gap-1.5 mt-auto">
                  <button
                    onClick={() => setRedeemItemId(item.id)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-medium text-white bg-[#ca0013] hover:bg-[#e31b30] transition-all active:scale-95"
                  >
                    Redeem
                  </button>
                  <button
                    onClick={() => removeRewardItem(item.id)}
                    aria-label="Remove this reward"
                    className="p-1.5 rounded-xl bg-[#eeebe3] text-[#95a5a0] hover:text-[#ca0013] hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-8 text-[#b7c6c2] text-sm">
            No rewards yet — tap Add to create one
          </div>
        )}
      </div>

      {/* Recent Claims */}
      {recentClaims.length > 0 && (
        <div className="px-5 mb-6">
          <h3 className="section-header mb-3">Recent Claims</h3>
          <div className="bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)]">
            <div className="space-y-3">
              {recentClaims.map((claim) => {
                const user = state.users.find((u) => u.id === claim.userId);
                return (
                  <div key={claim.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
                      style={{ backgroundColor: (user?.color || '#b7c6c2') + '30' }}
                    >
                      {user?.emoji || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#171e19] truncate">
                        {user?.name || 'Someone'} claimed <span className="text-[#ca0013]">{claim.reason.replace('Claimed: ', '')}</span>
                      </p>
                      <p className="text-[10px] text-[#b7c6c2] font-medium flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(claim.timestamp).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#ca0013]">{claim.points} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Redeem — Step 1: pick user */}
      {redeemItemId && !confirmingUser && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setRedeemItemId(null)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] px-6 pt-6 pb-32 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-[#eeebe3] rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#171e19] mb-1">Who's redeeming?</h3>
            <p className="text-sm text-[#b7c6c2] font-medium mb-4">
              {state.rewardItems.find((r) => r.id === redeemItemId)?.icon}{' '}
              {state.rewardItems.find((r) => r.id === redeemItemId)?.label} —{' '}
              {state.rewardItems.find((r) => r.id === redeemItemId)?.pointsCost} pts
            </p>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {state.users.map((u) => {
                const pts = getUserPoints(u.id);
                const cost = state.rewardItems.find((r) => r.id === redeemItemId)?.pointsCost || 0;
                const canAfford = pts >= cost;
                return (
                  <button
                    key={u.id}
                    disabled={!canAfford}
                    onClick={() => canAfford && setConfirmingUser(u.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-[1.5rem] border transition-all active:scale-[0.98] ${
                      canAfford
                        ? 'border-[#b7c6c2]/20 bg-white hover:bg-[#FFF1E6] hover:border-[#FDA172]/30'
                        : 'border-[#eeebe3] bg-[#eeebe3]/40 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                      style={{ backgroundColor: u.color + '30' }}
                    >
                      {u.emoji}
                    </div>
                    <span className="text-base font-medium text-[#171e19]">
                      {u.name}
                    </span>
                    <span
                      className={`ml-auto text-sm font-medium flex items-center gap-1 ${
                        canAfford ? 'text-[#69D2A6]' : 'text-[#FF6B6B]'
                      }`}
                    >
                      <Wallet size={12} /> {pts} pts {canAfford ? '✅' : '❌'}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setRedeemItemId(null)}
              className="w-full mt-3 py-2.5 rounded-xl text-sm font-medium text-[#b7c6c2] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Redeem — Step 2: confirm */}
      {redeemItemId && confirmingUser && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
          onClick={() => { setConfirmingUser(null); setRedeemItemId(null); }}
        >
          <div
            className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 pb-10 animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-[#FFF1E6] flex items-center justify-center text-3xl mb-3">
                {state.rewardItems.find((r) => r.id === redeemItemId)?.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#171e19]">
                Confirm Redemption
              </h3>
            </div>
            <div className="bg-[#eeebe3]/60 rounded-[1.5rem] p-4 mb-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#b7c6c2] font-medium">Reward</span>
                <span className="text-[#171e19] font-medium">
                  {state.rewardItems.find((r) => r.id === redeemItemId)?.label}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#b7c6c2] font-medium">Person</span>
                <span className="text-[#171e19] font-medium">
                  {state.users.find((u) => u.id === confirmingUser)?.emoji}{' '}
                  {state.users.find((u) => u.id === confirmingUser)?.name}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#b7c6c2] font-medium">Cost</span>
                <span className="text-[#ca0013] font-semibold">
                  −{state.rewardItems.find((r) => r.id === redeemItemId)?.pointsCost} pts
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#b7c6c2] font-medium">Balance after</span>
                <span className="text-[#171e19] font-medium">
                  {getUserPoints(confirmingUser) - (state.rewardItems.find((r) => r.id === redeemItemId)?.pointsCost || 0)} pts
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmingUser(null); setRedeemItemId(null); }}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-[#b7c6c2] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRedeem(redeemItemId, confirmingUser)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#e31b30] transition-all active:scale-[0.98]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit reward dialog */}
      <Dialog open={!!editingReward} onOpenChange={(open) => !open && setEditingReward(null)}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              Edit Reward
            </DialogTitle>
          </DialogHeader>
          {editingReward && (
            <div className="px-6 pb-6 space-y-4">
              <div>
                <label className="section-header block mb-2">Reward Name</label>
                <Input
                  value={editingReward.label}
                  onChange={(e) => setEditingReward({ ...editingReward, label: e.target.value })}
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                />
              </div>
              <div>
                <label className="section-header block mb-2">Description</label>
                <Input
                  value={editingReward.description || ''}
                  onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                  placeholder="What does this reward include?"
                  className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="section-header block mb-2">Cost (pts)</label>
                  <Input
                    type="number"
                    value={editingReward.pointsCost}
                    onChange={(e) => setEditingReward({ ...editingReward, pointsCost: Number(e.target.value) || 0 })}
                    className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-[#FDA172] focus:ring-[#FDA172]"
                  />
                </div>
                <div className="w-20">
                  <label className="section-header block mb-2">Icon</label>
                  <EmojiPicker
                    value={editingReward.icon}
                    onChange={(emoji) => setEditingReward({ ...editingReward, icon: emoji })}
                    className="mt-1.5 w-full h-10 rounded-xl bg-[#eeebe3] border border-[#b7c6c2]/20 flex items-center justify-center hover:bg-[#b7c6c2]/10 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="section-header block mb-2">Category</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => {
                    const isSelected = editingReward.category === cat.key;
                    const style = getCategoryStyle(cat.key);
                    return (
                      <button
                        key={cat.key}
                        onClick={() => setEditingReward({ ...editingReward, category: cat.key })}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${
                          isSelected
                            ? `${style.bg} ${style.text} ring-1 ring-current`
                            : 'bg-[#eeebe3] text-[#b7c6c2] hover:bg-[#b7c6c2]/20'
                        }`}
                      >
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <button
                onClick={handleEditSave}
                disabled={!editingReward.label.trim() || editingReward.pointsCost <= 0}
                className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default RewardsPage;
