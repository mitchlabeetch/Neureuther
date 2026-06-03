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

export type TaskKind = "daily" | "long_term" | "random";

export interface ChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedBy?: string | null;
  completedAt?: string | null;
  points: number;
  kind: TaskKind;
  archived: boolean;
  deadline: string | null;
  flagId: string | null;
  autoCompleteOnSubtasks: boolean;
}

export interface ChecklistSubtask {
  id: string;
  taskId: string;
  label: string;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface TaskFlag {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
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

export interface PersonalChecklist {
  id: string;
  userId: string;
  name: string;
  bgColor: string;
  flagId: string | null;
  deadline: string | null;
  archived: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  totalTasks: number;
  doneTasks: number;
}

export interface PersonalChecklistTask {
  id: string;
  checklistId: string;
  label: string;
  completed: boolean;
  completedAt: string | null;
  deadline: string | null;
  sortOrder: number;
  createdAt: string;
}

interface AppState {
  users: User[];
  checklistItems: ChecklistItem[];
  checklistSubtasks: ChecklistSubtask[];
  taskFlags: TaskFlag[];
  wheelConfigs: WheelConfig[];
  rewardItems: RewardItem[];
  pointsLog: PointsLog[];
  personalChecklists: PersonalChecklist[];
  personalChecklistTasks: PersonalChecklistTask[];
}

const EMPTY_STATE: AppState = {
  users: [],
  checklistItems: [],
  checklistSubtasks: [],
  taskFlags: [],
  wheelConfigs: [],
  rewardItems: [],
  pointsLog: [],
  personalChecklists: [],
  personalChecklistTasks: [],
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
  addChecklistItem: (
    item: Omit<ChecklistItem, "id" | "completed" | "completedBy" | "completedAt" | "archived">,
  ) => Promise<void>;
  removeChecklistItem: (id: string) => Promise<void>;
  addSubtask: (taskId: string, label: string) => Promise<void>;
  updateSubtask: (id: string, data: Partial<Pick<ChecklistSubtask, "label" | "completed">>) => Promise<void>;
  removeSubtask: (id: string) => Promise<void>;
  addFlag: (data: { name: string; color: string }) => Promise<void>;
  updateFlag: (id: string, data: Partial<Pick<TaskFlag, "name" | "color">>) => Promise<void>;
  removeFlag: (id: string) => Promise<void>;
  addWheelConfig: (config: Omit<WheelConfig, "id">) => Promise<void>;
  updateWheelConfig: (id: string, data: Partial<WheelConfig>) => Promise<void>;
  removeWheelConfig: (id: string) => Promise<void>;
  addRewardItem: (item: Omit<RewardItem, "id">) => Promise<void>;
  updateRewardItem: (id: string, data: Partial<RewardItem>) => Promise<void>;
  removeRewardItem: (id: string) => Promise<void>;
  awardPoints: (userId: string, points: number, reason: string) => Promise<void>;
  awardPointsToMany: (userIds: string[], points: number, reason: string) => Promise<void>;
  claimReward: (userId: string, rewardId: string) => Promise<boolean>;
  getUserPoints: (userId: string) => number;
  getUserById: (id: string) => User | undefined;
  getFlagById: (id: string | null | undefined) => TaskFlag | undefined;
  addPersonalChecklist: (data: Omit<PersonalChecklist, "id" | "sortOrder" | "createdAt" | "updatedAt" | "totalTasks" | "doneTasks" | "archived">) => Promise<void>;
  updatePersonalChecklist: (id: string, data: Partial<Pick<PersonalChecklist, "name" | "bgColor" | "flagId" | "deadline" | "archived">>) => Promise<void>;
  removePersonalChecklist: (id: string) => Promise<void>;
  addPersonalChecklistTask: (data: Omit<PersonalChecklistTask, "id" | "completed" | "completedAt" | "sortOrder" | "createdAt">) => Promise<void>;
  updatePersonalChecklistTask: (id: string, data: Partial<Pick<PersonalChecklistTask, "label" | "completed" | "deadline">>) => Promise<void>;
  removePersonalChecklistTask: (id: string) => Promise<void>;
  syncPersonalChecklistDeadline: (checklistId: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const LEGACY_KEY = "neureuther-state";
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
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
            /* keep local copy for retry */
          });
      } else {
        localStorage.removeItem(LEGACY_KEY);
      }
    } catch {
      localStorage.removeItem(LEGACY_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stateQuery = useQuery({
    queryKey: STATE_QUERY_KEY,
    queryFn: () => api<AppState>("/api/state"),
    refetchInterval: 60_000,
    staleTime: 15_000,
  });

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
    mutationFn: (item: Omit<
      ChecklistItem,
      "id" | "completed" | "completedBy" | "completedAt" | "archived"
    >) =>
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

  const addSubtaskMut = useMutation({
    mutationFn: ({ taskId, label }: { taskId: string; label: string }) =>
      api<ChecklistSubtask>("/api/checklist-subtasks", {
        method: "POST",
        body: JSON.stringify({ taskId, label }),
      }),
    onSuccess: invalidate,
  });

  const updateSubtaskMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<ChecklistSubtask, "label" | "completed">>;
    }) =>
      api<{ ok: true }>(`/api/checklist-subtasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeSubtaskMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/checklist-subtasks/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const addFlagMut = useMutation({
    mutationFn: (data: { name: string; color: string }) =>
      api<TaskFlag>("/api/task-flags", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const updateFlagMut = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<TaskFlag, "name" | "color">>;
    }) =>
      api<{ ok: true }>(`/api/task-flags/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removeFlagMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/task-flags/${id}`, { method: "DELETE" }),
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
      userIds,
      points,
      reason,
    }: {
      userId?: string;
      userIds?: string[];
      points: number;
      reason: string;
    }) =>
      api<PointsLog | PointsLog[]>("/api/points-log", {
        method: "POST",
        body: JSON.stringify({ userId, userIds, points, reason }),
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

  // ── Personal Checklists mutations ────────────────────────────────────
  const addPersonalChecklistMut = useMutation({
    mutationFn: (data: Omit<PersonalChecklist, "id" | "sortOrder" | "createdAt" | "updatedAt" | "totalTasks" | "doneTasks" | "archived">) =>
      api<PersonalChecklist>("/api/personal-checklists", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const updatePersonalChecklistMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<PersonalChecklist, "name" | "bgColor" | "flagId" | "deadline" | "archived">> }) =>
      api<{ ok: true }>(`/api/personal-checklists/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removePersonalChecklistMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/personal-checklists/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const addPersonalChecklistTaskMut = useMutation({
    mutationFn: (data: Omit<PersonalChecklistTask, "id" | "completed" | "completedAt" | "sortOrder" | "createdAt">) =>
      api<PersonalChecklistTask>("/api/personal-checklist-tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const updatePersonalChecklistTaskMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Pick<PersonalChecklistTask, "label" | "completed" | "deadline">> }) =>
      api<{ ok: true }>(`/api/personal-checklist-tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: invalidate,
  });

  const removePersonalChecklistTaskMut = useMutation({
    mutationFn: (id: string) =>
      api<{ ok: true }>(`/api/personal-checklist-tasks/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  const syncPersonalChecklistDeadlineMut = useMutation({
    mutationFn: (checklistId: string) =>
      api<{ ok: true; deadline: string | null }>("/api/personal-checklists/sync-deadline", {
        method: "POST",
        body: JSON.stringify({ checklistId }),
      }),
    onSuccess: invalidate,
  });

  // ── Public action wrappers ───────────────────────────────────────────
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
    async (
      item: Omit<
        ChecklistItem,
        "id" | "completed" | "completedBy" | "completedAt" | "archived"
      >,
    ) => {
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

  const addSubtask = useCallback(
    async (taskId: string, label: string) => {
      await addSubtaskMut.mutateAsync({ taskId, label });
    },
    [addSubtaskMut],
  );

  const updateSubtask = useCallback(
    async (
      id: string,
      data: Partial<Pick<ChecklistSubtask, "label" | "completed">>,
    ) => {
      await updateSubtaskMut.mutateAsync({ id, data });
    },
    [updateSubtaskMut],
  );

  const removeSubtask = useCallback(
    async (id: string) => {
      await removeSubtaskMut.mutateAsync(id);
    },
    [removeSubtaskMut],
  );

  const addFlag = useCallback(
    async (data: { name: string; color: string }) => {
      await addFlagMut.mutateAsync(data);
    },
    [addFlagMut],
  );

  const updateFlag = useCallback(
    async (id: string, data: Partial<Pick<TaskFlag, "name" | "color">>) => {
      await updateFlagMut.mutateAsync({ id, data });
    },
    [updateFlagMut],
  );

  const removeFlag = useCallback(
    async (id: string) => {
      await removeFlagMut.mutateAsync(id);
    },
    [removeFlagMut],
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

  const awardPointsToMany = useCallback(
    async (userIds: string[], points: number, reason: string) => {
      await awardPointsMut.mutateAsync({ userIds, points, reason });
    },
    [awardPointsMut],
  );

  const claimReward = useCallback(
    async (userId: string, rewardId: string): Promise<boolean> => {
      try {
        await claimRewardMut.mutateAsync({ userId, rewardId });
        return true;
      } catch {
        return false;
      }
    },
    [claimRewardMut],
  );

  const addPersonalChecklist = useCallback(
    async (data: Omit<PersonalChecklist, "id" | "sortOrder" | "createdAt" | "updatedAt" | "totalTasks" | "doneTasks">) => {
      await addPersonalChecklistMut.mutateAsync(data);
    },
    [addPersonalChecklistMut],
  );

  const updatePersonalChecklist = useCallback(
    async (id: string, data: Partial<Pick<PersonalChecklist, "name" | "bgColor" | "flagId" | "deadline">>) => {
      await updatePersonalChecklistMut.mutateAsync({ id, data });
    },
    [updatePersonalChecklistMut],
  );

  const removePersonalChecklist = useCallback(
    async (id: string) => {
      await removePersonalChecklistMut.mutateAsync(id);
    },
    [removePersonalChecklistMut],
  );

  const addPersonalChecklistTask = useCallback(
    async (data: Omit<PersonalChecklistTask, "id" | "completed" | "completedAt" | "sortOrder" | "createdAt">) => {
      await addPersonalChecklistTaskMut.mutateAsync(data);
    },
    [addPersonalChecklistTaskMut],
  );

  const updatePersonalChecklistTask = useCallback(
    async (id: string, data: Partial<Pick<PersonalChecklistTask, "label" | "completed" | "deadline">>) => {
      await updatePersonalChecklistTaskMut.mutateAsync({ id, data });
    },
    [updatePersonalChecklistTaskMut],
  );

  const removePersonalChecklistTask = useCallback(
    async (id: string) => {
      await removePersonalChecklistTaskMut.mutateAsync(id);
    },
    [removePersonalChecklistTaskMut],
  );

  const syncPersonalChecklistDeadline = useCallback(
    async (checklistId: string) => {
      await syncPersonalChecklistDeadlineMut.mutateAsync(checklistId);
    },
    [syncPersonalChecklistDeadlineMut],
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

  const getFlagById = useCallback(
    (id: string | null | undefined) =>
      id ? state.taskFlags.find((f) => f.id === id) : undefined,
    [state.taskFlags],
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
        addSubtask,
        updateSubtask,
        removeSubtask,
        addFlag,
        updateFlag,
        removeFlag,
        addWheelConfig,
        updateWheelConfig,
        removeWheelConfig,
        addRewardItem,
        updateRewardItem,
        removeRewardItem,
        awardPoints,
        awardPointsToMany,
        claimReward,
        getUserPoints,
        getUserById,
        getFlagById,
        addPersonalChecklist,
        updatePersonalChecklist,
        removePersonalChecklist,
        addPersonalChecklistTask,
        updatePersonalChecklistTask,
        removePersonalChecklistTask,
        syncPersonalChecklistDeadline,
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
