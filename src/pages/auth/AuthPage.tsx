import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, FolderLock, Lock } from "lucide-react";
import { authClient, refreshSession } from "@/lib/auth-client";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const isSignIn = path !== "sign-up";

  const switchHref = `/auth/${isSignIn ? "sign-up" : "sign-in"}?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <div className="min-h-screen bg-[#fdf7f2] flex flex-col">
      {/* Top bar */}
      <div className="px-5 pt-14 pb-2">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[#b7c6c2] text-sm font-medium hover:text-[#171e19] transition-colors"
        >
          <ArrowLeft size={18} /> Home
        </button>
      </div>

      {/* Card centered vertically */}
      <div className="flex-1 flex items-center justify-center px-5 pb-10">
        <div className="w-full max-w-[400px]">
          <div className="bg-white rounded-[2.5rem] border border-[#b7c6c2]/20 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] p-7 sm:p-8">
            {/* Header */}
            <div className="text-center mb-7">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-[#A78BFA]/15 items-center justify-center mb-4">
                {isSignIn ? (
                  <FolderLock size={26} className="text-[#A78BFA]" />
                ) : (
                  <Lock size={26} className="text-[#A78BFA]" />
                )}
              </div>
              <h1 className="text-2xl font-black text-[#171e19] tracking-tight mb-1.5">
                {isSignIn ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-[#b7c6c2] font-medium">
                {isSignIn
                  ? "Sign in to access your vault"
                  : "Set up your secure document vault"}
              </p>
            </div>

            {/* Form */}
            {isSignIn ? (
              <SignInForm returnTo={returnTo} />
            ) : (
              <SignUpForm returnTo={returnTo} />
            )}
          </div>

          {/* Switch mode */}
          <p className="text-center text-sm text-[#b7c6c2] font-medium mt-5">
            {isSignIn ? "New here? " : "Already have an account? "}
            <Link
              to={switchHref}
              className="text-[#171e19] font-semibold hover:underline underline-offset-2"
            >
              {isSignIn ? "Create an account" : "Sign in"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Sign in ────────────────────────────────────────────────────────
function SignInForm({ returnTo }: { returnTo: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: email.trim(),
        password,
      });
      if (authError) {
        setError(authError.message || "Invalid email or password.");
        setLoading(false);
        return;
      }
      // Make sure the in-memory session store sees the new cookies, then
      // hard-navigate so the destination page boots with a fresh session
      // fetch (avoids a stale "no session" render on the new mount).
      await refreshSession();
      window.location.assign(returnTo);
      return;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
        autoFocus
      />

      <div>
        <Field
          label="Password"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="Your password"
          autoComplete="current-password"
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-[#b7c6c2] hover:text-[#171e19] active:scale-90 transition"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />
        <div className="flex justify-end mt-1.5">
          <button
            type="button"
            onClick={() => {
              window.location.href = "mailto:support@neureuther.app?subject=Password%20reset";
            }}
            className="text-xs font-medium text-[#b7c6c2] hover:text-[#171e19] transition"
          >
            Forgot password?
          </button>
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#ca0013] font-medium text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-2xl font-bold text-white bg-[#ca0013] hover:bg-[#b30011] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

// ── Sign up ────────────────────────────────────────────────────────
function SignUpForm({ returnTo }: { returnTo: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your email and a password.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signUp.email({
        email: email.trim(),
        password,
        name: name.trim() || email.trim().split("@")[0],
      });
      if (authError) {
        setError(authError.message || "Could not create your account.");
        setLoading(false);
        return;
      }
      // Same reasoning as the sign-in form: refresh the in-memory session
      // store, then hard-navigate so the destination page boots cleanly.
      await refreshSession();
      window.location.assign(returnTo);
      return;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field
        label="Name"
        type="text"
        value={name}
        onChange={setName}
        placeholder="Your name"
        autoComplete="name"
        autoFocus
      />
      <Field
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Field
        label="Password"
        type={showPassword ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        autoComplete="new-password"
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="text-[#b7c6c2] hover:text-[#171e19] active:scale-90 transition"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        }
      />

      {error && (
        <p className="text-sm text-[#ca0013] font-medium text-center">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-2xl font-bold text-white bg-[#ca0013] hover:bg-[#b30011] disabled:bg-[#eeebe3] disabled:text-[#b7c6c2] active:scale-[0.98] transition"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}

// ── Reusable field ─────────────────────────────────────────────────
interface FieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  rightIcon?: React.ReactNode;
}

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  rightIcon,
}: FieldProps) {
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#b7c6c2] block mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          className="w-full h-12 px-4 pr-11 rounded-2xl border border-[#b7c6c2]/30 bg-white text-[#171e19] placeholder:text-[#b7c6c2] outline-none focus:border-[#ca0013] focus:ring-1 focus:ring-[#ca0013] text-sm font-medium transition"
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
}
