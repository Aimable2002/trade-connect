# CopyDesk — Phase 2: Wallet, billing, account details, public insight

## Scope

Restructure the app around one operational page per account and one public page per master. Strip Settings to user-level items only. Fix mobile tables. Enrich master cards. Add pricing/wallet onboarding.

## New API surface (`src/lib/api.ts`)

Add typed wrappers, all using existing `authedFetch`:

- Master: `getMasterRate`, `setMasterRate({rate_percent, platform_cut_percent})`, `getMasterEarnings`
- Follower wallet: `getWallet`, `topupWallet({amount})`, `getWalletTransactions`
- Follower billing: `getBilling`, `selectPackage({package_code})`, `reactivateBilling({package_code})`
- Follower roster: `getRoster`, `switchMaster({master_account_id})`
- Extend `DirectoryMaster` to include `rate_percent`

Add query options in `src/lib/queries.ts` for each (short staleTime for wallet/billing).

## Trade stats helper (`src/lib/trades.ts`)

Extend with pure functions computed client-side from `Deal[]`:
`equityCurve`, `maxDrawdownAbs`, `maxDrawdownPct`, `profitFactor`, `roiPct` (vs starting balance from deposit deals), `avgWin`, `avgLoss`, `returnDrawdownRatio`, `trackRecordDays`, `openExposure` (from unpaired opens), `bySymbol`, `byHourOfDay`.

## Pages

### 1. Settings (`_app.settings.tsx`) — strip

Keep only user-scoped: email (from session, read-only), sign out, notification prefs placeholder. Remove masters loop, subscriptions loop, account controls. No per-account content.

### 2. NEW `_app.accounts.$accountId.tsx` — Account Details

Routed via clicking a Dashboard card. Loads account via existing query, branches on `role`.

**Master view** — tabs: Profile · Rate · Earnings · Trades · Danger zone
- Profile editor (moved from Settings)
- Rate: shows current `rate_percent` / `platform_cut_percent`, form to update, previews `master_net_percent` from response before save
- Earnings panel: totals + recent list
- Trades: reuse trade table (paired deals, ~10s loading)
- Danger zone: Pause / Resume / Close (moved from Settings)

**Follower view** — tabs: Wallet · Billing · Roster · Trades · Danger zone
- Wallet: balance, top-up form. If `exists=false`, show CTA linking to Pricing page instead. `in_debt` shown as a distinct red badge "Wallet negative — top up".
- Wallet transactions list (colored by sign, typed label)
- Billing: package_code, status pill (active/grace/closed). Grace shown as distinct amber badge "Subscription in grace — awaiting renewal". "Reactivate" button when closed, with explicit note "step 1 of 2: re-provision required to trade again"
- Roster: current + past masters, "Switch master" flow. On switch, toast reports whether `charged` was true (new slot fee) or false
- Trades + Pause/Resume/Close same as master

### 3. NEW `_app.insight.$accountId.tsx` — public Master Insight

Read-only. Fetches directory (for name/bio/rate), `getMasterRate`, `getMasterTrades`. Renders: header, rate, equity curve (simple SVG polyline), stats grid (ROI%, max DD, profit factor, win rate, avg win/loss, track record days), symbol breakdown table, trading-hours heatmap (24 bars), full trade table.

### 4. NEW `_app.pricing.tsx` — Pricing / wallet onboarding

- Fetches `packages` table directly via supabase client, filter `is_active=true`
- Requires an account context via search param `?account=<id>` (follower). If missing, prompt to pick a follower account
- Grid of package cards: code, duration, infra_fee, slot_fee_per_slot, base_roster_size
- Top-up input + button → `topupWallet`
- "Select package" → `selectPackage`

### 5. Leaderboard fix (`_app.leaderboard.tsx`)

- Remove mobile card fallback. Single `<table>` inside `<div className="overflow-x-auto">`
- Columns: Rank, Master (name + rate_percent from directory), 30d ROI%, 30d P&L abs, Max DD, Profit Factor, Return/DD, Avg Win, Avg Loss, Win%, Trades, Track record, Followers*
- *Follower count derived client-side from user's `subscriptions` query where possible; if backend doesn't expose it globally, show em-dash rather than fake it

### 6. History fix (`_app.history.tsx`)

Wrap table in `overflow-x-auto`. No card fallback. Add `min-w-[720px]` on the table.

### 7. Master cards enrichment

`_app.masters.tsx` MasterCard: add ROI%, Max DD, current open exposure, follower count, rate_percent. Link "View" → `/insight/$accountId`, keep "Copy" → onboarding.

### 8. Dashboard (`_app.dashboard.tsx`)

- `AccountCard` becomes clickable → `/accounts/$accountId`
- For followers, per-card badge row: wallet-negative badge (red) if `in_debt`, subscription-grace badge (amber) if billing status=grace, closed badge if closed. Two states, two badges — never merged.
- Requires per-account wallet+billing fetches; batch with `useQueries` keyed on follower accounts only.

## Technical notes

- New routes use `createFileRoute` with dot-nested paths: `_app.accounts.$accountId.tsx`, `_app.insight.$accountId.tsx`, `_app.pricing.tsx`
- Insight page still lives under `_app` (auth-gated) since backend requires bearer; if the intent is truly-public unauthenticated, that's a backend change out of scope — keeping under `_app` matches existing auth model
- All new queries use `useQuery` (not loader) since these are protected server functions and the `_app` layout already gates auth
- Equity curve = simple inline SVG polyline, no chart lib
- Package pricing: direct `supabase.from('packages').select('*').eq('is_active', true)`

## Out of scope

- Notification preferences persistence (placeholder UI only)
- Re-provision flow after closure (backend TBD)
- Charting library — stick with SVG
