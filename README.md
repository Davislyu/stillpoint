# Stillpoint

Habits, meals, workouts, daily notes and extra spending in a quiet, minimal
dashboard that stays in sync in real time across your phone and desktop.

- **Sign-in:** Google OAuth via Supabase Auth. Signed-out visitors only ever see `/login`.
- **Data:** Supabase Postgres, one row set per user, isolated by row-level security.
- **Sync:** local-first. Changes appear instantly, queue offline, and stream to other devices via Supabase Realtime.
- **App:** React 19 + TypeScript + Tailwind v4 (Vite), installable as a PWA.

See [`docs/UPGRADE.md`](docs/UPGRADE.md) for the v1 → v2 implementation plan
and file-by-file changes, and `docs/stillpoint-v2.patch` for the exact diff.

---

## Setup (about 15 minutes)

### 1. Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema: run each file in `supabase/migrations/` **in filename order** in
   **SQL Editor → New query → Run** (or `supabase link --project-ref <ref>` then `supabase db push`).
   - `20261031120000_stillpoint_v2.sql`: tables, row-level security, realtime
   - `20261031160000_preferences.sql`: per-account theme preferences
3. Check **Database → Publications → supabase_realtime** lists the seven
   Stillpoint tables (the migration adds them).

### 2. Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an
   **OAuth client ID** of type **Web application**.
   - Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
2. In Supabase: **Authentication → Sign In / Providers → Google**. Enable it and paste the client ID and secret.
3. In Supabase: **Authentication → URL Configuration**
   - Site URL: your production address, e.g. `https://stillpoint.example.com`
   - Redirect URLs: add `http://localhost:5173/**` and your production address with `/**`

### 3. Run locally (Node 22.12 or newer)

```bash
cp .env.example .env.local      # fill in URL + anon/publishable key (Settings → API)
npm install
npm run dev                     # http://localhost:5173
```

### 4. Deploy

Any static host works. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
in the host's environment, build with `npm run build`, and serve `dist/`.
SPA rewrites are included for Vercel (`vercel.json`) and Netlify
(`public/_redirects`). Serve over HTTPS so the PWA can install and Google
sign-in can redirect back.

On a phone, open the site and use **Add to Home Screen** to install it.

---

### Google Calendar (optional)

1. Google Cloud → **APIs & Services → Library → Google Calendar API → Enable**.
2. **Google Auth Platform → Data Access → Add scopes →** `.../auth/calendar.events`.
3. Your OAuth web client's **Authorized JavaScript origins** must list every address the app runs on
   (`http://localhost:5173`, your Vercel URL).
4. Set `VITE_GOOGLE_CLIENT_ID` (the public client ID, never the secret).

Calendar access is requested only when you press **Connect** in the Calendar panel. It runs entirely in the
browser with Google Identity Services; tokens last an hour, then one tap refreshes. While the Google app is in
"Testing", only listed test users can connect.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm test` | Unit tests (sync engine, outbox, actions, dates, money) |
| `npm run test:db` | Applies the migration to a throwaway Postgres DB and runs the isolation tests. Needs `PGURI=postgres://user:pass@localhost/postgres` |
| `npm run dev:e2e` / `build:e2e` | Runs the app against an in-browser fake backend (no Supabase needed). Test-only; tree-shaken from normal builds |

## Features

| Section | What it does |
| --- | --- |
| Dashboard | Greeting; stat strip (habits left, ≥50% streak, meals today, workouts this week); Today's Focus |
| Habits | Tick list, edit/add/archive, 14-day history (tap a day to back-fill), streak milestones |
| Thinking and observations | Two autosaving notes per day: **Extra Critical Thinking** and **Daily Observations** |
| Meals | Exactly five checkboxes, Meal 1–5, each with an inline autosaving note |
| Workouts | Four per ISO week (Mon–Sun): `n / 4` progress, one-tap logging, undo, previous 7 weeks |
| Extra spendings | Amount, description, category, date; running total for the month with month-to-month comparison; essentials (groceries, rent, bills…) are refused |

| Calendar | Today's and the next 3 days' Google Calendar events; add workouts, habit reminders (daily/weekly) or custom events |
| Themes | 13 themes, each with its own type, shapes, textures and voice: Stillpoint, Geek, Bullet Journal, Synthwave, Manuscript, Brutalist, Pocket 8-bit, Zen, Blueprint, Retro OS, Cottage, Kawaii, Abyss. Synced to your account |
| Game | XP and levels, a class from your five attributes, 3 daily quests + a weekly one, 300 achievements across 8 categories and 6 rarities (11 secret), unlock and level-up celebrations |

Selecting a past day in the 14-day history also switches the meals and notes
panels to that day.

### How the game works

- **XP** comes from what you do (habit ticks 10, perfect day +25, meal 5, all five +15, workout 50,
  full week +60, a note 20, critical thinking +15, writing up to +100/day, quests 30–45, a cleared board +50)
  plus each achievement's reward (20 / 50 / 100 / 250 / 500 / 1,000 by rarity).
- **Levels** follow `50 × L × (L−1)` total XP: level 2 at 100, 10 at 4,500, 20 at 19,000.
- **Class** comes from your top attribute (STR workouts, VIT meals, DEX habits, INT notes, GLD spending sense);
  a close second gives a hybrid (Monk, Paladin, Sage…).
- **Nothing game-related is stored** except which achievements you've earned (in `milestones`), so XP can never
  drift from what you actually did. Earned achievements never re-lock.
- The catalog lives in `src/game/achievements.ts` and is tested to be exactly 300 with unique, valid IDs.

## How sync works

```
 tap ─► actionToOps() ─► apply locally ─► outbox (localStorage, per user) ─► Supabase (RLS)
                              ▲                                                 │
                              └──── Realtime: other devices' changes ◄──────────┘
```

- Every change becomes an idempotent op (`upsert` / `update` / `delete`) with
  a client-generated UUID, so retries never duplicate rows.
- Natural-key rows (meals, notes, workouts) send only the changed columns,
  so editing a meal note on one device and ticking it on another doesn't clobber either.
- While an op for a row is queued, incoming realtime changes for that row
  are ignored (the local edit is newer). After a reconnect, coming back online,
  or refocusing the tab, the app reloads from the server and replays the queue on top.
- A change the database refuses (e.g. a constraint) is rolled back with a notice.
- Signing out clears the account's cache and queue from the device.

## Security model

- Every table has `user_id ... default auth.uid()` and **forced** RLS with a
  single owner-only policy for the `authenticated` role. `anon` has no grants.
- `habit_completions` references habits through a composite `(habit_id, user_id)`
  foreign key, so a forged id can't attach data to someone else's habit.
- Profile email is read-only to clients; profiles are created by a
  `security definer` trigger on `auth.users`.
- Client queries also filter by `user_id` explicitly (defence in depth).
- The anon key in the browser is public by design; RLS is the boundary.
- Realtime DELETE events can't be filtered server-side and carry only the
  row's UUID; clients ignore ids they don't hold.

`supabase/tests/rls.test.sql` proves the above against real Postgres: a
second user can't read, update, delete or forge rows; anonymous access fails;
deleting an account cascades.

## Project layout

```
supabase/
  migrations/…_stillpoint_v2.sql   schema, RLS, triggers, realtime publication
  tests/                           Postgres isolation tests + runner
src/
  main.tsx                         providers, auth gate, service worker
  App.tsx                          layout, mobile tabs, milestone watcher
  auth/                            AuthGate (/login redirect), LoginScreen
  data/
    schema.ts                      row types, keys, conflict targets
    ops.ts                         op model: apply, remote merge, outbox folding
    syncEngine.ts                  local-first sync engine
    backend.ts                     Backend interface + factory
    supabaseBackend.ts             Supabase auth, queries, writes, realtime
    memoryBackend.ts               test-only fake (two tabs = two devices)
    legacyImport.ts                v1 → v2 habit history import
  state/
    actions.ts                     user intents → ops (v1 reducer rules kept)
    view.ts                        rows → AppState read model
    selectors.ts                   streaks, completion, meals, weeks, money
    store.tsx                      useStore(): { state, dispatch, today, user, sync }
  components/
    dashboard/ habits/             (unchanged from v1 apart from the stat strip)
    journal/ObservationsHub.tsx
    body/MealLog.tsx, WorkoutTracker.tsx
    money/SpendingLedger.tsx, SpendingForm.tsx
    layout/Header, UserMenu, SyncIndicator, ThemeToggle, MobileNav
  themes/
    registry.ts                    theme list + each theme's voice (titles, greetings, labels)
    vibe.tsx                       ThemeProvider: applies, syncs, gallery mode
    css/<theme>.css                one stylesheet per theme, code-split with its fonts
  game/
    stats.ts                       lifetime stats in one pass over your data
    achievements.ts                the 300-achievement catalog
    engine.ts                      XP, levels, class, daily quests
    GameProvider.tsx               saves unlocks, queues celebrations
  calendar/google.ts               Google Calendar client (+ test fake)
public/  manifest, icons, sw.js (app-shell cache; never touches Supabase traffic)
legacy/  stillpoint-v1.html: the old offline app, kept so you can export v1 data
```

## Moving v1 data over

v1 kept data in the browser it ran in. To bring habit history into your account:

1. Open `legacy/stillpoint-v1.html`, then **⋯ → Download a backup**.
2. In v2, open the avatar menu and choose **Import a v1 backup file**.

Habits are matched by name, so history lands on the existing habit, and
importing twice adds nothing. Study sessions and exams aren't imported, since
those features were removed.
