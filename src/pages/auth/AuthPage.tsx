import { useParams, useSearchParams } from "react-router-dom";
import { AuthView } from "@neondatabase/auth/react";
import {
  ArrowLeft,
  FileText,
  FolderLock,
  KeyRound,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
  const isSignIn = path === "sign-in";

  return (
    <div className="min-h-screen bg-[#fdf7f2] relative overflow-hidden">
      {/* ── Decorative backdrop ─────────────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-[420px] h-[420px] rounded-full bg-[#A78BFA]/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[360px] h-[360px] rounded-full bg-[#ca0013]/8 blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[380px] h-[380px] rounded-full bg-[#69D2A6]/10 blur-3xl" />
      </div>

      {/* ── Back button ─────────────────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-14 pb-2">
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-1.5 text-[#b7c6c2] text-sm font-medium hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>
      </div>

      {/* ── Main content ────────────────────────────────────────────── */}
      <div className="relative z-10 px-5 pt-6 pb-20 flex flex-col items-center">
        <div className="w-full max-w-[440px]">
          {/* ── Brand block (outside the form card) ────────────────── */}
          <div className="flex flex-col items-center text-center mb-10 animate-fade-in-up">
            <div className="relative mb-7">
              <div className="absolute inset-0 rounded-[2rem] bg-[#A78BFA]/30 blur-2xl scale-150" />
              <div className="relative w-24 h-24 rounded-[2rem] bg-gradient-to-br from-white via-white to-[#f5f0fa] border border-[#A78BFA]/25 flex items-center justify-center shadow-[0_20px_50px_-12px_rgba(167,139,250,0.4)]">
                <FolderLock size={38} className="text-[#A78BFA]" />
              </div>
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#A78BFA] mb-3">
              The Neureuther Vault
            </p>
            <h1 className="text-[1.875rem] leading-[1.15] font-black text-[#171e19] tracking-tight mb-3">
              {isSignIn ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-sm text-[#b7c6c2] font-medium leading-relaxed max-w-[320px]">
              {isSignIn
                ? "Sign in to access the documents and folders you share with your household."
                : "Set up your account to start storing invoices, contracts, and other important files."}
            </p>
          </div>

          {/* ── Form card (spacious, with its own padding) ──────────── */}
          <div
            className="bg-white rounded-[2.5rem] border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] px-7 py-9 sm:px-9 sm:py-10 mb-8 animate-fade-in-up"
            style={{ animationDelay: "100ms" }}
          >
            <AuthView
              path={path || "sign-in"}
              // Preserve the original intent via a fresh param so the
              // NeonAuthUIProvider (which builds its own sign-up/sign-in links)
              // keeps the returnTo through both flows.
              redirectTo={`${returnTo}${returnTo.includes("?") ? "&" : "?"}authed=1`}
            />
          </div>

          {/* ── Trust signals (separate cards, well spaced) ─────────── */}
          <div
            className="space-y-3 mb-7 animate-fade-in-up"
            style={{ animationDelay: "200ms" }}
          >
            <TrustRow
              icon={<ShieldCheck size={18} className="text-[#69D2A6]" />}
              iconBg="bg-[#69D2A6]/15"
              title="Secured by Neon Auth"
              body="Every request is gated by your account. Files stay private."
            />
            <TrustRow
              icon={<KeyRound size={18} className="text-[#A78BFA]" />}
              iconBg="bg-[#A78BFA]/15"
              title="Encrypted at rest"
              body="Your documents are stored encrypted inside our Postgres vault."
            />
            <TrustRow
              icon={<FileText size={18} className="text-[#ca0013]" />}
              iconBg="bg-[#ca0013]/12"
              title="Built for real life"
              body="Invoices, authorizations, contracts, IDs — all in one place."
            />
          </div>

          {/* ── Footer help ──────────────────────────────────────────── */}
          <div
            className="flex flex-col items-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "300ms" }}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b7c6c2]">
              <Sparkles size={11} className="text-[#A78BFA]" />
              Backed by SOC&nbsp;2 controls
            </div>
            <p className="text-xs text-[#b7c6c2] font-medium text-center">
              Need help signing in?{" "}
              <a
                href="mailto:support@neureuther.app"
                className="text-[#171e19] font-semibold hover:underline underline-offset-2"
              >
                Contact support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TrustRow({
  icon,
  iconBg,
  title,
  body,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-[#b7c6c2]/15">
      <div
        className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#171e19] mb-0.5 leading-snug">
          {title}
        </p>
        <p className="text-xs text-[#b7c6c2] font-medium leading-relaxed">
          {body}
        </p>
      </div>
    </div>
  );
}
