# Changelog

All notable changes to SubTrkr are documented here.

---

## [v1.1.0] — 2026-02-17

This is a feature release. The headline addition is full deep-link support, which enables every auth flow—email verification, magic links, password reset, OAuth callbacks—to land cleanly inside the desktop app rather than bouncing to a browser. That required a new password-reset screen, a complete overhaul of how auth redirects work, and hardening of the app's URL validation and error handling. Alongside that: chart polish in Analytics, 28 new auto-detected services, a unified visual design across forms, and a large round of documentation and repository cleanup.

---

### Features

#### Deep-Link Auth Integration

SubTrkr now registers the `subtrkr://` custom URL scheme at the OS level, so auth emails (verification, magic links, password reset) open directly in the app instead of a browser tab.

**Rust / Tauri layer**
- Integrated `tauri-plugin-deep-link` in `Cargo.toml` and registered it in `lib.rs`
- Scheme `subtrkr` declared in `tauri.conf.json` under `deep-link.desktop.schemes`
- On open: Rust brings the main window into focus and forwards the URL to the frontend via the plugin's JS bridge

**Frontend handling**
- `App.tsx` gains two listeners:
  - `getCurrentDeepLinks()` — processes any URL the app was launched with (cold start)
  - `onOpenUrl()` — processes URLs delivered while the app is already running
- Centralized `handleDeepLink(urls)` function handles both paths identically
- URL validation: any URL that does not begin with `subtrkr://auth-callback` is rejected with a console warning — prevents the app from acting on injected or spoofed URLs
- Auth error parameter extraction: if the callback contains `?error=...&error_description=...`, the error description is surfaced directly to the user
- PKCE flow (default in supabase-js v2.39+): `code` parameter → `exchangeCodeForSession`
- Implicit flow fallback: `access_token` + `refresh_token` in hash → `setSession`

**Password recovery flow**
- Supabase `PASSWORD_RECOVERY` auth event now detected in `onAuthStateChange`
- New `SetNewPassword.tsx` component (262 lines): full in-app password reset screen with validation, strength feedback, and confirmation
- Recovery link in email opens the app and transitions directly to the reset form — no browser tab involved

**Auth service updates**
- All `redirectTo` / `emailRedirectTo` values updated from `window.location.origin` to `subtrkr://auth-callback` across sign-up, sign-in, magic link, OAuth, and password reset flows

**Runtime resilience added alongside this feature**
- Lazy-loaded `Analytics` and `Settings` views wrapped in `ErrorBoundary` — an async load failure no longer crashes the entire view

#### Analytics Chart Polish

The line chart in the Analytics page received a visual and interaction pass.

- **Dual-layer line rendering**: the chart now renders two overlapping `<Line>` components — a glow-only layer (no dots, high opacity stroke) behind the main interactive line. This produces a natural glow effect without CSS filter hacks.
- **Active dot**: replaced the CSS pulse animation with a glow-effect active dot for consistency with the new line style
- **Entrance animations**: both the area fill and line series animate in smoothly on mount
- **Cursor highlight removed**: the tooltip cursor rectangle is disabled, producing a cleaner hover state (the tooltip still appears)
- **Focus outlines removed**: Recharts containers and SVG surfaces no longer show browser focus rings

#### Known Services Expansion

Added 28 services to `knownServices.ts`, growing the auto-detection catalog from 60 to 88 entries (47% increase).

| Category | New Services |
|---|---|
| Streaming | Audible, Kindle Unlimited, Discovery+, ESPN+, Twitch |
| VPN & Security | NordVPN, ExpressVPN, Malwarebytes |
| Developer Tools | Vercel, Linear, MongoDB, Supabase, DigitalOcean |
| Productivity | Canva Pro, Grammarly, JetBrains, Discord Nitro |
| Communication | Google Workspace, Telegram Premium |
| Food Delivery | DoorDash DashPass, Uber One, Instacart+ |
| Shopping | Walmart+, Costco, AAA |
| Finance | YNAB |
| Home Security | Ring Protect, Nest Aware |

---

### Improvements

#### Unified Form Branding

Both the bill form and subscription form now use the same brand-green gradient header (`#22c55e → #16a34a`). Previously, bill forms used amber/orange to signal their type. The visual difference was noisy and inconsistent with the rest of the UI — both form types are now equally first-class.

#### Dark Mode Color Hierarchy

The dark theme color values were tightened to ensure cards are visually distinct from their backgrounds at every nesting level.

- `--bg-base`: darkened to `#0c0d0e` (stronger visual floor)
- `--bg-surface`: `#131415` (main content panel)
- `--bg-card`: `#1e2022` (~12 RGB unit gap above surface)

All three tiers now meet the ≥10 RGB unit separation required to avoid cards dissolving into their background.

#### Table Header De-emphasis

Column headers in the items list are visually subordinated to the data rows they label.

- Font size reduced from `text-sm` to `text-xs`
- Font weight reduced from `semibold` to `medium`
- Text color changed to muted (CSS variable `--text-muted`)

#### StatusChangeDialog Scroll Fix

On smaller screens, the status-change dialog could overflow the viewport with no way to scroll. Fixed with a `maxHeight` + flexbox layout that keeps the dialog header pinned while the content area scrolls independently.

#### Background Task Resilience

Background maintenance jobs (advancing past-due items, archiving cancellations, handling expired trials, sending renewal notifications) now run under `Promise.allSettled` instead of `Promise.all`. Previously, a single task failure would abort the rest and show a generic warning. Now:
- All tasks always run regardless of whether others fail
- Failures are counted individually and the warning message reports the exact number
- Each failure is logged with its rejection reason for debugging

---

### Performance

#### Dashboard Stats: Eliminated Async Waterfall

Dashboard statistics (monthly spending, yearly spending, spending by category) were previously computed inside a `useEffect` + async `loadStats()` function that ran after every render. These functions are pure and synchronous — they never needed to be async. They are now computed directly with `useMemo`, which eliminates the render → effect → setState → re-render cycle and makes the dashboard stats available on first render.

#### Analytics Stats: Same useMemo Refactor

The same pattern was applied to the Analytics page. Monthly/yearly spending, monthly savings, and category breakdown are now `useMemo` values rather than async state.

#### Past-Due Item Advancement: Parallelized

`advancePastDueItems()` previously advanced past-due billing dates with a sequential `for...of` loop — each item waited for the previous database write to complete before starting the next. This is now a single `Promise.all` over all updates, running them concurrently.

#### Notification History: Auto-Pruning

Notification send history was stored in localStorage indefinitely. A `pruneHistory()` function now runs on every history read, dropping entries older than 30 days. This prevents the history object from growing without bound over time.

---

### Documentation

This release includes a substantial documentation investment across auth architecture, operations, and developer guides.

#### Authentication Architecture

- `docs/architecture/AUTHENTICATION.md` — comprehensive guide (520 lines) covering every auth flow: email/password, magic link, OAuth, password recovery, deep-link callbacks, PKCE vs implicit token exchange, session lifecycle, and RLS integration
- `docs/architecture/README.md` — index of the architecture docs directory
- `docs/architecture/AUTH_DEEP_LINKS.md` — focused guide for the deep-link integration: OS-level registration, URL scheme format, startup vs. runtime handling, and testing instructions

#### Email Templates

- `docs/email-templates/` — full source for all four Supabase transactional emails:
  - Confirm signup
  - Magic link
  - Reset password
  - Change email
- Templates use the SubTrkr SVG logo and consistent styling; documented alongside usage notes in `docs/reference/EMAIL_TEMPLATES.md`

#### Release Operations

- `docs/PRODUCTION_RELEASE_WORKFLOW.md` — end-to-end production release workflow
- `docs/RELEASE_CAPTAIN_CHECKLIST.md` — release captain checklist for consistent deployments
- `docs/UPDATER_TESTING_GUIDE.md` — strategy for testing the Tauri updater via RC/pre-release flow before shipping to users

#### Developer Guides

- `docs/guides/adding-services.md` — step-by-step guide for adding new entries to `knownServices.ts`: service structure, required fields, category conventions, and testing

#### Design System

- `docs/reference/THEMING.md` updated with the 3-tier background hierarchy principle, the ≥10 RGB unit rule for card separation, brand color usage guidelines, and form accent rules

#### Settings UX Planning

- `docs/completed-plans/SettingsUXplan.md` — design spec for an upcoming tabbed Settings page restructure; documents proposed tab layout, component decomposition, and implementation sequence

---

### Chores

#### Repository Structure

All documentation was reorganized into a proper `/docs` folder hierarchy:
- `docs/architecture/` for system design docs
- `docs/email-templates/` for email assets
- `docs/notifications/` for notification system docs
- `docs/plans/` for design and planning documents
- Root-level loose docs removed; references updated throughout

Other housekeeping:
- `package-lock.json` removed — `bun.lock` is now the canonical lockfile
- `.gitignore` updated to exclude git worktree directories
- Product name corrected to `SubTrkr` (capital T) in `tauri.conf.json`

---

## Migration Guide

No breaking changes. This release is fully backward-compatible.

### For Users

No action required. The app updater handles everything. After updating:
- Auth emails (verification, password reset, magic links) will open the app directly
- The "Reset Password" flow now completes in-app on a dedicated screen

### For Developers

- **Deep-link handling** is centralized in `handleDeepLink()` in `App.tsx`. If you modify auth flows, keep all callback processing there.
- **`advancePastDueItems()`** now runs all DB writes in parallel — if you add new per-item writes to maintenance functions, prefer `Promise.all` over sequential loops.
- **Dashboard / Analytics stats** are `useMemo` values, not async state. New stats derived from `items` or `categories` should follow the same pattern.
- **ErrorBoundary** is now on `Analytics` and `Settings` lazy views. Apply the same wrapper to any new lazy-loaded view.
- **Known services**: see `docs/guides/adding-services.md` for the full guide on adding new entries.

---

*Changes since [v1.0.10]*
