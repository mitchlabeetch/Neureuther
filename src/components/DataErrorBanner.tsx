import { useApp } from "@/lib/store";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Fixed top banner shown when the app state query fails (e.g. the device is
 * offline or the API is unreachable). Gives the user an explicit signal and a
 * retry, instead of silently showing stale/empty data.
 */
export function DataErrorBanner() {
  const { isError, refetch } = useApp();
  if (!isError) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[95] flex items-center gap-3 px-4 py-2.5 bg-[#ca0013] text-white text-sm font-medium shadow-[0_4px_20px_-4px_rgba(202,0,19,0.4)]"
      style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
    >
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1 leading-tight">
        Can't reach the server. Recent changes may not be saved.
      </span>
      <button
        type="button"
        onClick={() => refetch()}
        className="shrink-0 flex items-center gap-1.5 rounded-full bg-white/20 hover:bg-white/30 px-3 py-1 text-xs font-semibold active:scale-95 transition"
      >
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );
}
