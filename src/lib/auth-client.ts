// Neon Auth client — browser-safe entry points only.
// Talks to the Nitro proxy at /api/auth/*, NOT directly to NEON_AUTH_BASE_URL.
import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react/adapters";

const baseURL = typeof window !== "undefined"
  ? `${window.location.origin}/api/auth`
  : "http://localhost:8080/api/auth";

// better-auth's createDynamicPathProxy walks the proxy chain to build the
// request path. If something coerces an intermediate proxy to a primitive
// (via `${proxy}`, `String(proxy)`, `+proxy`, etc.), the JS engine looks up
// `toString` / `valueOf` / `Symbol.toPrimitive` on the proxy. better-auth's
// `get` trap treats those inherited Object.prototype method names as regular
// path segments and turns them into `/value-of` / `/to-string` segments in
// the URL, which 404 on the server.
//
// Short-circuit primitive coercion at every level of the authClient chain.
function _shouldSkipWrap(v: unknown): boolean {
  if (v === null || (typeof v !== "object" && typeof v !== "function")) return true;
  if (typeof Element !== "undefined" && v instanceof Element) return true;
  if (typeof Window !== "undefined" && v instanceof Window) return true;
  if (typeof HTMLElement !== "undefined" && v instanceof HTMLElement) return true;
  if (v instanceof Date || v instanceof RegExp || v instanceof Promise) return true;
  if (v instanceof Map || v instanceof Set || v instanceof WeakMap || v instanceof WeakSet) return true;
  if (v instanceof Error) return true;
  if (typeof ArrayBuffer !== "undefined" && v instanceof ArrayBuffer) return true;
  if (typeof v === "object") {
    const tag = (v as object).constructor?.name;
    if (tag === "Headers" || tag === "Request" || tag === "Response" || tag === "URL") return true;
  }
  return false;
}

const _proxyCache = new WeakMap<object, unknown>();
function _wrapAuthChain<T>(target: T): T {
  if (_shouldSkipWrap(target)) return target;
  const cached = _proxyCache.get(target as object);
  if (cached) return cached as T;

  const wrapper = new Proxy(target as object, {
    get(t, prop, receiver) {
      if (
        prop === "toString" ||
        prop === "valueOf" ||
        prop === Symbol.toPrimitive
      ) {
        return () => "[object Object]";
      }
      const value = Reflect.get(t, prop, receiver);
      if (_shouldSkipWrap(value)) return value;
      return _wrapAuthChain(value);
    },
  });

  _proxyCache.set(target as object, wrapper);
  return wrapper as T;
}

const _rawAuthClient = createAuthClient(baseURL, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = _wrapAuthChain(_rawAuthClient);

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
