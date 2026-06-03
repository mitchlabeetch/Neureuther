import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface User {
  id: string;
  name: string;
  color: string;
  emoji: string;
}

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface WheelConfig {
  id: string;
  title: string;
  users: string[];
  pointsPerTask: number;
}

export interface RewardItem {
  id: string;
  label: string;
  pointsCost: number;
  icon: string;
}

export interface PointsLog {
  userId: string;
  points: number;
  reason: string;
  timestamp: string;
}

interface AppState {
  users: User[];
  checklistItems: ChecklistItem[];
  wheelConfigs: WheelConfig[];
  rewardItems: RewardItem[];
  pointsLog: PointsLog[];
}

const DEFAULT_USERS: User[] = [
  { id: '1', name: 'Widdy', color: '#FDA172', emoji: '🐱' },
  { id: '2', name: 'Frenchie', color: '#FF6B6B', emoji: '🐶' },
];

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id: '1', label: 'Dishes put away', completed: false },
  { id: '2', label: 'Trash sorted & taken out', completed: false },
  { id: '3', label: 'Countertops wiped down', completed: false },
  { id: '4', label: 'Living room tidied up', completed: false },
  { id: '5', label: 'Floors swept / vacuumed', completed: false },
  { id: '6', label: 'Bathroom quick clean', completed: false },
];

const DEFAULT_WHEEL_CONFIGS: WheelConfig[] = [
  { id: '1', title: 'Who will vacuum today?', users: ['1', '2'], pointsPerTask: 15 },
  { id: '2', title: 'Who takes out the trash?', users: ['1', '2'], pointsPerTask: 10 },
  { id: '3', title: 'Who cooks dinner tonight?', users: ['1', '2'], pointsPerTask: 20 },
];

const DEFAULT_REWARDS: RewardItem[] = [
  { id: '1', label: 'Choose the movie', pointsCost: 50, icon: '🎬' },
  { id: '2', label: 'Skip one chore', pointsCost: 100, icon: '🛌' },
  { id: '3', label: 'Pick takeout place', pointsCost: 75, icon: '🍕' },
  { id: '4', label: 'Extra screen time', pointsCost: 60, icon: '📱' },
];

function loadState(): AppState {
  try {
    const stored = localStorage.getItem('neureuther-state');
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    users: DEFAULT_USERS,
    checklistItems: DEFAULT_CHECKLIST,
    wheelConfigs: DEFAULT_WHEEL_CONFIGS,
    rewardItems: DEFAULT_REWARDS,
    pointsLog: [],
  };
}

function saveState(state: AppState) {
  localStorage.setItem('neureuther-state', JSON.stringify(state));
}

function resetDailyChecklist(items: ChecklistItem[]): ChecklistItem[] {
  const today = new Date().toDateString();
  const lastReset = localStorage.getItem('neureuther-checklist-date');
  if (lastReset === today) return items;
  localStorage.setItem('neureuther-checklist-date', today);
  return items.map(item => ({ ...item, completed: false, completedBy: undefined, completedAt: undefined }));
}

interface AppContextValue {
  state: AppState;
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, data: Partial<User>) => void;
  removeUser: (id: string) => void;
  toggleChecklistItem: (id: string, userId?: string) => void;
  updateChecklistItem: (id: string, data: Partial<ChecklistItem>) => void;
  addChecklistItem: (item: Omit<ChecklistItem, 'id'>) => void;
  removeChecklistItem: (id: string) => void;
  addWheelConfig: (config: Omit<WheelConfig, 'id'>) => void;
  updateWheelConfig: (id: string, data: Partial<WheelConfig>) => void;
  removeWheelConfig: (id: string) => void;
  addRewardItem: (item: Omit<RewardItem, 'id'>) => void;
  updateRewardItem: (id: string, data: Partial<RewardItem>) => void;
  removeRewardItem: (id: string) => void;
  awardPoints: (userId: string, points: number, reason: string) => void;
  getUserPoints: (userId: string) => number;
  getUserById: (id: string) => User | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const s = loadState();
    return { ...s, checklistItems: resetDailyChecklist(s.checklistItems) };
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback((fn: (s: AppState) => AppState) => {
    setState(prev => {
      const next = fn(prev);
      saveState(next);
      return next;
    });
  }, []);

  const addUser = useCallback((user: Omit<User, 'id'>) => {
    update(s => ({ ...s, users: [...s.users, { ...user, id: crypto.randomUUID() }] }));
  }, [update]);

  const updateUser = useCallback((id: string, data: Partial<User>) => {
    update(s => ({ ...s, users: s.users.map(u => u.id === id ? { ...u, ...data } : u) }));
  }, [update]);

  const removeUser = useCallback((id: string) => {
    update(s => ({
      ...s,
      users: s.users.filter(u => u.id !== id),
      wheelConfigs: s.wheelConfigs.map(w => ({ ...w, users: w.users.filter(uid => uid !== id) })),
    }));
  }, [update]);

  const toggleChecklistItem = useCallback((id: string, userId?: string) => {
    update(s => ({
      ...s,
      checklistItems: s.checklistItems.map(item =>
        item.id === id
          ? { ...item, completed: !item.completed, completedBy: !item.completed ? userId : undefined, completedAt: !item.completed ? new Date().toISOString() : undefined }
          : item
      ),
    }));
  }, [update]);

  const updateChecklistItem = useCallback((id: string, data: Partial<ChecklistItem>) => {
    update(s => ({
      ...s,
      checklistItems: s.checklistItems.map(item => item.id === id ? { ...item, ...data } : item),
    }));
  }, [update]);

  const addChecklistItem = useCallback((item: Omit<ChecklistItem, 'id'>) => {
    update(s => ({ ...s, checklistItems: [...s.checklistItems, { ...item, id: crypto.randomUUID() }] }));
  }, [update]);

  const removeChecklistItem = useCallback((id: string) => {
    update(s => ({ ...s, checklistItems: s.checklistItems.filter(i => i.id !== id) }));
  }, [update]);

  const addWheelConfig = useCallback((config: Omit<WheelConfig, 'id'>) => {
    update(s => ({ ...s, wheelConfigs: [...s.wheelConfigs, { ...config, id: crypto.randomUUID() }] }));
  }, [update]);

  const updateWheelConfig = useCallback((id: string, data: Partial<WheelConfig>) => {
    update(s => ({
      ...s,
      wheelConfigs: s.wheelConfigs.map(w => w.id === id ? { ...w, ...data } : w),
    }));
  }, [update]);

  const removeWheelConfig = useCallback((id: string) => {
    update(s => ({ ...s, wheelConfigs: s.wheelConfigs.filter(w => w.id !== id) }));
  }, [update]);

  const addRewardItem = useCallback((item: Omit<RewardItem, 'id'>) => {
    update(s => ({ ...s, rewardItems: [...s.rewardItems, { ...item, id: crypto.randomUUID() }] }));
  }, [update]);

  const updateRewardItem = useCallback((id: string, data: Partial<RewardItem>) => {
    update(s => ({
      ...s,
      rewardItems: s.rewardItems.map(r => r.id === id ? { ...r, ...data } : r),
    }));
  }, [update]);

  const removeRewardItem = useCallback((id: string) => {
    update(s => ({ ...s, rewardItems: s.rewardItems.filter(r => r.id !== id) }));
  }, [update]);

  const awardPoints = useCallback((userId: string, points: number, reason: string) => {
    update(s => ({
      ...s,
      pointsLog: [...s.pointsLog, { userId, points, reason, timestamp: new Date().toISOString() }],
    }));
  }, [update]);

  const getUserPoints = useCallback((userId: string): number => {
    return state.pointsLog
      .filter(log => log.userId === userId)
      .reduce((sum, log) => sum + log.points, 0);
  }, [state.pointsLog]);

  const getUserById = useCallback((id: string) => state.users.find(u => u.id === id), [state.users]);

  return (
    <AppContext.Provider value={{
      state, addUser, updateUser, removeUser,
      toggleChecklistItem, updateChecklistItem, addChecklistItem, removeChecklistItem,
      addWheelConfig, updateWheelConfig, removeWheelConfig,
      addRewardItem, updateRewardItem, removeRewardItem,
      awardPoints, getUserPoints, getUserById,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
