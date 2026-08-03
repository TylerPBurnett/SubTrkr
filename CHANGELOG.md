# Changelog

All notable changes to SubTrkr are documented here.

---

## [v1.3.0] — 2026-08-02

This release turns the post-v1.2 desktop work into a safer daily-use build. It closes a set of authentication and backend security gaps, makes every dialog usable from the keyboard and a screen reader, adds account deletion, and rebuilds the dashboard's category breakdown so the chart and its legend can no longer disagree — alongside production hardening, category-data correctness, and a calmer native-looking interface.

---

### Features

- **Account deletion** — a Danger Zone in Account settings permanently erases your account and all associated data, with a type-to-confirm gate. Backed by a new server function that only ever deletes the authenticated caller.
- **Category breakdown rework** — the dashboard's spending panel no longer hides rows behind a nested scrollbar. It shows the top five categories plus a foldable `Other` row that expands in place, and the donut folds in step so both always describe the same set.

### Security

- Desktop sign-in now uses the PKCE flow. The deep-link handler no longer accepts session tokens from a URL fragment, closing a path where a crafted `subtrkr://` link could silently switch the signed-in account.
- Locked down a database function that could return every user's item data to any caller, removed unused public secret-management helpers, and required a shared secret on scheduled notification dispatch.
- Notification delivery now claims each reminder before sending, so overlapping runs can no longer deliver duplicates.

### Accessibility

- Every dialog — item form, confirmations, status changes, status history, and password reset — now uses proper dialog semantics with focus trapping and Escape handling.
- The password-reset screen can be dismissed instead of trapping you until a new password is set.
- Expanding or collapsing the category breakdown keeps keyboard focus on a real control and announces the change to screen readers.
- Added accessible names to icon-only buttons throughout settings and banners.

### Improvements

- Reminder times now default to your computer's timezone instead of UTC, so "9 AM" means 9 AM where you are.
- Auth forms fill correctly from password managers, and an expired or mistyped sign-in code now says which it was.
- The category panel sits on a flat surface consistent with every other inset panel in the app.

#### Production Hardening

- Scoped Supabase realtime subscriptions to the authenticated user and reduced redundant reload work
- Routed lifecycle transitions through the shared transactional `execute_item_status_change` backend contract
- Restored reminder checks after item reloads and retained startup maintenance behavior after the application refactor
- Tightened the desktop CSP and moved known-service logo loading behind the app-controlled Supabase path
- Added safe letter-initial fallbacks for unavailable service logos

#### Category & Analytics Correctness

- Item-facing category names and colors now resolve from current category state instead of stale joined snapshots
- Category realtime changes refresh category data without unnecessarily reloading every item
- Added deterministic regression coverage for category resolution, projected analytics, billing anchors, and lifecycle transitions

#### Native UI Cleanup

- Replaced Archivo display typography with the Apple system stack on macOS and Inter fallbacks elsewhere
- Removed excessive rainbow gradients, glow halos, noise textures, and tracked uppercase labels from primary workflows
- Simplified dashboard metrics, item cards, forms, empty states, analytics tooltips, and lifecycle dialogs
- Added lifecycle-action button colors that maintain readable text contrast in both themes
- Standardized focus treatment and form-control borders around the shared design tokens

### Fixes

- The dashboard donut's centre total counted every active item while its arcs counted only categorized spend, so untagged spend vanished from the chart and every percentage was inflated — a single uncategorized item could make one category read 100% when its true share was 60%. Untagged spend now appears as its own `Uncategorized` slice and percentages are measured against the real total.
- Editing a cancellation date silently failed to update the underlying history record, leaving spending trends computed from a stale date.
- Item creation, editing, and lifecycle transitions now refresh item state immediately instead of waiting for a realtime round trip
- Preserved recurrence anchors when calculating future billing dates
- Kept notification and maintenance checks working after data-sync decomposition
- Updated Supabase, Vite, PostCSS, Rollup, and Picomatch resolutions to remove all known production dependency advisories

### Chores

- Archived completed hardening and UI cleanup plans and refreshed the desktop roadmap/task queue
- Added a repeatable v1.3.0 release-preparation plan and cleaned repository-local tooling state
- Recovered the logo proxy's source into the backend repository and hardened its input validation
- Removed two deprecated backend functions that were still deployed without authentication

## Migration Guide

No user migration is required. Existing subscriptions, bills, categories, payment history, notification settings, and local preferences remain compatible. The desktop app expects the shared production backend's transactional lifecycle RPC, which is already the documented backend contract.

Two notes on the authentication change. Because sign-in now uses PKCE, confirmation, magic-link, and password-reset emails must be opened **on the same computer that requested them** — opening one on a phone will report that the link can't be completed there. Existing sessions are unaffected and no one is signed out by this upgrade.

The backend changes in this release were deployed on 2026-08-02 and are already live for all clients, including v1.2.x.

## [v1.2.2] — 2026-04-06

This release redesigns the in-app update experience to be less generic and more contextually aware. The update panel now adapts its footprint based on whether there's something for the user to do — compact when up to date, expanded only when an update is actionable. It also adds persistent update indicators, an auto-update preference, richer release notes formatting, and a one-click install path from the launch toast.

---

### Improvements

#### Update Panel Redesign

- **Compact mode** for idle/up-to-date/error states — single-row layout with version + check button inline; no gradient panel or version comparison boxes when there's nothing to act on
- **Expanded mode** only appears when an update is available, downloading, installing, or ready to restart — the visual weight now matches the urgency
- Clear version transition display (`v1.2.1 → v1.2.2`) instead of separate "current" / "available" boxes
- Full-width primary CTA button with the target version in the label (e.g. "Download & install v1.2.2")
- Removed redundant "Available release: No newer release" display in the up-to-date state

#### Persistent Update Indicator

- Green dot badge on the Settings nav icon when an update is available, downloading, or ready to restart
- Text badge ("Update" or "Restart") shown in the expanded sidebar alongside the dot
- Badge color shifts to emerald when the update is installed and waiting for restart

#### One-Click Install from Toast

- Launch-time toast now shows version transition (`v1.2.1 → v1.2.2`) instead of generic description
- Toast action button changed from "Open updater" (navigate only) to "Install now" (navigates to settings AND starts the download immediately)
- Toast duration extended to 15 seconds for more time to act

#### Auto-Update Preference

- New "Automatic updates" toggle in Settings → Account below the update panel
- When disabled, the app skips the automatic update check on launch (users can still check manually)
- Persisted via localStorage (`subtrkr-auto-update-enabled`), defaults to enabled

#### Markdown Release Notes

- Release notes now render with basic markdown formatting: `## headings`, `- bullet items`, `**bold**`, `` `inline code` ``
- Proper bullet rendering with styled list markers instead of raw `-` characters
- Shows up to 8 lines with "And more..." truncation for longer changelogs
- Lightweight inline parser — no external markdown dependency added

#### Dev-Mode Update Simulation

- Added localStorage flag (`subtrkr-dev-simulate-update`) to simulate an available update in dev builds
- Simulates the checking → available state transition with rich markdown release notes
- Only active in `import.meta.env.DEV` — completely tree-shaken from production builds
- Enables testing the full update UI flow (toast, expanded panel, badge) without building old binaries

---

## Migration Guide

No breaking changes. Existing users can update in place.

### For Users

No action required. After updating:
- The update section in Settings → Account is now more compact and less cluttered when you're already up to date
- When an update is available, the install button is more prominent and shows the exact version
- A small green dot on the Settings icon reminds you if an update is waiting
- You can disable automatic update checks in Settings → Account if you prefer manual control

### For Developers

- `UpdateStatusPanel` now delegates to `CompactUpdateRow` or `ExpandedUpdatePanel` based on updater state
- `getPanelStyles`, `formatBytes`, and `parseReleaseNotes` remain as utility functions in `AccountSettings.tsx`
- Release notes rendering uses `ReleaseNotesContent` / `ReleaseNoteLine` / `renderInline` — no external markdown library
- Auto-update preference is read by `isAutoUpdateEnabled()` in `updater.ts` via the `subtrkr-auto-update-enabled` localStorage key
- Dev simulation: `localStorage.setItem('subtrkr-dev-simulate-update', 'true')` + refresh to test

---

## [v1.2.1] — 2026-04-04

This is a focused patch release for the desktop updater experience. The goal is simple: when SubTrkr finds a new version, users should immediately understand what is available, what happens next, and how to finish the upgrade without guessing or relying on hidden browser-style prompts.

---

### Improvements

#### In-App Updater UX

- Replaced the updater's hidden `window.confirm()` flow with an explicit in-app update panel in Settings → Account
- Added clear updater states for checking, available, downloading, installing, and ready-to-restart
- Added visible `Download & install` and `Restart to update` actions directly in the Account settings UI
- Added release-notes previews plus current-version and available-version details so the update flow feels more transparent and trustworthy
- Added download/install progress feedback so users can see the updater working instead of waiting on a blocking dialog
- Added a launch-time toast with a direct path into Settings → Account when a new version is detected

---

## Migration Guide

No breaking changes. Existing users can update in place.

### For Users

No action required. After updating:
- App updates are easier to discover and install from Settings → Account
- Automatic update checks now surface a clearer in-app prompt instead of relying on hidden confirmation dialogs

### For Developers

- The updater service now exposes shared UI state plus explicit `check`, `install`, and `restart` actions instead of combining all behavior into a single confirmation-driven call
- Settings tab state is externally controllable so app-level prompts can route users straight to the Account updater surface

---

## [v1.2.0] — 2026-04-04

This release is a substantial desktop polish and insights update. The centerpiece is a redesigned Analytics and Dashboard experience with projected spending trends, due-soon visibility, richer category analysis, cancellation insights, and a new interactive donut visualization. It also ships bespoke zero-data states, native-shell vibrancy improvements, and lifecycle hardening that make the app feel more reliable and more intentional day to day.

---

### Features

#### Analytics Overhaul

Analytics is now a much more useful planning surface rather than a simple stats page.

- Added a redesigned summary-card row with monthly spend, next-7-days obligations, recovered savings, and annual view
- Added a projected monthly spending trend chart with 6-month and 12-month ranges
- Added category concentration analysis with tappable category filters
- Added most-expensive commitments and cancellation insights panels
- Updated analytics derivation logic so projected spend and due-soon summaries better reflect status history and recurring cadence

#### Dashboard Category Visualization

The Dashboard now includes a more polished spending breakdown with stronger glanceability.

- Added the new `GlowDonutChart` category visualization with linked legend hover states
- Improved dashboard metric card styling and hierarchy
- Refined category legend layout, geometry, and hover behavior
- Improved upcoming-payment and category sections to better match the new analytics experience

#### Bespoke Empty States

Zero-data screens now feel intentional instead of unfinished.

- Added reusable ghost preview primitives for charts and lists
- Added tailored empty states across Dashboard, Analytics, and ItemList
- Introduced compact empty-state variants for smaller cards and panels

#### Desktop Shell & Visual Polish

- Preserved native vibrancy support after Tauri webview reloads
- Expanded the broader UI modernization pass with overlay scrollbars, improved toggles, and a more refined sidebar shell
- Disabled global overscroll bounce for a steadier desktop feel

---

### Improvements

#### Lifecycle & Projection Reliability

- Hardened status lifecycle handling so item-state transitions and analytics stay more consistent
- Centralized projected-spending helper logic into a shared utility to reduce drift between Dashboard and Analytics
- Fixed compact currency formatting so negative compact values render with the sign in the correct position

#### Release & Repo Hygiene

- Ignored local `.playwright-mcp/` artifacts so browser-tool output no longer pollutes git state
- Continued the docs and planning cleanup around roadmap, calendar work, and completed design sessions

---

## Migration Guide

No breaking changes. Existing users can update in place.

### For Users

No action required. After updating:
- The Dashboard and Analytics pages will reflect the new layout and insights
- Empty states will show guided previews instead of blank containers
- Native vibrancy should persist more reliably after reloads on supported platforms

### For Developers

- Shared projected-spending logic now lives in `src/utils/projectedSpending.ts`; prefer that utility over re-implementing historical active-state checks in view files
- The new empty-state ghost previews live in `src/components/ui/GhostChartPreview.tsx` and `src/components/ui/GhostListPreview.tsx`
- The Dashboard category chart now relies on `GlowDonutChart.tsx`, which includes custom geometry, hover detection, and reveal animation behavior

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

*Changes since [v1.1.0]*
