// Neon Auth client — browser-safe entry points only.
// Talks to the Nitro proxy at /api/auth/*, NOT directly to NEON_AUTH_BASE_URL.
import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const baseURL = typeof window !== "undefined"
  ? `${window.location.origin}/api/auth`
  : "http://localhost:8080/api/auth";

export const authClient = createAuthClient(baseURL, {
  adapter: BetterAuthReactAdapter(),
});

// Typed accessor: Neo's published types mistype useSession as an Atom,
// but at runtime it's the better-auth/react hook. Cast through unknown.
type SessionState = {
  data: {
    user: {
      id: string;
      name: string;
      email: string;
      emailVerified: boolean;
    };
  } | null;
  isPending: boolean;
};

export const useAuthSession = (): SessionState =>
  (authClient.useSession as unknown as () => SessionState)();