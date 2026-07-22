import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { FOLDER_COLORS, type VaultFolder } from "@/lib/vault";

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; color: string; description?: string | null }) => Promise<void>;
  initial?: VaultFolder | null;
}

export function CreateFolderDialog({
  open,
  onClose,
  onSave,
  initial,
}: CreateFolderDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(FOLDER_COLORS[0]);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setColor(initial?.color ?? FOLDER_COLORS[0]);
      setDescription(initial?.description ?? "");
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        name: trimmed,
        color,
        description: description.trim() ? description.trim() : null,
      });
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not save folder");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-[#fdf7f2] rounded-t-[2rem] w-full max-w-[480px] max-h-[92vh] flex flex-col shadow-[0_-20px_60px_-12px_rgba(0,0,0,0.18)] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-[#b7c6c2]/40" />
        </div>

        <div className="flex items-center justify-between px-6 pt-2 pb-3">
          <h2 className="text-lg font-semibold text-[#171e19] tracking-tight">
            {initial ? "Edit folder" : "New folder"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#eeebe3] text-[#171e19]/60 hover:text-[#171e19] active:scale-90 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-5 overflow-y-auto">
          {/* Live preview */}
          <div className="flex items-center gap-3 p-3 rounded-[1.5rem] bg-white border border-[#b7c6c2]/20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]"
              style={{ backgroundColor: `${color}22` }}
            >
              <span style={{ color }}>📁</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#171e19] truncate">
                {name.trim() || "Folder name"}
              </p>
              <p className="text-xs text-[#b7c6c2] font-medium">
                {description.trim() || "No description"}
              </p>
            </div>
          </div>

          {/* Name input */}
          <div>
            <label className="section-header block mb-2">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
              maxLength={80}
              placeholder="e.g. Invoices 2025"
              className="w-full h-12 px-4 rounded-2xl bg-white border border-[#b7c6c2]/30 text-[#171e19] placeholder:text-[#b7c6c2] outline-none focus:border-[#ca0013] focus:ring-1 focus:ring-[#ca0013] transition text-sm font-medium"
            />
          </div>

          {/* Description */}
          <div>
            <label className="section-header block mb-2">
              Description (optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={140}
              placeholder="e.g. Rent, utilities, contractors"
              className="w-full h-12 px-4 rounded-2xl bg-white border border-[#b7c6c2]/30 text-[#171e19] placeholder:text-[#b7c6c2] outline-none focus:border-[#ca0013] focus:ring-1 focus:ring-[#ca0013] transition text-sm font-medium"
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="section-header block mb-2">Icon color</label>
            <div className="flex flex-wrap gap-2.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full transition-all active:scale-90 ${
                    color === c
                      ? "ring-2 ring-offset-2 ring-[#171e19] scale-110"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                >
                  {color === c && (
                    <Check size={16} className="text-white mx-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-[#ca0013] font-medium text-center">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="w-full h-12 rounded-2xl font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
          >
            {saving ? "Saving…" : initial ? "Save changes" : "Create folder"}
          </button>
        </div>
      </div>
    </div>
  );
}
