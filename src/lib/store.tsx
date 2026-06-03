import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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
  // The server returns `null` for "not yet completed"; we accept either
  // `null` or `undefined` to stay compatible with old localStorage data
  // and avoid forcing a JSON `null` → JS `undefined` rewrite.
  completedBy?: string | null;
  completedAt?: string | null;
  points: number;
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
  id: string;
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

const EMPTY_STATE: AppState = {
  users: [],
  checklistItems: [],
  wheelConfigs: [],
  rewardItems: [],
  pointsLog: [],
};

const STATE_QUERY_KEY = ["app", "state"] as const;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (body?.statusMessage) message = body.statusMessage;
    } catch {
      /* ignore */
    }
    throw new Error(message || `Request failed: ${res.status}`);
  }
  // 204 / empty body
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

interface AppContextValue {
  state: AppState;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  addUser: (user: Omit<User, "id">) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  removeUser: (id: string) => Promise<void>;
  toggleChecklistItem: (id: string, userId?: string) => Promise<void>;
  updateChecklistItem: (id: string, data: Partial<ChecklistItem>) => Promise<void>;
  addChecklistItem: (item: Omit<ChecklistItem, "id">) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  addWheelConfig: (config: Omit<WheelConfig, "id">) => Promise<void>;
  updateWheelConfig: (id: string, data: Partial<WheelConfig>) => Promise<void>;
  removeWheelConfig: (id: string) => Promise<void>;
  addRewardItem: (item: Omit<RewardItem, "id">) => Promise<void>;
  updateRewardItem: (id: string, data: Partial<RewardItem>) => Promise<void>;
  removeRewardItem: (id: string) => Promise<void>;
  awardPoints: (userId: string, points: number, reason: string) => Promise<void>;
  claimReward: (userId: string, rewardId: string) => Promise<boolean>;
  getUserPoints: (userId: string) => number;
  getUserById: (id: string) => User | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  // One-time best-effort migration of the previous localStorage blob.
  useEffect(() => {
    const LEGACY_KEY = "neureuther-state";
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      // Only migrate if it actually looks like an AppState.
      if (
        parsed &&
        typeof parsed === "object" &&
        Array.isArray(parsed.users) &&
        Array.isArray(parsed.checklistItems)
      ) {
        api("/api/migrate", { method: "POST", body: JSON.stringify(parsed) })
          .then(() => {
            localStorage.removeItem(LEGACY_KEY);
            queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY });
          })
          .catch(() => {
            // Migration failed — keep the local copy around and let the user
            // try again on next load. We don't surface this to the UI.
          });
      } else {
        // Not our payload; drop it so it doesn't haunt future loads.
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch {
      // Corrupt JSON — drop it.
      localStorage.removeItem(LEGACY_KEY);
    }
    // Run once on mount; intentionally not depending on queryClient.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateQuery = useQuery({
    queryKey: STATE_QUERY_KEY,
    queryFn: () => api<AppState>("/api/state"),
    // Refetch on focus / mount is handled by react-query defaults; add a
    // modest interval so the daily reset triggers even on idle tabs.
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

  // Refetch on visibility change so the daily reset takes effect promptly
  // when the app returns from background on mobile (matching the previous
  // localStorage behavior).
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY });
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [queryClient]);

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY }),
    [queryClient],
  );

  // ── Mutations ────────────────────────────────────────────────────────
  // Each mutation is fire-and-forget from the page's perspective; React
  // Query re-fetches the state when the mutation settles. The pages stay
  // mostly unchanged because the action callbacks swallow errors via
  // `mutateAsync` wrapped in try/finally semantics at the call site.
  const addUserMut = useMutation({
    mutationFn: (user: Omit<User, "id">) =>
      api<User>("/api/users", { method: "POST", body: JSON.stringify(user) }),
    onSuccess: invalidate,
  });

  const updateUserMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) =>
      api<{ ok: true }>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeUserMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/users/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const addChecklistItemMut = useMutation({
    mutationFn: (item: Omit<ChecklistItem, "id">) =>
      api<ChecklistItem>("/api/checklist-items", {
        method: "POST",
        body: JSON.stringify(item),
      }),
    onSuccess: invalidate,
  });

  const updateChecklistItemMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ChecklistItem> }) =>
      api<{ ok: true }>(`/api/checklist-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeChecklistItemMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/checklist-items/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const toggleChecklistItemMut = useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string }) =>
      api<{
        completed: boolean;
        completedBy: string | null;
        completedAt: string | null;
      }>(`/api/checklist-items/${id}/toggle`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      }),
    onSuccess: invalidate,
  });

  const addWheelConfigMut = useMutation({
    mutationFn: (config: Omit<WheelConfig, "id">) =>
      api<WheelConfig>("/api/wheel-configs", {
        method: "POST",
        body: JSON.stringify(config),
      }),
    onSuccess: invalidate,
  });

  const updateWheelConfigMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WheelConfig> }) =>
      api<{ ok: true }>(`/api/wheel-configs/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeWheelConfigMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/wheel-configs/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const addRewardItemMut = useMutation({
    mutationFn: (item: Omit<RewardItem, "id">) =>
      api<RewardItem>("/api/reward-items", {
        method: "POST",
        body: JSON.stringify(item),
      }),
    onSuccess: invalidate,
  });

  const updateRewardItemMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RewardItem> }) =>
      api<{ ok: true }>(`/api/reward-items/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeRewardItemMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/reward-items/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const awardPointsMut = useMutation({
    mutationFn: ({
      userId,
      points,
      reason,
    }: {
      userId: string;
      points: number;
      reason: string;
    }) =>
      api<PointsLog>("/api/points-log", {
        method: "POST",
        body: JSON.stringify({ userId, points, reason }),
      }),
    onSuccess: invalidate,
  });

  const claimRewardMut = useMutation({
    mutationFn: ({ userId, rewardId }: { userId: string; rewardId: string }) =>
      api<{ ok: true; newBalance: number; logEntry: PointsLog }>(
        "/api/rewards/claim",
        { method: "POST", body: JSON.stringify({ userId, rewardId }) },
      ),
    onSuccess: invalidate,
  });

  // ── Public action wrappers ───────────────────────────────────────────
  // These return a Promise so callers that need the outcome (e.g.
  // claimReward returning a boolean) can await it. The action body itself
  // is fire-and-forget; React Query invalidates the state query on settle.
  const addUser = useCallback(
    async (user: Omit<User, "id">) => {
      await addUserMut.mutateAsync(user);
    },
    [addUserMut],
  );

  const updateUser = useCallback(
    async (id: string, data: Partial<User>) => {
      await updateUserMut.mutateAsync({ id, data });
    },
    [updateUserMut],
  );

  const removeUser = useCallback(
    async (id: string) => {
      await removeUserMut.mutateAsync(id);
    },
    [removeUserMut],
  );

  const addChecklistItem = useCallback(
    async (item: Omit<ChecklistItem, "id">) => {
      await addChecklistItemMut.mutateAsync(item);
    },
    [addChecklistItemMut],
  );

  const updateChecklistItem = useCallback(
    async (id: string, data: Partial<ChecklistItem>) => {
      await updateChecklistItemMut.mutateAsync({ id, data });
    },
    [updateChecklistItemMut],
  );

  const removeChecklistItem = useCallback(
    async (id: string) => {
      await removeChecklistItemMut.mutateAsync(id);
    },
    [removeChecklistItemMut],
  );

  const toggleChecklistItem = useCallback(
    async (id: string, userId?: string) => {
      await toggleChecklistItemMut.mutateAsync({ id, userId });
    },
    [toggleChecklistItemMut],
  );

  const addWheelConfig = useCallback(
    async (config: Omit<WheelConfig, "id">) => {
      await addWheelConfigMut.mutateAsync(config);
    },
    [addWheelConfigMut],
  );

  const updateWheelConfig = useCallback(
    async (id: string, data: Partial<WheelConfig>) => {
      await updateWheelConfigMut.mutateAsync({ id, data });
    },
    [updateWheelConfigMut],
  );

  const removeWheelConfig = useCallback(
    async (id: string) => {
      await removeWheelConfigMut.mutateAsync(id);
    },
    [removeWheelConfigMut],
  );

  const addRewardItem = useCallback(
    async (item: Omit<RewardItem, "id">) => {
      await addRewardItemMut.mutateAsync(item);
    },
    [addRewardItemMut],
  );

  const updateRewardItem = useCallback(
    async (id: string, data: Partial<RewardItem>) => {
      await updateRewardItemMut.mutateAsync({ id, data });
    },
    [updateRewardItemMut],
  );

  const removeRewardItem = useCallback(
    async (id: string) => {
      await removeRewardItemMut.mutateAsync(id);
    },
    [removeRewardItemMut],
  );

  const awardPoints = useCallback(
    async (userId: string, points: number, reason: string) => {
      await awardPointsMut.mutateAsync({ userId, points, reason });
    },
    [awardPointsMut],
  );

  const claimReward = useCallback(
    async (userId: string, rewardId: string): Promise<boolean> => {
      try {
        await claimRewardMut.mutateAsync({ userId, rewardId });
        return true;
      } catch {
        // Server already returns 409 with statusMessage "insufficient
        // points" if the user is short. We translate that to a false
        // return so the page can show its existing toast.
        return false;
      }
    },
    [claimRewardMut],
  );

  const state: AppState = stateQuery.data ?? EMPTY_STATE;

  const getUserPoints = useCallback(
    (userId: string): number =>
      state.pointsLog
        .filter((log) => log.userId === userId)
        .reduce((sum, log) => sum + log.points, 0),
    [state.pointsLog],
  );

  const getUserById = useCallback(
    (id: string) => state.users.find((u) => u.id === id),
    [state.users],
  );

  return (
    <AppContext.Provider
      value={{
        state,
        isLoading: stateQuery.isLoading,
        isError: stateQuery.isError,
        refetch: () => queryClient.invalidateQueries({ queryKey: STATE_QUERY_KEY }),
        addUser,
        updateUser,
        removeUser,
        toggleChecklistItem,
        updateChecklistItem,
        addChecklistItem,
        removeChecklistItem,
        addWheelConfig,
        updateWheelConfig,
        removeWheelConfig,
        addRewardItem,
        updateRewardItem,
        removeRewardItem,
        awardPoints,
        claimReward,
        getUserPoints,
        getUserById,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
