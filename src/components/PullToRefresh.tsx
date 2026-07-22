import { useRef, useState } from "react";
import type { ReactNode, TouchEvent } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "@/lib/store";

const TRIGGER_DISTANCE = 72;

export function PullToRefresh({ children }: { children: ReactNode }) {
  const { refetch } = useApp();
  const startY = useRef<number | null>(null);
  const [distance, setDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (event: TouchEvent) => {
    if (window.scrollY === 0 && !refreshing) startY.current = event.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (event: TouchEvent) => {
    if (startY.current === null) return;
    const delta = (event.touches[0]?.clientY ?? 0) - startY.current;
    if (delta > 0) setDistance(Math.min(delta, TRIGGER_DISTANCE + 24));
  };
  const onTouchEnd = async () => {
    if (startY.current === null) return;
    const shouldRefresh = distance >= TRIGGER_DISTANCE;
    startY.current = null;
    setDistance(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {(distance > 0 || refreshing) && (
        <div className="fixed top-2 inset-x-0 z-[90] flex justify-center pointer-events-none" aria-live="polite">
          <div className="rounded-full bg-surface border border-[#b7c6c2]/20 shadow-card px-3 py-2 text-muted-ink text-xs font-semibold flex items-center gap-2">
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : distance >= TRIGGER_DISTANCE ? "Release to refresh" : "Pull to refresh"}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
