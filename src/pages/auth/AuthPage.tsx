import { useParams, useSearchParams } from "react-router-dom";
import { AuthView } from "@neondatabase/auth/react";

/**
 * Whitelist the path the user should land on after a successful auth.
 * Only same-origin internal paths are accepted — any absolute URL,
 * protocol-relative URL, or non-string value falls back to "/".
 * This blocks open-redirect attacks (e.g. `returnTo=//evil.com`).
 */
function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  return raw;
}

export default function AuthPage() {
  const { path } = useParams<{ path: string }>();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  return (
    <div className="min-h-screen bg-[#fdf7f2] flex items-center justify-center px-5">
      {/* Decorative elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-[#b7c6c2]/10 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-[#ca0013]/5 pointer-events-none" />

      <div className="relative z-10 w-full max-w-[380px] bg-white rounded-[2.5rem] border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-8 animate-fade-in-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-white border border-[#b7c6c2]/20 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.06)] flex items-center justify-center text-2xl mb-3">
            🔒
          </div>
          <h2 className="text-xl font-black text-[#171e19] tracking-tight">
            Vault
          </h2>
          <p className="text-sm text-[#b7c6c2] font-medium mt-1">
            {path === "sign-in" ? "Welcome back" : "Create your account"}
          </p>
        </div>

        <AuthView
          path={path || "sign-in"}
          // Preserve the original intent via a fresh param so the
          // NeonAuthUIProvider (which builds its own sign-up/sign-in links)
          // keeps the returnTo through both flows.
          redirectTo={`${returnTo}${returnTo.includes("?") ? "&" : "?"}authed=1`}
        />
      </div>
    </div>
  );
}