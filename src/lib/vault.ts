// Vault hook — isolated, auth-gated state for the Documents vault.
// The vault is gated by Neon Auth (via /api/vault/* middleware) so it
// does NOT participate in the public /api/state snapshot. Each consumer
// (the Documents page) instantiates its own useVault() and uses the
// returned helpers to manage folders and files.
import { useCallback, useEffect, useState } from "react";

export interface VaultFolder {
  id: string;
  name: string;
  color: string;
  description: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  fileCount: number;
}

export interface VaultFile {
  id: string;
  folderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string | null;
  createdAt: string;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: "include",
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

// Approved folder colors. Keep in sync with server/routes/api/vault/*.
export const FOLDER_COLORS = [
  "#A78BFA",
  "#FDA172",
  "#69D2A6",
  "#FBBF24",
  "#F472B6",
  "#38BDF8",
  "#FF6B6B",
  "#818CF8",
  "#34D399",
  "#FB7185",
] as const;

export function useVault() {
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { folders } = await api<{ folders: VaultFolder[] }>(
        "/api/vault/folders",
      );
      setFolders(folders);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load vault");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const createFolder = useCallback(
    async (data: {
      name: string;
      color: string;
      description?: string | null;
    }): Promise<VaultFolder> => {
      const created = await api<VaultFolder>("/api/vault/folders", {
        method: "POST",
        body: JSON.stringify(data),
      });
      // Optimistic insert (server response lacks createdAt/updatedAt — keep current list).
      setFolders((prev) => [
        ...prev,
        { ...created, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ]);
      return created;
    },
    [],
  );

  const updateFolder = useCallback(
    async (
      id: string,
      data: Partial<Pick<VaultFolder, "name" | "color" | "description">>,
    ) => {
      await api<{ ok: true }>(`/api/vault/folders/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setFolders((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                ...data,
                updatedAt: new Date().toISOString(),
              }
            : f,
        ),
      );
    },
    [],
  );

  const deleteFolder = useCallback(async (id: string) => {
    await api<{ ok: true }>(`/api/vault/folders/${id}`, { method: "DELETE" });
    setFolders((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploadFile = useCallback(
    async (
      folderId: string,
      file: File,
    ): Promise<VaultFile> => {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read file"));
        reader.readAsDataURL(file);
      });

      const created = await api<VaultFile>(
        `/api/vault/folders/${folderId}/files`,
        {
          method: "POST",
          body: JSON.stringify({
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            data,
          }),
        },
      );
      // Bump the file count for the folder in the cached list.
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId ? { ...f, fileCount: f.fileCount + 1 } : f,
        ),
      );
      return created;
    },
    [],
  );

  const deleteFile = useCallback(
    async (folderId: string, fileId: string) => {
      await api<{ ok: true }>(`/api/vault/files/${fileId}`, { method: "DELETE" });
      setFolders((prev) =>
        prev.map((f) =>
          f.id === folderId
            ? { ...f, fileCount: Math.max(0, f.fileCount - 1) }
            : f,
        ),
      );
    },
    [],
  );

  const listFiles = useCallback(async (folderId: string) => {
    const { files } = await api<{ files: VaultFile[] }>(
      `/api/vault/folders/${folderId}/files`,
    );
    return files;
  }, []);

  const downloadFile = useCallback((file: VaultFile) => {
    // Open in a new tab — the browser will receive the attachment headers
    // and either display or save the file based on its mime type.
    window.open(`/api/vault/files/${file.id}/download`, "_blank");
  }, []);

  return {
    folders,
    loading,
    error,
    reload: loadFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFile,
    deleteFile,
    listFiles,
    downloadFile,
  };
}
