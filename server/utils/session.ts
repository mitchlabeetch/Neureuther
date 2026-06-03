// Session helper — reads the current user session from Neon Auth by
// forwarding the user's cookie to ${NEON_AUTH_BASE_URL}/get-session.
// There is no `auth` instance in the Vite + Nitro path — this is the
// replacement for `auth.getSession({ headers })`.
const NEON_AUTH_BASE_URL = process.env.NEON_AUTH_BASE_URL;

if (!NEON_AUTH_BASE_URL) {
  throw new Error("Missing NEON_AUTH_BASE_URL environment variable");
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

export type Session = { user: SessionUser } | null;

export async function getSessionFromCookie(
  cookieHeader: string | null,
): Promise<Session> {
  if (!cookieHeader) return null;

  // Restore upstream cookie names (same rewrite as the proxy on the way up)
  const cookie = cookieHeader
    .replaceAll("__Secure_", "__Secure-")
    .replaceAll("__Host_", "__Host-");

  const res = await fetch(`${NEON_AUTH_BASE_URL}/get-session`, {
    headers: { cookie },
  });

  if (!res.ok) return null;

  const data = await res.json();
  if (!data?.user) return null;

  return data as Session;
}