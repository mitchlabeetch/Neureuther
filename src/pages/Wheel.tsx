import { useState } from 'react';
import { useApp } from '@/lib/store';
import { SpinWheel } from '@/components/SpinWheel';
import { BottomNav } from '@/components/BottomNav';
import { Plus, Trash2, Check, PartyPopper, Pencil, UserPlus, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface PendingPick {
  userId: string;
  points: number;
}

interface TempUser {
  name: string;
  emoji: string;
}

const TEMP_EMOJIS = ['👤', '🤷', '🎭', '🃏', '❓', '👻', '🤖', '🐲'];

function WheelPage() {
  const { state, addWheelConfig, removeWheelConfig, getUserById, updateWheelConfig, awardPoints } = useApp();
  const [activeConfigId, setActiveConfigId] = useState(state.wheelConfigs[0]?.id || '');
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTempUserDialog, setShowTempUserDialog] = useState(false);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState<{ userId: string; name: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPoints, setNewPoints] = useState('15');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(state.users.map(u => u.id));
  const [pendingPick, setPendingPick] = useState<PendingPick | null>(null);
  const [doneAnimation, setDoneAnimation] = useState(false);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; x: number; color: string; delay: number }>>([]);

  // Edit dialog state
  const [editTitle, setEditTitle] = useState('');
  const [editPoints, setEditPoints] = useState('');
  const [editUsers, setEditUsers] = useState<string[]>([]);

  // Temp user state
  const [tempUsers, setTempUsers] = useState<TempUser[]>([]);
  const [tempUserName, setTempUserName] = useState('');

  const activeConfig = state.wheelConfigs.find(w => w.id === (activeConfigId || state.wheelConfigs[0]?.id));

  // Merge real users + temp users for the wheel
  const realActiveUsers = activeConfig?.users.map(id => getUserById(id)).filter(Boolean) ?? [];
  const tempSegments = tempUsers.map((tu, i) => ({
    label: tu.name,
    color: '#94A3B8',
    emoji: tu.emoji,
    _tempIdx: i,
  }));
  const realSegments = realActiveUsers.map((u) => ({
    label: u!.name,
    color: u!.color,
    emoji: u!.emoji,
  }));
  const allSegments = [...realSegments, ...tempSegments];

  const resetTempUsers = () => setTempUsers([]);
  const resetPick = () => {
    setPendingPick(null);
    setDoneAnimation(false);
    resetTempUsers();
  };

  const handleResult = (index: number, label: string) => {
    const segment = allSegments[index];
    if (!segment || !activeConfig) return;

    const isTemp = '_tempIdx' in segment && typeof (segment as any)._tempIdx === 'number';

    if (isTemp) {
      const tempIdx = (segment as any)._tempIdx as number;
      setPendingPick({
        userId: `temp-${tempIdx}`,
        points: 0, // temp users don't earn points
      });
    } else {
      // Find the real user by matching the segment label/emoji
      const realUser = realActiveUsers.find(
        u => u!.emoji === segment.emoji && u!.name === segment.label
      );
      if (realUser) {
        setPendingPick({
          userId: realUser.id,
          points: activeConfig.pointsPerTask,
        });
      }
    }
    setDoneAnimation(false);
  };

  const handleDone = () => {
    if (!pendingPick || !activeConfig) return;
    setDoneAnimation(true);

    // Only award points to real users
    if (!pendingPick.userId.startsWith('temp-')) {
      awardPoints(pendingPick.userId, pendingPick.points, `Completed: ${activeConfig.title}`);
    }

    // Burst confetti
    const colors = ['#FDA172', '#FF6B6B', '#A78BFA', '#69D2A6', '#FBBF24', '#FB7185', '#38BDF8'];
    const pieces = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
    }));
    setConfettiPieces(pieces);

    setTimeout(() => {
      setPendingPick(null);
      setDoneAnimation(false);
      setConfettiPieces([]);
      resetTempUsers();
    }, 2200);
  };

  const handleCreate = () => {
    if (!newTitle.trim() || selectedUsers.length < 2) return;
    addWheelConfig({ title: newTitle.trim(), users: selectedUsers, pointsPerTask: Number(newPoints) || 10 });
    setNewTitle('');
    setNewPoints('15');
    setSelectedUsers(state.users.map(u => u.id));
    setShowNewDialog(false);
  };

  const handleEdit = () => {
    if (!activeConfig || !editTitle.trim()) return;
    updateWheelConfig(activeConfig.id, {
      title: editTitle.trim(),
      pointsPerTask: Number(editPoints) || activeConfig.pointsPerTask,
      users: editUsers,
    });
    setShowEditDialog(false);
  };

  const toggleEditUser = (uid: string) => {
    setEditUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const openEditDialog = () => {
    if (!activeConfig) return;
    setEditTitle(activeConfig.title);
    setEditPoints(String(activeConfig.pointsPerTask));
    setEditUsers([...activeConfig.users]);
    setShowEditDialog(true);
  };

  const addTempUser = () => {
    if (!tempUserName.trim()) return;
    const emoji = TEMP_EMOJIS[tempUsers.length % TEMP_EMOJIS.length];
    setTempUsers(prev => [...prev, { name: tempUserName.trim(), emoji }]);
    setTempUserName('');
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

  const lastPickUser = pendingPick && !pendingPick.userId.startsWith('temp-')
    ? getUserById(pendingPick.userId)
    : null;
  const lastPickTempUser = pendingPick && pendingPick.userId.startsWith('temp-')
    ? tempUsers[parseInt(pendingPick.userId.replace('temp-', ''))]
    : null;
  const lastPickDisplay = lastPickUser || (lastPickTempUser ? { name: lastPickTempUser.name, emoji: lastPickTempUser.emoji } : null);
  const isTempPick = pendingPick ? pendingPick.userId.startsWith('temp-') : false;

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Confetti */}
      {confettiPieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            top: '20%',
            backgroundColor: p.color,
            width: 8 + Math.random() * 6,
            height: 8 + Math.random() * 6,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Header */}
      <div className="px-5 pt-10 pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[#2D2B2A]">Spin Wheel</h1>
            <p className="text-sm text-gray-400 font-semibold mt-0.5">Who's up for what?</p>
          </div>

          {/* Action icons */}
          {activeConfig && (
            <div className="flex items-center gap-0.5 mt-1">
              {/* Add temp user */}
              <Dialog open={showTempUserDialog} onOpenChange={setShowTempUserDialog}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DialogTrigger asChild>
                      <button className="p-2 rounded-full text-gray-400 hover:text-blue-400 hover:bg-blue-50 transition-all active:scale-90">
                        <UserPlus size={16} />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                    Add temporary user for this run
                  </TooltipContent>
                </Tooltip>
                <DialogContent className="rounded-3xl max-w-[360px] mx-auto p-0 gap-0">
                  <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">Temporary User</DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6 space-y-4">
                    <p className="text-xs text-gray-400 font-semibold">Adds a one-time user to the wheel for this spin only.</p>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Name</label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={tempUserName}
                          onChange={e => setTempUserName(e.target.value)}
                          placeholder="e.g. Guest"
                          className="rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
                          onKeyDown={e => e.key === 'Enter' && addTempUser()}
                        />
                        <button
                          onClick={addTempUser}
                          disabled={!tempUserName.trim()}
                          className="shrink-0 px-4 py-2 rounded-xl font-bold text-sm text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 transition-all active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {tempUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tempUsers.map((tu, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-slate-400">
                            {tu.emoji} {tu.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Edit wheel */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={openEditDialog}
                    className="p-2 rounded-full text-gray-400 hover:text-cantaloupe hover:bg-orange-50 transition-all active:scale-90"
                  >
                    <Pencil size={16} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                  Edit this wheel
                </TooltipContent>
              </Tooltip>

              {/* Delete wheel */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => removeWheelConfig(activeConfig.id)}
                    className="p-2 rounded-full text-gray-400 hover:text-red-400 hover:bg-red-50 transition-all active:scale-90"
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
        </div>
      </div>

      {/* Wheel selector */}
      <div className="px-5 mb-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {state.wheelConfigs.map(config => (
            <button
              key={config.id}
              onClick={() => { setActiveConfigId(config.id); resetPick(); }}
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
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Points reward</label>
                  <Input
                    type="number"
                    value={newPoints}
                    onChange={e => setNewPoints(e.target.value)}
                    placeholder="15"
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

      {/* People bar */}
      {activeConfig && (
        <div className="px-5 mb-2 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">People:</span>
          {realActiveUsers.map(u => (
          <Tooltip key={u!.id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setConfirmRemoveUser({ userId: u!.id, name: u!.name })}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all active:scale-90 ${
                  activeConfig.users.includes(u!.id) ? 'text-white' : 'bg-gray-200 text-gray-500 line-through'
                }`}
                style={activeConfig.users.includes(u!.id) ? { backgroundColor: u!.color } : {}}
              >
                {u!.emoji} {u!.name}
              </button>
            </TooltipTrigger>
            <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
              Remove {u!.name} from this wheel
            </TooltipContent>
          </Tooltip>
          ))}
          {tempUsers.map((tu, i) => (
            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold text-white bg-slate-400">
              {tu.emoji} {tu.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-3xl max-w-[380px] mx-auto p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-extrabold text-[#2D2B2A]">Edit Wheel</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Task / Question</label>
              <Input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Points reward</label>
              <Input
                type="number"
                value={editPoints}
                onChange={e => setEditPoints(e.target.value)}
                className="mt-1.5 rounded-xl bg-gray-50 border-gray-200 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Users involved</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {state.users.map(u => (
                  <button
                    key={u.id}
                    onClick={() => toggleEditUser(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-90 ${
                      editUsers.includes(u.id)
                        ? 'text-white shadow-md'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                    }`}
                    style={editUsers.includes(u.id) ? { backgroundColor: u.color } : {}}
                  >
                    {u.emoji} {u.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleEdit}
              disabled={!editTitle.trim() || editUsers.length < 2}
              className="w-full py-3 rounded-xl font-extrabold text-white bg-[#2D2B2A] hover:bg-[#3D3B3A] disabled:bg-gray-300 disabled:text-gray-500 transition-all active:scale-[0.98]"
            >
              Save Changes
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Wheel */}
      {allSegments.length >= 2 ? (
        <div className="px-5">
          <SpinWheel segments={allSegments} onResult={handleResult} />
        </div>
      ) : (
        <div className="px-5 py-20 text-center">
          <div className="text-5xl mb-4">🎡</div>
          <h2 className="text-xl font-extrabold text-[#2D2B2A] mb-2">Add at least 2 people</h2>
          <p className="text-gray-400 text-sm font-semibold">Go to Settings to add users, then create a wheel!</p>
        </div>
      )}

      {/* Last pick with Done button */}
      {pendingPick && lastPickDisplay && (
        <div className="px-5 mt-2 mb-2">
          <div className={`flex items-center gap-2 bg-white rounded-2xl px-3 py-2 border shadow-sm transition-all duration-500 ${
            doneAnimation ? 'border-green-300 bg-green-50/50 scale-105' : 'border-orange-100'
          }`}>
            <span className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Last pick</span>
            <span className="text-lg">{lastPickDisplay.emoji}</span>
            <span className="text-sm font-extrabold text-[#2D2B2A]">{lastPickDisplay.name}</span>

            {/* Reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={resetPick}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all active:scale-90"
                >
                  <RotateCcw size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent className="rounded-xl bg-[#2D2B2A] text-white border-none text-xs font-semibold px-3 py-2 shadow-lg">
                Reset selection & temp users
              </TooltipContent>
            </Tooltip>

            {!doneAnimation && !isTempPick ? (
              <button
                onClick={handleDone}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-400 text-white text-xs font-extrabold hover:bg-green-500 transition-all active:scale-90 shadow-sm"
              >
                <Check size={14} strokeWidth={3} /> Done
              </button>
            ) : !doneAnimation && isTempPick ? (
              <span className="ml-auto text-xs font-semibold text-gray-400 italic">Guest pick</span>
            ) : (
              <div className="ml-auto flex items-center gap-1.5 text-green-500 font-extrabold text-sm animate-bounce-in">
                <PartyPopper size={16} />
                +{pendingPick.points} pts!
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirm remove user */}
      {confirmRemoveUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end justify-center" onClick={() => setConfirmRemoveUser(null)}>
          <div className="bg-white rounded-t-[2.5rem] w-full max-w-[480px] p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-extrabold text-[#2D2B2A] mb-3">
              Should {confirmRemoveUser.name} be taken out of this wheel?
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemoveUser(null)}
                className="flex-1 py-3 rounded-xl font-extrabold text-[#2D2B2A] bg-gray-100 hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleConfigUser(activeConfig!.id, confirmRemoveUser.userId);
                  setConfirmRemoveUser(null);
                }}
                className="flex-1 py-3 rounded-xl font-extrabold text-white bg-coral hover:bg-[#ff5252] transition-all active:scale-[0.98]"
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

export default WheelPage;
