import { useState, useEffect, useCallback } from "react";
import { getApiBaseUrl } from "@/lib/api-base";

const STORAGE_KEY = "neureuther-app-unlocked";

function isUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function setUnlocked(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, "true");
  } catch {
    /* ignore */
  }
}

async function verifyPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch(getApiBaseUrl() + "/api/verify-app-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pin }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function PinGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setLocked(!isUnlocked());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (pin.length !== 4 || checking) return;
    setChecking(true);
    setError("");

    const valid = await verifyPin(pin);
    if (valid) {
      setUnlocked();
      setLocked(false);
    } else {
      setError("Wrong PIN");
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    }
    setChecking(false);
  }, [pin, checking]);

  const handleNumberPress = useCallback(
    (n: string) => {
      if (pin.length < 4) {
        setPin((prev) => prev + n);
        setError("");
      }
    },
    [pin],
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  }, []);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      const timer = setTimeout(() => handleSubmit(), 150);
      return () => clearTimeout(timer);
    }
  }, [pin, handleSubmit]);

  // Still determining lock state
  if (locked === null) return null;

  // Unlocked — render children
  if (!locked) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] bg-[#fdf7f2] flex flex-col items-center justify-center px-6">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#b7c6c2]/10 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#ca0013]/5 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[320px] flex flex-col items-center">
        {/* Logo/Icon */}
        <div className="w-20 h-20 rounded-full bg-white border border-[#b7c6c2]/20 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.08)] flex items-center justify-center text-3xl mb-6">
          🏡
        </div>

        <h1 className="text-2xl font-black text-[#171e19] tracking-tight mb-1">
          Neureuther
        </h1>
        <p className="text-sm text-[#b7c6c2] font-medium mb-8">
          Enter PIN to continue
        </p>

        {/* PIN dots */}
        <div className={`flex gap-3 mb-4 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < pin.length
                  ? error
                    ? "bg-[#ca0013] border-[#ca0013]"
                    : "bg-[#171e19] border-[#171e19]"
                  : "border-[#b7c6c2] bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Error */}
        <div className="h-5 mb-2">
          {error && (
            <p className="text-sm text-[#ca0013] font-medium animate-[fadeIn_0.2s_ease-in-out]">
              {error}
            </p>
          )}
        </div>

        {/* Checking indicator */}
        {checking && (
          <p className="text-xs text-[#b7c6c2] font-medium mb-2">Checking...</p>
        )}

        {/* Number pad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[252px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button
              key={n}
              onClick={() => handleNumberPress(String(n))}
              disabled={checking}
              className="w-[76px] h-[76px] rounded-2xl bg-white border border-[#b7c6c2]/20 text-[#171e19] text-2xl font-bold
                         active:bg-[#eeebe3] active:scale-95 transition-all
                         shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]
                         hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.06)]
                         disabled:opacity-50 disabled:pointer-events-none"
            >
              {n}
            </button>
          ))}
          <button
            onClick={handleBackspace}
            disabled={checking}
            className="w-[76px] h-[76px] rounded-2xl bg-transparent text-[#b7c6c2] text-lg font-semibold
                       active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
            aria-label="Backspace"
          >
            ⌫
          </button>
          <button
            onClick={() => handleNumberPress("0")}
            disabled={checking}
            className="w-[76px] h-[76px] rounded-2xl bg-white border border-[#b7c6c2]/20 text-[#171e19] text-2xl font-bold
                       active:bg-[#eeebe3] active:scale-95 transition-all
                       shadow-[0_4px_16px_-4px_rgba(0,0,0,0.04)]
                       hover:shadow-[0_6px_20px_-6px_rgba(0,0,0,0.06)]
                       disabled:opacity-50 disabled:pointer-events-none"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={pin.length !== 4 || checking}
            className="w-[76px] h-[76px] rounded-2xl bg-[#ca0013] text-white font-bold text-lg
                       disabled:opacity-40 active:scale-95 transition-all
                       shadow-[0_4px_16px_-4px_rgba(202,0,19,0.3)]
                       hover:shadow-[0_6px_20px_-4px_rgba(202,0,19,0.35)]"
            aria-label="Submit PIN"
          >
            {checking ? "···" : "→"}
          </button>
        </div>
      </div>
    </div>
  );
}