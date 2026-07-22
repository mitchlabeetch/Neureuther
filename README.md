# Neureuther

A household organizer for a shared home: daily/long-term/personal checklists, a
chore spin-wheel, points and rewards, meal planning, groceries, money, and a
document vault. Built as a mobile-first PWA that also ships as a native iOS and
Android app via Capacitor.

## Tech stack

- React 19 + TypeScript + Vite 8
- React Router v6 (routes live in `src/App.tsx`)
- Nitro server layer (`server/`) backed by Neon Postgres
- TanStack Query for data fetching/caching (`src/lib/store.tsx`)
- shadcn/ui + Tailwind CSS
- Capacitor 7 for the native iOS/Android shell

## Local development

```bash
npm install
cp .env.example .env   # fill in the server values below
npm run dev            # Vite + Nitro on http://localhost:8080
```

### Environment variables

See `.env.example`. Server values (`DATABASE_URL`, `APP_PIN`,
`NEON_AUTH_BASE_URL`) are read only by `server/` code and must be set on the
host. `VITE_API_BASE_URL` is a client build var — see below.

## API base URL (important for native builds)

The web app and the native app share one compiled bundle (`webDir: dist`), so
the API origin is resolved at runtime in `src/lib/api-base.ts`:

- Web: `getApiBaseUrl()` returns `""`, so every `/api/*` call is same-origin.
  This works on any deploy URL (production and previews) with no config.
- Native: the bundle is served from `capacitor://localhost` (iOS) or
  `http://localhost` (Android) with no backend, so all API calls must target
  the deployed origin. On first import, `api-base.ts` sets
  `window.__API_BASE_URL__` from `VITE_API_BASE_URL` when
  `Capacitor.isNativePlatform()` is true.

Therefore, before building the native app you MUST set the deployed origin:

```bash
# .env (or CI env) for the native build
VITE_API_BASE_URL=https://your-deployed-domain.example.com
```

If this is unset in a native build, the app cannot reach the backend: it will
hang at the PIN screen and no data will load or save.

### CORS

Because native builds call the API cross-origin, `server/middleware/0.cors.ts`
allows the Capacitor origins (`capacitor://localhost`, `http://localhost`,
`https://localhost`, `ionic://localhost`) with credentials and answers CORS
preflight requests. If you serve the API from a different host than the one
listed, add its origin there.

## Native build

```bash
npm run build                 # produces dist/ (with VITE_API_BASE_URL set)
npx cap sync                  # copy web assets + native deps into ios/ & android/
npx cap open ios              # or: npx cap open android
```

## Project conventions

See `AI_RULES.md` for the source layout and Nitro server-route conventions
(routes in `server/routes/api/`, h3 helpers imported from `nitro/h3`).

## Verification

The repository includes phase-specific checks for the routing overhaul:

```bash
# TypeScript and production client/Nitro build
node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json
node node_modules/vite/bin/vite.js build

# Lint and internal React Router anchor guard
node node_modules/eslint/bin/eslint.js .
node scripts/check-internal-anchors.mjs

# Recipe and grocery save-flow smoke test (requires a running API)
CRITICAL_FLOWS_BASE_URL=http://localhost:8080 node --test scripts/test-critical-save-flows.mjs
```

The critical-flow test skips with an explicit message when
`CRITICAL_FLOWS_BASE_URL` is not set. Local static verification does not replace
native iOS/Android smoke testing against the deployed API origin; that remains a
release proof requirement.
