# Stillpoint v1 → v2: implementation plan

v1 was a local-only Vite + React app with a `useReducer` store in localStorage.
v2 adds Google sign-in, per-user cloud data with real-time multi-device sync,
and replaces the study and exam features with notes, meals, workouts and an
extra-spending ledger.

The exact diff against v1 is in [`stillpoint-v2.patch`](stillpoint-v2.patch)
(`git apply docs/stillpoint-v2.patch` on a v1 checkout).

## Key decision: Supabase, not NextAuth

The app is a client-side SPA with no server. NextAuth needs a Next.js server,
which would mean rewriting routing, data loading and every component boundary.
Supabase provides Google OAuth, Postgres, row-level security and Realtime to a
static SPA, so all existing components and logic carry over.

Per-user scoping is enforced in the database (RLS on every table), not just in
client code. Even a buggy or malicious client can only reach its own rows.

## Step-by-step

### Step 1: Database schema and isolation
| File | Change |
| --- | --- |
| `supabase/migrations/20261031120000_stillpoint_v2.sql` | **New.** `users` (mirrors Google profile via trigger), `daily_observations`, `meals`, `workouts`, `non_essential_spendings`, plus `habits`, `habit_completions`, `milestones` so the existing habit features sync too. Check constraints (meal 1–5, workouts 0–4, Monday week starts, positive amounts), natural-key uniques for upserts, composite FK for completions, `updated_at` triggers, forced RLS, grants, realtime publication. |
| `supabase/tests/*` | **New.** Shim for Supabase's `auth` schema + 16 isolation and constraint tests run on real Postgres. |

### Step 2: Data layer (replaces the localStorage reducer)
| File | Change |
| --- | --- |
| `src/data/schema.ts` | **New.** Row types, per-table keys and conflict targets. |
| `src/data/ops.ts` | **New.** Idempotent op model; local apply (incl. cascade), remote merge, outbox folding. |
| `src/data/syncEngine.ts` | **New.** Local-first engine: per-user cache, persisted outbox, ordered flush with backoff, realtime merge, refetch on reconnect/online/focus, rollback on rejection. |
| `src/data/backend.ts` | **New.** `Backend` interface and factory. |
| `src/data/supabaseBackend.ts` | **New.** Supabase client (PKCE), Google sign-in, scoped queries (`.eq('user_id', uid)`), writes, realtime channel. |
| `src/data/memoryBackend.ts` | **New, test-only.** Fake backend for e2e; tree-shaken from production builds. |
| `src/data/legacyImport.ts` | **New.** v1 data or backup → ops, matched by habit name. |
| `src/state/actions.ts` | **New.** The v1 reducer's rules (archive vs delete, back-filling `createdOn`) expressed as ops, plus the new actions. |
| `src/state/view.ts` | **New.** Synced rows → the same `AppState` shape components already read. |
| `src/state/store.tsx` | **Rewritten internals, same API.** `useStore()` still returns `{ state, dispatch, today }` (plus `user`, `sync`), so habit and dashboard components didn't change. |
| `src/state/types.ts` | Study/exam/timer types removed; meal, workout, observation, spending types added. |
| `src/state/selectors.ts` | Habit/streak selectors unchanged; study math removed; meal/week/month helpers added. |
| `src/state/storage.ts` | Now only the device-local theme, export, and v1 detection. |
| `src/state/reducer.ts` | **Deleted** (logic moved to `actions.ts`). |

### Step 3: Authentication
| File | Change |
| --- | --- |
| `src/auth/AuthGate.tsx` | **New.** Boots the backend, restores the session, renders the login splash and rewrites the URL to `/login` when signed out. The store only mounts for a signed-in user, keyed by user id. |
| `src/auth/LoginScreen.tsx` | **New.** Minimal splash with "Continue with Google". |
| `src/components/layout/UserMenu.tsx` | **New** (replaces `DataMenu.tsx`). Avatar, export, v1 import, sign out (warns about unsynced changes; clears device cache). |
| `src/components/layout/SyncIndicator.tsx` | **New.** Synced / Saving / Offline with queued count. |
| `src/main.tsx` | Wires ToastProvider → AuthGate → StoreProvider → App; registers the service worker. |

### Step 4: Features
| File | Change |
| --- | --- |
| `src/components/study/*`, `src/hooks/useStudyTimer.ts` | **Deleted.** Study timer, Live Exam Mode, exam planner, forecast, exam progress. |
| `src/components/journal/ObservationsHub.tsx` | **New.** "Extra Critical Thinking" + "Daily Observations", autosaving, auto-growing. |
| `src/components/body/MealLog.tsx` | **New.** Meal 1–5 checkboxes, inline autosaving notes. |
| `src/components/body/WorkoutTracker.tsx` | **New.** `n / 4` this week, log + undo, previous weeks. |
| `src/components/money/SpendingLedger.tsx`, `SpendingForm.tsx` | **New.** Month total with navigation and comparison; amount/description/category/date form; essentials refused. |
| `src/hooks/useAutosave.ts` | **New.** Debounced draft that never fights remote updates while you type. |
| `src/components/ui/DayContext.tsx` | **New.** "Showing yesterday. Back to today" note for daily panels. |
| `src/lib/money.ts` | **New.** Currency formatting (one `CURRENCY` constant), cents parsing, essential-cost check. |
| `src/lib/date.ts` | Adds `startOfWeek` (Monday), month helpers; removes timer formatting. |
| `src/lib/id.ts` | Always RFC 4122 UUIDs (DB ids are `uuid`); `stableUid` for default habits. |
| `src/components/dashboard/StatStrip.tsx` | Four stats: habits left, streak, meals today, workouts this week. |

### Step 5: Layout, PWA, styling
| File | Change |
| --- | --- |
| `src/App.tsx` | Main column: dashboard, habits, history, notes, milestones. Sidebar: meals, workouts, spending. Phones: four bottom tabs (Today, Body, Notes, Spending). Selected history day drives habits, meals and notes. |
| `src/components/layout/MobileNav.tsx`, `Header.tsx` | Four tabs; safe-area insets; sync status + avatar. |
| `src/index.css` | Deeper slate dark palette; accent colours exposed as Tailwind utilities. |
| `index.html`, `public/manifest.webmanifest`, `public/icon*`, `public/sw.js` | Installable PWA; app-shell cache that never intercepts Supabase traffic; theme-color follows light/dark. |
| `vercel.json`, `public/_redirects` | SPA fallback so `/login` resolves on static hosts. |
| `vite.config.ts`, `package.json`, `.env.example`, `src/vite-env.d.ts` | Single-file build plugin removed (OAuth needs a real origin); vitest; env typing; new scripts. |

## Verification done

- **Database:** 16/16 isolation and constraint tests pass on PostgreSQL 16 (`npm run test:db`).
- **Unit:** 18/18 vitest tests: offline queueing, reload replay, echo suppression, remote deletes, rollback, per-account cache, v1 import idempotence, v1 reducer rules, dates, money parsing.
- **End to end:** 31/31 browser checks with two tabs acting as two devices: `/login` redirect, default habits, live sync both ways, offline queue → reconnect, delete propagation, persistence, past-day selection, v1 backup import, sign-out clearing device data. No console errors.
- **Not covered here:** a real Supabase project and Google OAuth round trip (needs your credentials). The Supabase calls use the documented `supabase-js` v2 API, and the SQL they rely on (RLS, upsert conflict targets) is covered by the Postgres tests.

## Known trade-offs

- Conflict resolution is last-writer-wins per field. Two devices editing the
  same note at the same moment keep whichever save lands last.
- Realtime DELETE events are broadcast unfiltered (a Supabase limitation) and
  expose only row UUIDs. Switch to soft deletes if that matters to you.
- Weeks start on Monday (ISO). To use Sunday, change `startOfWeek` and the
  `isodow` check in the migration together.
