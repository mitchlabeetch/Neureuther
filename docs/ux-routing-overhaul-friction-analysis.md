# Neureuther UX Routing Overhaul — friction analysis

This review applies the UX Friction Analyzer frameworks to the routing-overhaul
spec and the current React/Nitro implementation. Percentages below are planning
assumptions, not measured analytics; they should be replaced with product
telemetry after release.

## Executive summary

- The highest-risk path is first use in the native shell: PIN, session cookies,
  and state requests cross from Capacitor to the deployed API and must remain
  explicit and observable.
- Kitchen is now the shortest route to three daily jobs—rules, meals, and
  groceries—while the persistent nav limits choice to Home, Lists, Spin,
  Kitchen, and More.
- The key flow-state protections are optimistic checks, retry/error feedback,
  preserved editor state, loading skeletons, and a pull-to-refresh escape hatch.

## Decision tree

```text
User opens app
├─ Native shell (estimated 35%)
│  ├─ PIN accepted → state loads → Home (85% of native starts)
│  └─ API/cookie failure → visible error + Retry (15%)
└─ Web (estimated 65%)
   ├─ Continue daily checklist (40%)
   ├─ Kitchen → meals/groceries/rules (35%)
   ├─ Spin/rewards (15%)
   └─ Explore More (10%)
```

The probabilities are prioritization assumptions. The critical invariant is
that every branch has a visible next action and a persistent escape route.

## Journey simulations

| Persona | Path | Cognitive state | Main friction to remove |
| --- | --- | --- | --- |
| Expert | Home → Checklist → toggle 3 tasks | Fast, interruption-sensitive | Full-state refetch and delayed feedback |
| New user | Home → Kitchen → Meals → add recipe | Recognition over recall | Buried destinations and unclear parent route |
| Distracted | Native PIN → Home → Grocery check → background switch | High context-switch cost | Silent API failure and editor resets |
| Explorer | Home → More → Rewards/Money/Documents | Low goal clarity | Too many competing Home zones |
| Completer | Kitchen → Rules → complete all → return Home | Completion-oriented | Device-local rules and no truthful reset |

### Example completer timeline

| Time | Action and response | Load | Friction |
| --- | --- | --- | --- |
| 0:00 | Opens Kitchen from persistent nav | Low | None |
| 0:10 | Sees Rules / Meals / Groceries hub cards | Low | None |
| 0:25 | Taps a rule; optimistic completion appears immediately | Low | Network delay is hidden |
| 0:40 | API fails; rollback + error toast explains recovery | Medium | Recoverable |
| 1:00 | Pulls to refresh or retries banner | Low | No dead end |
| 1:30 | Returns next day; server reset makes status truthful | Low | No stale device state |

## Friction matrix

| Friction point | Users affected | Severity | Difficulty | Priority |
| --- | ---: | ---: | --- | --- |
| Native API/session boundary | 35% | 10 | Medium | P0 |
| Hidden Kitchen/Meals/Groceries routes | 70% | 8 | Easy | P0 |
| Full-state delayed toggle feedback | 80% | 7 | Medium | P1 |
| Recipe form reset during refetch | 15% | 8 | Easy | P1 |
| Local-only rules | 35% | 7 | Medium | P1 |
| Raw internal anchors | 10% | 7 | Easy | P1 |
| Low-contrast secondary text | 100% | 5 | Easy | P2 |
| Destructive actions without undo | 20% | 6 | Medium | P2 |

Priority uses `(affected × severity) / implementation difficulty` as a relative
ranking, not a claim about production volume.

## Impedance and time-loss mapping

| Task | Current impedance | Target impedance |
| --- | --- | --- |
| Open groceries | Home household card or hidden route | Kitchen → Groceries (1 tap after hub) |
| Check an item | Wait for snapshot refetch | Immediate optimistic state |
| Resume recipe edit | Form can be reseeded by poll | Seed once per open session |
| Recover from offline | Silent empty/stale state | Banner, Retry, pull-to-refresh |
| Undo delete | Recreate manually | Sonner Undo action |

The largest repeatable time loss is reorientation after waiting or a failed
mutation. A conservative estimate is 5–15 seconds per state-changing action;
ten such actions in a session can cost 1–2.5 minutes and break flow.

## Recommendations and checklist

### Immediate

- Keep native API origin and credentialed CORS in one resolver contract.
- Make Kitchen the hub and keep the five-slot nav persistent.
- Use optimistic updates with rollback for checklist, subtask, habit, and grocery checks.
- Keep errors actionable and keep dialogs open on save failure.

### Medium-term

- Store Kitchen Rules server-side and reset them by a server date guard.
- Use a shared PageHeader and logical parent routes on hubs/detail screens.
- Prefer muted-ink tokens with AA-safe contrast and 44px touch targets.
- Add Today and Jump back in sections so the Home page has one clear hierarchy.

### Verification checklist

- [x] Native API base, credentialed fetch, and CORS contract are explicit.
- [x] Internal navigation is guarded against raw `/...` anchors.
- [x] Recipe edit state is seeded once per dialog open.
- [x] Kitchen rules have server persistence and a daily reset path.
- [x] High-frequency checks patch and roll back the cached slice.
- [x] Home, Meals, and Groceries expose loading states.
- [ ] Real iOS/Android smoke proof with a deployed API origin.
- [ ] Release proof for cookie behavior on the target native versions.
