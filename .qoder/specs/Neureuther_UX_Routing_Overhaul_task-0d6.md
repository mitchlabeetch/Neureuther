# Neureuther UX, UI, Routing and Feature Overhaul

## Summary

Full-app review complete. The app is a React 19 + Vite 8 + React Router v6 SPA with a Nitro/Neon backend, packaged for iOS/Android via Capacitor. The visual language and backend are solid; the problems are plumbing and information architecture.

Root causes of the reported failures (confirmed in code):
- The installed native app cannot reach the backend. Nothing sets `window.__API_BASE_URL__`, `capacitor.config.ts` has no `server.url`, `PinGate` and `auth-client` use hardcoded/`window.location.origin` relative paths, so every `/api/*` call resolves against `capacitor://localhost` (no server). The user is likely stuck at the PIN gate; if past it, state never loads and saves fail.
- Home "Household" links use raw `<a href>` (full reload on web, can white-screen on native).
- Recipe edits reset mid-typing because the editor re-seeds from the live store on the 60s background refetch; save failures show no toast.
- The bottom nav exposes only 5 of ~14 destinations, so Meals/Groceries/Money/Kitchen/Documents are buried and hard to find.

## Decisions Locked
- Failing environment: installed native app. Native API/auth wiring is the top P0.
- Navigation model: Kitchen as hub. Rename the cleaning screen to "Kitchen Rules"; Kitchen becomes the parent of Rules + Meals + Groceries.

## Phase 0 - Native Pipeline + P0 Correctness (highest priority)

Goal: PIN unlock, state load, and all saves work in the packaged iOS/Android app and on web.

- Create one shared API-base helper `src/lib/api-base.ts` exporting `getApiBaseUrl()` (move the logic from `src/lib/store.tsx` L208-219) so every caller uses the same origin.
- Native bootstrap in `src/main.tsx` (currently 5 lines): before `createRoot`, if `Capacitor.isNativePlatform()` set `window.__API_BASE_URL__` from `import.meta.env.VITE_API_BASE_URL` (production API origin).
- Fix `src/components/PinGate.tsx` L21-32: `verifyPin` uses hardcoded `fetch("/api/verify-app-pin")`. Route it through `getApiBaseUrl()` + `credentials: "include"`. This is the first native wall.
- Fix `src/lib/auth-client.ts` L6-8: `baseURL` uses `window.location.origin`. On native use the configured API origin instead so `/api/auth/*` reaches the server.
- Add `credentials: "include"` to the shared `api()` fetch in `src/lib/store.tsx` L221-241.
- Nitro CORS: add a server middleware/route-rule allowing the native origins (`capacitor://localhost`, `http://localhost`, `ionic://localhost`) with credentials; ensure session/PIN cookies use `SameSite=None; Secure`. Configure in `nitro.config.ts` or a new `server/middleware/cors.ts`.
- Add `VITE_API_BASE_URL` build var and document the native build steps in `README.md` (currently a stub).
- Replace in-app raw anchors with SPA nav: `src/pages/Index.tsx` L216-263 (`/checklists`, `/money`, `/kitchen`, `/documents`) and `src/pages/NotFound.tsx` L19, using `Link`/`navigate()`. Keep `mailto:` in `AuthPage` as-is.
- Fix recipe edit-reset in `src/components/meals/RecipeEditorDialog.tsx` L61-86: seed form state once per open (guard with a ref or depend only on stable `recipe?.id` + `open`), so background refetches don't wipe in-progress edits. Audit `MealSlotDialog` for the same pattern.
- Add save feedback in `RecipeEditorDialog.tsx` L90-113: wrap in try/catch, `showError` on failure (keep dialog open), `showSuccess` on success. Helpers exist in `src/utils/toast.ts`.
- Add a global data-error/offline banner driven by `stateQuery.isError` (exposed at `src/lib/store.tsx` L1283-1285) with a Retry that calls `refetch()`.

Acceptance: fresh native install unlocks with the PIN, loads state, and can create a grocery list and edit a recipe that persists after reopening; internal links never trigger a full reload; a simulated 500 surfaces a toast.

## Phase 1 - Navigation and Information Architecture (Kitchen hub)

Goal: any feature reachable in <=2 taps from a persistent, predictable nav.

- Redesign `src/components/BottomNav.tsx` to 5 slots with the Spin FAB retained as the elevated center: Home | Checklists | Spin (FAB) | Kitchen | More. Swap the Spin icon from `HelpCircle` to a wheel/`Disc` icon.
- Fix active-state logic (currently `location.pathname === to`) to `pathname === to || pathname.startsWith(to + "/")` so nested routes keep their tab highlighted.
- Add a "More" bottom sheet launcher containing every secondary destination: Rewards, Money, Documents, Daily Habits (per person), Settings, and Archives. Rationale: Home already surfaces a large Rewards CTA and daily-habit cards, and Kitchen (meals/groceries/rules) is daily-use with zero persistent access today. Swapping Kitchen and Rewards in the tab row is a one-line change if preferred.
- Make Kitchen a hub in `src/pages/Kitchen.tsx`: rename the cleaning list to "Kitchen Rules", and present a top set of hub cards for Rules, Meals, Groceries (Meals/Groceries buttons already exist at L175-204). Keep Kitchen as the back target for Meals and Groceries (already the case).
- Introduce a shared `PageHeader` component (title + consistent back that returns to the logical parent, with Home always reachable) and adopt it across pages to end the inconsistent back behavior (currently `/kitchen` back to `/`, Meals back to `/kitchen`, AllChecklists back to `/checklist`). Add lightweight breadcrumbs on nested checklist/detail pages.

Acceptance: from any screen a user reaches any feature in <=2 taps; the active nav item reflects the current section on nested routes; no screen dead-ends on back.

## Phase 2 - Perceived Performance and Reliability

Goal: instant-feeling interactions; honest, synced data.

- Add React Query optimistic updates (`onMutate` cache patch + rollback + `onSettled` invalidate) for high-frequency toggles in `src/lib/store.tsx`: checklist items, subtasks, personal-checklist tasks, grocery main and list checks. Biggest perceived-reliability win.
- Scope invalidation: patch specific cache slices instead of invalidating the whole `/api/state` snapshot on every mutation.
- Server-back Kitchen rules (`src/pages/Kitchen.tsx` L52-133 currently uses `localStorage`): add a `kitchen_rules` table + API, and implement the real daily reset the UI already claims (mirror `resetChecklistIfNeeded` in `server/utils/state.ts` L187-217). Alternatively, if rules stay device-local, remove the false "resets every day" copy at L256.
- Add loading skeletons for first load on Home, Meals, and Groceries.

Acceptance: checking an item updates the UI in under ~100ms; kitchen rules sync across devices and reset as described.

## Phase 3 - UI Polish and Design System

- Tokenize the design system: lift repeated hex values (`#FDA172`, `#171e19`, `#b7c6c2`, `#fdf7f2`), radii, and shadows into Tailwind theme tokens + CSS variables in `tailwind.config.ts`/`globals.css`.
- Accessibility: re-enable pinch-zoom in `index.html` L5 (remove `maximum-scale=1.0, user-scalable=no`, keep `viewport-fit=cover`); audit `#b7c6c2` text on cream for WCAG AA contrast; ensure 44px touch targets on grocery-row remove and pantry-chip delete; add `aria-live` on toasts.
- Reduce Home cognitive load (`src/pages/Index.tsx`): consolidate the four competing action zones (Quick Actions, Household grid, Rewards CTA, Daily Habits) into one clear hierarchy - hero progress, a "Jump back in" row, and a single scannable grid.
- Standardize iconography and add the BottomNav-style tooltips to other icon-only buttons.

## Phase 4 - Feature Enhancements

- Plan-to-Shop automation: the Groceries hint at `src/pages/Groceries.tsx` L307-314 promises planned-meal ingredients auto-populate the main list, but no code does this. Wire meal-plan entry creation to add the recipe's ingredients to the main grocery list with de-dupe.
- Home "Today" dashboard: unified view of today's checklist percentage, today's planned meals, and each person's daily-habit status (data already computed in `Index.tsx` L60-74).
- Undo toasts (Sonner action button) for destructive deletes (recipe, list, item).
- Native niceties: Capacitor Haptics (already a dependency) on toggles/spin; pull-to-refresh to replace or complement the 60s poll.

## Phase 5 - Hardening

- Add an ESLint rule (or CI grep check) banning internal `<a href="/...">` to prevent regression of the Phase 0 nav fix.
- Add a focused test pass on the critical save flows (recipe create/edit, grocery list create/update).
- Finalize README with the Capacitor API-base and CORS setup.

## Cross-Cutting Verification
- Manual native smoke test after Phase 0 and after Phase 1 on a real iOS/Android build.
- Web regression check that SPA nav preserves state (no full reloads).

## Assumptions
- A deployed backend origin (Vercel/Nitro) is available to point the native build at; if not yet deployed, Phase 0 includes standing up that origin as a prerequisite.
- Rewards remains reachable primarily via the Home CTA and the More sheet; if Rewards must stay a bottom-nav tab, swap it with Kitchen (documented one-line change).
- The full phased plan (Phases 0-5) is formalized here; implementation will proceed phase by phase, starting with Phase 0.