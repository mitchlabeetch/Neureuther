// Edit dialog state
// Temp user state
// Merge real users + temp users for the wheel
// temp users don't earn points
// Find the real user by matching the segment label/emoji
// Only award points to real users
// Burst confetti
/* Confetti */
/* Header */
/* Action icons */
/* Add temp user */
/* Edit wheel */
/* Delete wheel */
/* Wheel selector */
/* People bar */
/* Edit dialog */
/* Wheel */
/* Last pick with Done button */
/* Reset */
/* Confirm remove user */
import { useState, useEffect } from "react";
import { useApp } from "@/lib/store";
import { SpinWheel } from "@/components/SpinWheel";
import { BottomNav } from "@/components/BottomNav";
import { Plus, Trash2, Check, PartyPopper, Pencil, UserPlus, RotateCcw, Dices } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PendingPick {
  userId: string;
  points: number;
  /** Which wheel this local pick belongs to. Used to avoid leaking
   *  picks across wheels when switching. */
  wheelId: string;
}

interface TempUser {
  name: string;
  emoji: string;
}

const TEMP_EMOJIS = ["👤", "🤷", "🎭", "🃏", "❓", "👻", "🤖", "🐲"];

// Marker used to identify the "no subject" / random-pick wheel both when
// seeding it in the database and when the user creates one from the UI.
const RANDOM_PICK_TITLE = "🎲 Random Pick";
const isRandomPickWheel = (config?: { title?: string } | null) =>
  !!config?.title?.trim().startsWith("🎲");

function WheelPage() {
  const {
      state,
      addWheelConfig,
      removeWheelConfig,
      getUserById,
      updateWheelConfig,
      awardPoints,
      saveLastPick,
    } = useApp();

  const [activeConfigId, setActiveConfigId] = useState(state.wheelConfigs[0]?.id || "");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showTempUserDialog, setShowTempUserDialog] = useState(false);

  const [confirmRemoveUser, setConfirmRemoveUser] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newPoints, setNewPoints] = useState("15");
  const [selectedUsers, setSelectedUsers] = useState<string[]>(state.users.map((u) => u.id));
  const [pendingPick, setPendingPick] = useState<PendingPick | null>(null);
  const [doneAnimation, setDoneAnimation] = useState(false);

  const [confettiPieces, setConfettiPieces] = useState<
    Array<{
      id: number;
      x: number;
      color: string;
      delay: number;
    }>
  >([]);

  const [editTitle, setEditTitle] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [editUsers, setEditUsers] = useState<string[]>([]);
  const [tempUsers, setTempUsers] = useState<TempUser[]>([]);
  const [tempUserName, setTempUserName] = useState("");

  const tempSegments = tempUsers.map((tu, i) => ({
      label: tu.name,
      color: "#94A3B8",
      emoji: tu.emoji,
      _tempIdx: i,
    }));
  
    const resetTempUsers = () => setTempUsers([]);
  
    // Derived visible pick — takes the local pendingPick if it belongs to
    // the active wheel, otherwise falls back to the backend-persisted pick.
    // This avoids any race between state refetch and activeConfigId changes.
    const currentActiveId = activeConfigId || state.wheelConfigs[0]?.id || "";
    const activeConfig = state.wheelConfigs.find((w) => w.id === currentActiveId);
    const realActiveUsers =
      activeConfig?.users.map((id) => getUserById(id)).filter(Boolean) ?? [];
  
    const realSegments = realActiveUsers.map((u) => ({
      label: u!.name,
      color: u!.color,
      emoji: u!.emoji,
    }));
  
    const allSegments = [...realSegments, ...tempSegments];
  
    // Clear stale local pick when the active wheel changes (don't carry
    // a pick from one wheel into another).
    useEffect(() => {
      if (pendingPick && pendingPick.wheelId !== currentActiveId) {
        setPendingPick(null);
        setDoneAnimation(false);
      }
    }, [currentActiveId]); // eslint-disable-line react-hooks/exhaustive-deps
  
    // Derive the visible pick: local pendingPick for the active wheel takes
    // priority; otherwise the backend-persisted last pick is used.
    const visiblePick: PendingPick | null = (() => {
      if (!activeConfig) return null;
  
      // Local override (just spun, or local temp user)
      if (pendingPick && pendingPick.wheelId === currentActiveId) {
        return pendingPick;
      }
  
      // Backend-persisted pick
      if (activeConfig.lastPickUserId) {
        const user = getUserById(activeConfig.lastPickUserId);
        if (user) {
          return {
            userId: activeConfig.lastPickUserId,
            points: isRandomPickWheel(activeConfig)
              ? 0
              : activeConfig.pointsPerTask,
            wheelId: currentActiveId,
          };
        }
      }
  
      return null;
    })();
  
    const resetPick = async () => {
      setPendingPick(null);
      setDoneAnimation(false);
      resetTempUsers();
      // Clear persisted pick on the backend
      if (activeConfig?.id) {
        saveLastPick(activeConfig.id, null).catch(() => {});
      }
    };

  const handleResult = (index: number, label: string) => {
      const segment = allSegments[index];
  
      if (!segment || !activeConfig) return;
  
      const isTemp = "_tempIdx" in segment && typeof (segment as any)._tempIdx === "number";
  
      if (isTemp) {
            const tempIdx = (segment as any)._tempIdx as number;
      
            // Clear persisted pick for this wheel (temp users aren't persisted)
            saveLastPick(activeConfig.id, null).catch(() => {});
      
            setPendingPick({
              userId: `temp-${tempIdx}`,
              points: 0,
              wheelId: activeConfig.id,
            });
          } else {
            const realUser = realActiveUsers.find(
              (u) => u!.emoji === segment.emoji && u!.name === segment.label
            );
      
            if (realUser) {
              // Persist the pick to the backend so it survives navigation
              saveLastPick(activeConfig.id, realUser.id).catch(() => {});
      
              setPendingPick({
                userId: realUser.id,
                // Random-pick wheels are pure tiebreakers — no points awarded.
                points: isRandomPickWheel(activeConfig) ? 0 : activeConfig.pointsPerTask,
                wheelId: activeConfig.id,
              });
            }
          }
  
      setDoneAnimation(false);
    };

  const handleDone = () => {
    if (!pendingPick || !activeConfig) return;

    // "No subject" / random-pick wheels never award points — the pick
    // is just an oral tiebreaker, not a completed task.
    if (isRandomPickWheel(activeConfig)) return;

    setDoneAnimation(true);

    if (!pendingPick.userId.startsWith("temp-")) {
      awardPoints(
        pendingPick.userId,
        pendingPick.points,
        `Completed: ${activeConfig.title}`
      );
    }

    const colors = [
      "#FDA172",
      "#FF6B6B",
      "#A78BFA",
      "#69D2A6",
      "#FBBF24",
      "#FB7185",
      "#38BDF8",
    ];

    const pieces = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      x: 30 + Math.random() * 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.4,
    }));

    setConfettiPieces(pieces);
    
        // The pick stays visible until another spin — no auto-clear.
        setTimeout(() => {
          setConfettiPieces([]);
        }, 2200);
      };

  const handleCreate = async () => {
    if (!newTitle.trim() || selectedUsers.length < 2) return;

    const newConfig = await addWheelConfig({
      title: newTitle.trim(),
      users: selectedUsers,
      pointsPerTask: Number(newPoints) || 10,
    });

    // Switch to the newly created wheel so the user immediately sees
        // their new question rather than staying on whichever wheel was
        // active before. The effect will clear the pick since new wheel
        // has no lastPickUserId.
        setActiveConfigId(newConfig.id);

    setNewTitle("");
    setNewPoints("15");
    setSelectedUsers(state.users.map((u) => u.id));
    setShowNewDialog(false);
  };

  // Sets the active wheel to the persistent "no subject" / random-pick
  // wheel. Creates it on the backend on first use and reuses it after
  // that — so users always have a one-tap shortcut for oral "whoever
  // goes next" decisions.
  const handleRandomPick = async () => {
      if (state.users.length < 2) return;
  
      const existing = state.wheelConfigs.find(isRandomPickWheel);
      if (existing) {
        setActiveConfigId(existing.id);
        // If already on the random pick wheel, just keep its last pick
        if (activeConfig?.id !== existing.id) {
          // The effect will restore the pick for the new active wheel
        }
        return;
      }

    const newConfig = await addWheelConfig({
      title: RANDOM_PICK_TITLE,
      users: state.users.map((u) => u.id),
      pointsPerTask: 0,
    });

    setActiveConfigId(newConfig.id);
    resetPick();
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
    setEditUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
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

    setTempUsers((prev) => [
      ...prev,
      {
        name: tempUserName.trim(),
        emoji,
      },
    ]);

    setTempUserName("");
  };

  const toggleUserSelection = (uid: string) => {
    setSelectedUsers((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleConfigUser = (configId: string, uid: string) => {
    const config = state.wheelConfigs.find((w) => w.id === configId);

    if (!config) return;

    const newUsers = config.users.includes(uid)
      ? config.users.filter((id) => id !== uid)
      : [...config.users, uid];

    updateWheelConfig(configId, {
      users: newUsers,
    });
  };

  const lastPickUser =
      visiblePick && !visiblePick.userId.startsWith("temp-")
        ? getUserById(visiblePick.userId)
        : null;
    const lastPickTempUser =
      visiblePick && visiblePick.userId.startsWith("temp-")
        ? tempUsers[parseInt(visiblePick.userId.replace("temp-", ""))]
        : null;
  
    const lastPickDisplay =
      lastPickUser ||
      (lastPickTempUser
        ? {
            name: lastPickTempUser.name,
            emoji: lastPickTempUser.emoji,
          }
        : null);
  
    const isTempPick = visiblePick ? visiblePick.userId.startsWith("temp-") : false;
    const isRandomPick = isRandomPickWheel(activeConfig);

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      {/* Confetti */}
      {confettiPieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.x}%`,
            top: "20%",
            backgroundColor: p.color,
            width: 8 + Math.random() * 6,
            height: 8 + Math.random() * 6,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Header */}
      <div className="px-5 pt-10 pb-2 animate-fade-in-up">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#171e19] tracking-tight">
              Spin Wheel
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium mt-0.5">
              Who&apos;s up for what?
            </p>
          </div>
          {/* Action icons */}
          {activeConfig && (
            <div className="flex items-center gap-0.5 mt-1">
              {/* Add temp user */}
              <Dialog open={showTempUserDialog} onOpenChange={setShowTempUserDialog}>
                <DialogTrigger asChild>
                  <button
                    aria-label="Add temporary user"
                    className="p-2.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-blue-500 hover:bg-blue-50 transition-all duration-200 active:scale-90"
                  >
                    <UserPlus size={16} />
                  </button>
                </DialogTrigger>
                <DialogContent className="rounded-[2rem] max-w-[360px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
                  <DialogHeader className="px-6 pt-6 pb-3">
                    <DialogTitle className="text-xl font-semibold text-[#171e19]">
                      Temporary User
                    </DialogTitle>
                  </DialogHeader>
                  <div className="px-6 pb-6 space-y-4">
                    <p className="text-xs text-[#b7c6c2] font-medium">
                      Adds a one-time user to the wheel for this spin only.
                    </p>
                    <div>
                      <label className="section-header block mb-2">Name</label>
                      <div className="flex gap-2 mt-1.5">
                        <Input
                          value={tempUserName}
                          onChange={(e) => setTempUserName(e.target.value)}
                          placeholder="e.g. Guest"
                          className="rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                          onKeyDown={(e) => e.key === "Enter" && addTempUser()}
                        />
                        <button
                          onClick={addTempUser}
                          disabled={!tempUserName.trim()}
                          className="shrink-0 px-4 py-2 rounded-xl font-medium text-sm text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-95"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                    {tempUsers.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tempUsers.map((tu, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white bg-[#b7c6c2]"
                          >
                            {tu.emoji} {tu.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              {/* Edit wheel */}
              <button
                onClick={openEditDialog}
                aria-label="Edit this wheel"
                className="p-2.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-cantaloupe hover:bg-[#FFF1E6] transition-all duration-200 active:scale-90"
              >
                <Pencil size={16} />
              </button>
              {/* Delete wheel */}
              <button
                onClick={() => removeWheelConfig(activeConfig.id)}
                aria-label="Delete this wheel"
                className="p-2.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#ca0013] hover:bg-red-50 transition-all duration-200 active:scale-90"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Wheel selector */}
      <div className="px-5 mb-3">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {/* Random pick / "no subject" shortcut. One-tap setup for
              in-the-moment oral decisions — creates a persistent
              "🎲 Random Pick" wheel on the backend on first use and
              reuses it afterwards. */}
          <button
            type="button"
            onClick={handleRandomPick}
            disabled={state.users.length < 2}
            aria-label="Pick someone at random (no subject)"
            title="No subject — just pick someone"
            className={`shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center shadow-[0_2px_8px_rgba(105,210,166,0.4)] hover:shadow-[0_4px_12px_rgba(105,210,166,0.5)] transition-all duration-200 active:scale-90 bg-mint ${
              isRandomPick
                ? "ring-2 ring-offset-2 ring-mint/60 ring-offset-[#fdf7f2]"
                : ""
            }`}
          >
            <Dices size={18} />
          </button>
          {state.wheelConfigs.map((config) => (
            <button
              key={config.id}
              onClick={() => {
                              setActiveConfigId(config.id);
                              // Don't reset — let the effect restore the wheel's last pick
                            }}
              className={`shrink-0 px-4 py-2.5 rounded-full font-medium text-sm transition-all duration-200 active:scale-95 ${
                activeConfig?.id === config.id
                ? "bg-[#171e19] text-white shadow-lg shadow-[#171e19]/20"
                : "bg-white text-[#95a5a0] border border-[#b7c6c2]/30 hover:border-cantaloupe hover:text-cantaloupe"
              }`}
            >
              {config.title}
            </button>
          ))}
          <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
            <DialogTrigger asChild>
              <button
                aria-label="Create a new wheel"
                title="Add a subject"
                className="shrink-0 w-10 h-10 rounded-full text-white flex items-center justify-center shadow-[0_2px_8px_rgba(253,161,114,0.4)] hover:shadow-[0_4px_12px_rgba(253,161,114,0.5)] transition-all duration-200 active:scale-90 bg-cantaloupe"
              >
                <Plus size={20} />
              </button>
            </DialogTrigger>
            <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
              <DialogHeader className="px-6 pt-6 pb-3">
                <DialogTitle className="text-xl font-semibold text-[#171e19]">
                  New Wheel
                </DialogTitle>
              </DialogHeader>
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="section-header block mb-2">Task / Question</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Who cooks tonight?"
                    className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                  />
                </div>
                <div>
                  <label className="section-header block mb-2">Points reward</label>
                  <Input
                    type="number"
                    value={newPoints}
                    onChange={(e) => setNewPoints(e.target.value)}
                    placeholder="15"
                    className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
                  />
                </div>
                <div>
                  <label className="section-header block mb-2">
                    Include People (min 2)
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {state.users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => toggleUserSelection(u.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-90 ${
                          selectedUsers.includes(u.id)
                            ? "text-white shadow-md"
                            : "bg-[#eeebe3] text-[#b7c6c2] border border-[#b7c6c2]/25"
                        }`}
                        style={
                          selectedUsers.includes(u.id)
                            ? { backgroundColor: u.color }
                            : {}
                        }
                      >
                        {u.emoji} {u.name}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || selectedUsers.length < 2}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
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
        <div className="px-5 mb-3 flex items-center gap-2 flex-wrap">
          <span className="section-header">People:</span>
          {realActiveUsers.map((u) => (
            <button
              key={u!.id}
              onClick={() =>
                setConfirmRemoveUser({
                  userId: u!.id,
                  name: u!.name,
                })
              }
              aria-label={`Remove ${u!.name} from this wheel`}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 active:scale-90 ${
                activeConfig.users.includes(u!.id)
                  ? "text-white"
                  : "bg-[#eeebe3] text-[#b7c6c2] line-through"
              }`}
              style={
                activeConfig.users.includes(u!.id)
                  ? { backgroundColor: u!.color }
                  : {}
              }
            >
              {u!.emoji} {u!.name}
            </button>
          ))}
          {tempUsers.map((tu, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white bg-[#b7c6c2]"
            >
              {tu.emoji} {tu.name}
            </span>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="rounded-[2rem] max-w-[380px] mx-auto p-0 gap-0 border-[#b7c6c2]/20">
          <DialogHeader className="px-6 pt-6 pb-3">
            <DialogTitle className="text-xl font-semibold text-[#171e19]">
              Edit Wheel
            </DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div>
              <label className="section-header block mb-2">Task / Question</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>
            <div>
              <label className="section-header block mb-2">Points reward</label>
              <Input
                type="number"
                value={editPoints}
                onChange={(e) => setEditPoints(e.target.value)}
                className="mt-1.5 rounded-xl bg-[#eeebe3] border-[#b7c6c2]/20 focus:border-cantaloupe focus:ring-cantaloupe"
              />
            </div>
            <div>
              <label className="section-header block mb-2">Users involved</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {state.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => toggleEditUser(u.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 active:scale-90 ${
                      editUsers.includes(u.id)
                        ? "text-white shadow-md"
                        : "bg-[#eeebe3] text-[#b7c6c2] border border-[#b7c6c2]/25"
                    }`}
                    style={
                      editUsers.includes(u.id) ? { backgroundColor: u.color } : {}
                    }
                  >
                    {u.emoji} {u.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleEdit}
              disabled={!editTitle.trim() || editUsers.length < 2}
              className="w-full py-3 rounded-xl font-semibold text-white bg-[#171e19] hover:bg-[#2a302b] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] transition-all active:scale-[0.98]"
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
          <div className="text-5xl mb-4 animate-float">🎡</div>
          <h2 className="text-xl font-semibold text-[#171e19] mb-2">
            Add at least 2 people
          </h2>
          <p className="text-[#b7c6c2] text-sm font-medium">
            Go to Settings to add users, then create a wheel!
          </p>
        </div>
      )}

      {/* Last pick with Done button */}
            {visiblePick && lastPickDisplay && (
              <div className="px-5 mt-3 mb-3 animate-fade-in-up">
                <div
                  className={`flex items-center gap-3 bg-white rounded-[1.5rem] px-4 py-3 border shadow-sm transition-all duration-500 ${
                    doneAnimation
                      ? "border-green-300 bg-green-50/50 scale-[1.02]"
                      : "border-[#b7c6c2]/20"
                  }`}
                >
                  <span className="text-[10px] font-semibold text-[#b7c6c2] uppercase tracking-[0.1em]">
                    {isRandomPick ? "Lucky Pick" : "Last Pick"}
                  </span>
                  <span className="text-xl">{lastPickDisplay.emoji}</span>
                  <span className="text-sm font-semibold text-[#171e19]">
                    {lastPickDisplay.name}
                  </span>
                  <button
                    onClick={resetPick}
                    aria-label="Reset selection and temp users"
                    className="p-1.5 rounded-full bg-[#eeebe3] text-[#95a5a0] hover:text-[#171e19] hover:bg-[#d5ddd9] transition-all active:scale-90 ml-auto"
                  >
                    <RotateCcw size={14} />
                  </button>
                  {!doneAnimation ? (
                    isRandomPick ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-mint/15 text-mint text-xs font-semibold">
                        <Dices size={12} strokeWidth={2.5} /> Lucky pick!
                      </span>
                    ) : isTempPick ? (
                      <span className="ml-auto text-xs font-medium text-[#b7c6c2] italic">
                        Guest pick
                      </span>
                    ) : (
                      <button
                        onClick={handleDone}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#69D2A6] text-white text-xs font-semibold hover:bg-[#5BCA9B] transition-all active:scale-90 shadow-sm"
                      >
                        <Check size={14} strokeWidth={3} /> Done
                      </button>
                    )
                  ) : (
                    <div className="ml-auto flex items-center gap-1.5 text-[#69D2A6] font-semibold text-sm animate-bounce-in">
                      <PartyPopper size={16} />+{visiblePick.points} pts!
                    </div>
                  )}
                </div>
              </div>
            )}

      {/* Confirm remove user */}
      {confirmRemoveUser && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setConfirmRemoveUser(null)}
        >
          <div
            className="bg-white rounded-t-[2.5rem] w-[calc(100%-2rem)] max-w-[480px] px-6 pt-6 pb-32 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-[#171e19] mb-3">
              Should {confirmRemoveUser.name} be taken out of this wheel?
            </h3>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemoveUser(null)}
                className="flex-1 py-3 rounded-xl font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/30 transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toggleConfigUser(activeConfig!.id, confirmRemoveUser.userId);
                  setConfirmRemoveUser(null);
                }}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
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
