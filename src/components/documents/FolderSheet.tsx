import { useEffect, useRef, useState } from "react";
import {
  Download,
  Edit3,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Film,
  Music,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { VaultFile, VaultFolder } from "@/lib/vault";

interface FolderSheetProps {
  folder: VaultFolder;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  onDeleteFile: (file: VaultFile) => Promise<void>;
  onRenameFolder: (folder: VaultFolder) => void;
  onDeleteFolder: (folder: VaultFolder) => void;
  onDownload: (file: VaultFile) => void;
  listFiles: (folderId: string) => Promise<VaultFile[]>;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fileIcon(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("video/")) return Film;
  if (mime.startsWith("audio/")) return Music;
  if (mime === "application/pdf") return FileText;
  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    mime === "text/csv"
  )
    return FileSpreadsheet;
  if (
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("document")
  )
    return FileText;
  return File;
}

export function FolderSheet({
  folder,
  onClose,
  onUpload,
  onDeleteFile,
  onRenameFolder,
  onDeleteFolder,
  onDownload,
  listFiles,
}: FolderSheetProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listFiles(folder.id)
      .then((res) => {
        if (!cancelled) setFiles(res);
      })
      .catch(() => {
        if (!cancelled) setFiles([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [folder.id, listFiles]);

  const handleFiles = async (picked: FileList | null) => {
    if (!picked || picked.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      for (const f of Array.from(picked)) {
        await onUpload(f);
      }
      // Refresh list after upload.
      const fresh = await listFiles(folder.id);
      setFiles(fresh);
    } catch (e: unknown) {
      setUploadError(
        e instanceof Error ? e.message : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (f: VaultFile) => {
    await onDeleteFile(f);
    setFiles((prev) => prev.filter((x) => x.id !== f.id));
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[92vh] flex flex-col shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up"
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ backgroundColor: `${folder.color}22` }}
          >
            <span style={{ color: folder.color }}>📁</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-[#171e19] truncate">
              {folder.name}
            </h2>
            <p className="text-xs text-[#b7c6c2] font-medium">
              {files.length === 0
                ? "Empty folder"
                : `${files.length} ${files.length === 1 ? "file" : "files"}`}
            </p>
          </div>
          <button
            onClick={() => onRenameFolder(folder)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
            aria-label="Edit folder"
          >
            <Edit3 size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Description */}
        {folder.description && (
          <div className="px-6 pb-3">
            <p className="text-xs text-[#b7c6c2] font-medium leading-relaxed">
              {folder.description}
            </p>
          </div>
        )}

        {/* Upload area */}
        <div className="px-6 pb-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            disabled={uploading}
            className={cn(
              "w-full flex items-center gap-3 rounded-[1.5rem] p-4 border-2 border-dashed transition-all",
              dragOver
                ? "border-[#ca0013] bg-red-50"
                : "border-[#b7c6c2]/40 bg-white hover:border-[#ca0013]/50 hover:bg-red-50/40",
              uploading && "opacity-60 pointer-events-none",
            )}
          >
            <div className="w-11 h-11 rounded-2xl bg-[#ca0013]/10 flex items-center justify-center shrink-0">
              {uploading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#ca0013] border-t-transparent animate-spin" />
              ) : (
                <Upload size={20} className="text-[#ca0013]" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-[#171e19]">
                {uploading ? "Uploading…" : "Add files"}
              </p>
              <p className="text-xs text-[#b7c6c2] font-medium">
                Tap to choose, or drop here · up to 10 MB
              </p>
            </div>
            <Plus size={18} className="text-[#b7c6c2]" />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
          {uploadError && (
            <p className="text-xs text-[#ca0013] font-medium mt-2">
              {uploadError}
            </p>
          )}
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-2">
          {loading ? (
            <p className="text-sm text-[#b7c6c2] text-center py-6">
              Loading files…
            </p>
          ) : files.length === 0 ? (
            <div className="bg-white rounded-[1.5rem] p-6 border border-dashed border-[#b7c6c2]/40 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#eeebe3] flex items-center justify-center mb-2">
                <FileText size={20} className="text-[#b7c6c2]" />
              </div>
              <p className="text-sm font-semibold text-[#171e19]">
                No files yet
              </p>
              <p className="text-xs text-[#b7c6c2] font-medium mt-1 max-w-[220px] mx-auto">
                Upload invoices, authorizations, or any document you want
                to keep safe.
              </p>
            </div>
          ) : (
            files.map((f) => {
              const Icon = fileIcon(f.mimeType);
              return (
                <div
                  key={f.id}
                  className="group bg-white rounded-[1.5rem] p-3 border border-[#b7c6c2]/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)] flex items-center gap-3"
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${folder.color}1A` }}
                  >
                    <Icon size={20} style={{ color: folder.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold text-[#171e19] truncate"
                      title={f.originalName}
                    >
                      {f.originalName}
                    </p>
                    <p className="text-[11px] text-[#b7c6c2] font-medium flex items-center gap-1.5">
                      <span>{formatBytes(f.sizeBytes)}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-[#b7c6c2]" />
                      <span>{formatDate(f.createdAt)}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => onDownload(f)}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition shrink-0"
                    aria-label="Download"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => {
                      void handleDelete(f);
                    }}
                    className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#b7c6c2] hover:text-[#ca0013] hover:bg-red-50 active:scale-90 transition shrink-0"
                    aria-label="Delete file"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-3 border-t border-[#b7c6c2]/20 bg-white flex gap-2 shrink-0">
          <button
            onClick={() => onDeleteFolder(folder)}
            className="w-12 h-11 rounded-xl flex items-center justify-center text-[#ca0013] bg-[#eeebe3] hover:bg-red-50 active:scale-95 transition"
            aria-label="Delete folder"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 active:scale-[0.98] transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
