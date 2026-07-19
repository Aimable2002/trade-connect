
# CopyDesk — Build Plan

A mobile-first, dark, data-dense copy-trading UI for MT5. Uses the user's existing external Supabase project (`txdcattalsgunfolplvs`) directly — not Lovable Cloud — plus a FastAPI backend at an ngrok URL for account provisioning.

## Configuration

- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (their anon key), and `VITE_API_BASE_URL` (ngrok URL) as env vars. All three read via `import.meta.env` — nothing hardcoded, so swapping the ngrok URL later is a one-line change.
- Instantiate a browser-only Supabase client at `src/lib/supabase.ts` using those envs, with session persistence.
- No Lovable Cloud enable, no `_authenticated/` integration layout — this project brings its own Supabase. Route protection is a hand-written pathless layout that checks `supabase.auth.getSession()` client-side and redirects to `/auth`.

## Design system (src/styles.css)

- Dark-only theme. Near-black background (`oklch(~0.15)`), one step lighter for cards, subtle borders.
- Accent: **cyan** (`oklch(~0.75 0.13 220)`) for interactive elements — reserved away from P&L colors.
- Semantic tokens: `--profit` (green), `--loss` (red), `--warning` (amber), `--accent` (cyan), plus `--risk-low/mid/high` on a separate green→amber→red scale visually distinct from P&L (slightly desaturated, different hue anchors).
- Typography: **JetBrains Mono** for all numeric values (balances, lots, prices, %), Inter for UI text. Loaded via `<link>` in `__root.tsx` head.
- `.tabular-nums` utility applied to numeric cells so digits don't jitter as live values update.
- `@utility flash-update` — a 400ms background pulse animation triggered on value change, subtle.

## Routes

```
src/routes/
  __root.tsx                 # dark shell, fonts, meta
  index.tsx                  # redirect: session → /dashboard, else /auth
  auth.tsx                   # sign up / log in (Supabase Auth, email+password)
  _app.tsx                   # pathless protected layout: session check + bottom tab nav (mobile) / side nav (desktop)
  _app.onboarding.tsx        # role picker → master or follower flow
  _app.dashboard.tsx         # user's own accounts, live
  _app.masters.tsx           # master directory (placeholder data)
  _app.leaderboard.tsx       # ranked masters + risk badges (placeholder data)
  _app.history.tsx           # trade history per account (placeholder data)
  _app.settings.tsx          # edit follower subscription; pause/resume/close (placeholder actions)
```

Post-signup: if the user has no rows in `accounts`, `_app.dashboard.tsx`'s loader redirects to `/onboarding`.

## Data layer

- **Auth**: `supabase.auth.signUp/signInWithPassword`, single `onAuthStateChange` listener in `__root.tsx` invalidates router + query cache.
- **Reads** (accounts, subscriptions) via `@tanstack/react-query` + Supabase client, keyed by user id.
- **Live state** (`live_account_state`): Supabase Realtime channel subscribed per account_id. On each row update, write into React Query cache and briefly apply `flash-update` class to changed values. No polling.
- **Provisioning** (`POST /accounts/provision`): a typed `provisionAccount()` helper that reads `VITE_API_BASE_URL`, attaches `Authorization: Bearer ${session.access_token}`, uses a 60s timeout, and shows a multi-stage progress UI ("Connecting to broker… Spinning up terminal… Syncing balance…") over ~45s — not a spinner. On non-2xx, surface `detail` verbatim.

## Onboarding flow

- Step 1: role select (Master / Follower) — two large cards.
- Step 2 (Master): MT5 login / password / server → submit → progress UI → success → `/dashboard`.
- Step 2 (Follower): MT5 login / password / server, master picker (placeholder list clearly labeled "Sample masters — real directory coming soon"), multiplier (number input), `sizing_mode` as a segmented control restricted to exactly `fixed_multiplier` | `balance_proportional` | `fixed_master_balance_percentage`. Submit → same progress UI.

## Dashboard

- One card per row in `accounts`. Header: role badge (MASTER/FOLLOWER), status pill (live/offline/paused, color-coded), account_id truncated.
- Body: large monospace balance + equity, delta from previous tick in green/red, open positions count. Values pulse on realtime update.
- If both a master and follower account exist, both cards stacked (mobile) or side-by-side (≥md).

## Placeholder pages

Each clearly banners "Preview data — live feed coming soon" so it's never mistaken for real state.

- **Masters directory**: cards with display name (never raw MT5 login), 30d return, followers count, risk badge.
- **Leaderboard**: ranked table with rank, display name, composite score, separate 1–10 risk badge on the distinct risk scale.
- **Trade history**: per-account table of copied trades — opened at, symbol, side (buy/sell colored), lots, status, P&L (colored when closed).
- **Settings**: editable multiplier + sizing_mode segmented control for each follower subscription; Pause/Resume/Close buttons rendered but disabled with a "coming soon" tooltip.

## Mobile-first specifics

- Base layout targets 375px width; bottom tab bar (Dashboard, Masters, Leaderboard, History, Settings) on mobile, promoted to a left rail at `md:`.
- Numeric cells use `tabular-nums` and truncate account ids with a copy button.
- Tap targets ≥44px; forms use `inputMode="numeric"` where appropriate.

## Technical details

- **Stack**: TanStack Start (existing), TanStack Query for server state, Supabase JS client for both auth and Realtime, Zod for form validation.
- **Files added**:
  - `src/lib/supabase.ts` — client factory
  - `src/lib/api.ts` — `provisionAccount()` + typed error handling
  - `src/lib/queries.ts` — query options for accounts/subscriptions
  - `src/hooks/useLiveAccountState.ts` — Realtime subscription + flash trigger
  - `src/components/` — `AccountCard`, `NumericValue` (handles flash + monospace), `StatusPill`, `RiskBadge`, `ProgressStages`, `RoleBadge`, `SizingModeSelect`
  - route files listed above
- **No server functions**: all data access is browser-side against the user's Supabase and the ngrok backend. No `createServerFn`, no `requireSupabaseAuth`, no `client.server.ts`.
- **Env vars set via secrets tool** in build mode before first run so the app doesn't crash on missing config.

## Out of scope (per spec)

Real endpoints for master directory, leaderboard, trade history, and pause/resume/close — placeholder UI only, wired to mock data with clear labeling.
