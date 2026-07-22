import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  FileText,
  FolderLock,
  Lock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { CreateFolderDialog } from "@/components/documents/CreateFolderDialog";
import { FolderSheet } from "@/components/documents/FolderSheet";
import { useAuthSession } from "@/lib/auth-client";
import { useVault, type VaultFolder } from "@/lib/vault";

function DocumentsPage() {
  const navigate = useNavigate();
  const session = useAuthSession();
  const {
    folders,
    loading,
    error,
    reload,
    createFolder,
    updateFolder,
    deleteFolder,
    uploadFile,
    deleteFile,
    listFiles,
    downloadFile,
  } = useVault();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultFolder | null>(null);
  const [openFolder, setOpenFolder] = useState<VaultFolder | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VaultFolder | null>(null);

  // ── Auth states ───────────────────────────────────────────────
  if (session.isPending) {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FolderLock size={24} className="text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">
                Documents
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium">Our vault</p>
            </div>
          </div>
        </div>
        <p className="px-5 text-sm text-[#b7c6c2]">Checking your session…</p>
        <BottomNav />
      </div>
    );
  }

  if (!session.data?.user) {
    return (
      <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
        <div className="px-5 pt-14 pb-4 animate-fade-in-up">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19] transition-colors"
          >
            <ArrowLeft size={18} /> Home
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FolderLock size={24} className="text-[#A78BFA]" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">
                Documents
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium">Our vault</p>
            </div>
          </div>
        </div>

        <SignedOutHero
          onSignIn={() => navigate("/auth/sign-in?returnTo=/documents")}
        />

        <BottomNav />
      </div>
    );
  }

  // ── Authenticated view ────────────────────────────────────────
  const totalFiles = folders.reduce((s, f) => s + f.fileCount, 0);

  return (
    <div className="app-container min-h-screen bg-[#fdf7f2] page-content">
      <div className="px-5 pt-14 pb-4 animate-fade-in-up">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-[#b7c6c2] text-sm font-medium mb-3 hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Home
        </button>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
              <FolderLock size={24} className="text-[#A78BFA]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-3xl font-semibold text-[#171e19] tracking-tight">
                Documents
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium">
                {folders.length === 0
                  ? "Our vault"
                  : `${folders.length} ${folders.length === 1 ? "folder" : "folders"} · ${totalFiles} ${totalFiles === 1 ? "file" : "files"}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            className="w-12 h-12 rounded-2xl bg-[#ca0013] text-white flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(202,0,19,0.45)] active:scale-95 transition shrink-0"
            aria-label="New folder"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Trust strip */}
      <div className="px-5 mb-4 animate-fade-in-up" style={{ animationDelay: "40ms" }}>
        <div className="bg-white rounded-[1.5rem] p-3.5 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#69D2A6]/15 flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-[#69D2A6]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171e19]">
              Signed in as {session.data.user.email}
            </p>
            <p className="text-xs text-[#b7c6c2] font-medium leading-snug mt-0.5">
              Files are encrypted at rest, gated by your account, and only
              visible to people you invite.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pb-4">
        {loading ? (
          <p className="text-sm text-[#b7c6c2] text-center py-10">
            Loading your vault…
          </p>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => {
              void reload();
            }}
          />
        ) : folders.length === 0 ? (
          <EmptyFolders
            onCreate={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setOpenFolder(f)}
                className="group text-left bg-white rounded-[1.5rem] p-4 border border-[#b7c6c2]/20 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-[0.98] transition relative overflow-hidden"
              >
                <div
                  className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none"
                  style={{ backgroundColor: f.color }}
                />
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-3 shrink-0"
                  style={{ backgroundColor: `${f.color}22` }}
                >
                  <span style={{ color: f.color }}>📁</span>
                </div>
                <p className="text-sm font-semibold text-[#171e19] truncate">
                  {f.name}
                </p>
                <p className="text-xs text-[#b7c6c2] font-medium mt-0.5">
                  {f.fileCount === 0
                    ? "Empty"
                    : `${f.fileCount} ${f.fileCount === 1 ? "file" : "files"}`}
                </p>
              </button>
            ))}
            <button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
              className="rounded-[1.5rem] p-4 border-2 border-dashed border-[#b7c6c2]/40 bg-transparent hover:border-[#ca0013]/50 hover:bg-red-50/30 active:scale-[0.98] transition flex flex-col items-start"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#eeebe3] flex items-center justify-center mb-3">
                <Plus size={20} className="text-[#171e19]" />
              </div>
              <p className="text-sm font-semibold text-[#171e19]">
                New folder
              </p>
              <p className="text-xs text-[#b7c6c2] font-medium mt-0.5">
                Group documents
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Create / edit folder dialog */}
      <CreateFolderDialog
        open={dialogOpen}
        initial={editing}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        onSave={async (data) => {
          if (editing) {
            await updateFolder(editing.id, data);
          } else {
            await createFolder(data);
          }
        }}
      />

      {/* Folder detail sheet */}
      {openFolder && (
        <FolderSheet
          folder={openFolder}
          onClose={() => setOpenFolder(null)}
          onUpload={async (file) => {
            await uploadFile(openFolder.id, file);
          }}
          onDeleteFile={async (file) => {
            await deleteFile(openFolder.id, file.id);
          }}
          onRenameFolder={(f) => {
            setEditing(f);
            setDialogOpen(true);
            setOpenFolder(null);
          }}
          onDeleteFolder={(f) => {
            setConfirmDelete(f);
            setOpenFolder(null);
          }}
          onDownload={(file) => {
            downloadFile(file);
          }}
          listFiles={listFiles}
        />
      )}

      {/* Delete-folder confirm */}
      {confirmDelete && (
        <ConfirmModal
          title={`Delete "${confirmDelete.name}"?`}
          subtitle="The folder and every file inside will be permanently removed."
          confirmLabel="Delete folder"
          onConfirm={async () => {
            const id = confirmDelete.id;
            setConfirmDelete(null);
            try {
              await deleteFolder(id);
            } catch (e: unknown) {
              alert(e instanceof Error ? e.message : "Could not delete folder");
            }
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <BottomNav />
    </div>
  );
}

function EmptyFolders({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-[#b7c6c2]/20 text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] animate-fade-in-up relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#A78BFA]/10 pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-[#ca0013]/5 pointer-events-none" />
      <div className="relative z-10">
        <div className="w-20 h-20 mx-auto rounded-[1.5rem] bg-purple-50 flex items-center justify-center mb-4">
          <FolderLock size={36} className="text-[#A78BFA]" />
        </div>
        <h3 className="text-lg font-semibold text-[#171e19] tracking-tight">
          Start your vault
        </h3>
        <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 max-w-[260px] mx-auto leading-relaxed">
          Create a folder for every kind of document you want to keep safe
          together — invoices, authorizations, contracts, and more.
        </p>
        <button
          onClick={onCreate}
          className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-[#ca0013] text-white font-semibold text-sm shadow-[0_8px_24px_-8px_rgba(202,0,19,0.45)] active:scale-[0.98] transition"
        >
          <Plus size={18} strokeWidth={2.5} /> Create your first folder
        </button>

        <div className="mt-6 grid grid-cols-3 gap-2 text-left">
          {[
            { title: "Invoices", hint: "Rent, utilities", emoji: "🧾" },
            { title: "Authorizations", hint: "Power of attorney", emoji: "✍️" },
            { title: "Contracts", hint: "Lease, services", emoji: "📜" },
          ].map((s) => (
            <button
              key={s.title}
              onClick={onCreate}
              className="rounded-[1.25rem] p-2.5 bg-white border border-[#b7c6c2]/20 active:scale-95 transition"
            >
              <div className="text-2xl mb-1">{s.emoji}</div>
              <p className="text-[11px] font-semibold text-[#171e19] leading-tight">
                {s.title}
              </p>
              <p className="text-[10px] text-[#b7c6c2] font-medium leading-tight mt-0.5">
                {s.hint}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-white rounded-[1.5rem] p-6 border border-[#b7c6c2]/20 text-center">
      <p className="text-sm font-semibold text-[#ca0013] mb-1">
        Could not load the vault
      </p>
      <p className="text-xs text-[#b7c6c2] font-medium mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="h-10 px-4 rounded-xl bg-[#eeebe3] text-[#171e19] text-sm font-semibold active:scale-95 transition"
      >
        Try again
      </button>
    </div>
  );
}

function ConfirmModal({
  title,
  subtitle,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  subtitle: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm flex items-center justify-center px-5"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-[2rem] w-full max-w-[380px] p-6 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
            <Trash2 className="text-[#ca0013]" size={26} />
          </div>
          <h3 className="text-lg font-semibold text-[#171e19]">{title}</h3>
          <p className="text-sm text-[#b7c6c2] font-medium mt-1.5 px-2">
            {subtitle}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-[#171e19] bg-[#eeebe3] hover:bg-[#b7c6c2]/20 transition-all active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              void onConfirm();
            }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#ca0013] hover:bg-[#b30011] transition-all active:scale-[0.98]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SignedOutHero({ onSignIn }: { onSignIn: () => void }) {
  return (
    <div className="px-5 animate-fade-in-up">
      <div className="bg-white rounded-[2.5rem] p-7 border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#A78BFA]/10 pointer-events-none" />
        <div className="relative z-10">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
            <Lock size={26} className="text-[#A78BFA]" />
          </div>
          <h2 className="text-2xl font-semibold text-[#171e19] tracking-tight mb-1">
            The vault is locked
          </h2>
          <p className="text-sm text-[#b7c6c2] font-medium leading-relaxed mb-5">
            Sign in to safely store invoices, authorizations, and any document
            you don't want to lose. Your files stay encrypted and private.
          </p>
          <button
            onClick={onSignIn}
            className="w-full h-12 rounded-2xl bg-[#ca0013] text-white font-semibold active:scale-[0.98] transition shadow-[0_8px_24px_-8px_rgba(202,0,19,0.45)]"
          >
            Sign in to continue
          </button>

          <div className="mt-5 pt-5 border-t border-[#b7c6c2]/15 space-y-2.5">
            {[
              { icon: ShieldCheck, label: "End-to-end access control" },
              { icon: FileText, label: "Invoices, contracts, and IDs" },
              { icon: Edit3, label: "Pretty safe I mean I think" },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center gap-2.5 text-[#171e19]"
              >
                <row.icon size={15} className="text-[#A78BFA]" />
                <span className="text-sm font-medium">{row.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DocumentsPage;
