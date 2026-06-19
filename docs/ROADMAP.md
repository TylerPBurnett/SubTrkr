# SubTrkr Desktop — Roadmap & Next Steps

> Last updated: 2026-06-19
> Navigation: `docs/TASKS.md` is the operational queue for actionable work. `docs/plans/` contains active work only. Finished implementation/design docs live in `docs/completed-plans/`; completed summaries and legacy notes live in `docs/completed/`.

---

## Completed

### Authentication & Deep Links ✓

- Supabase auth flows are documented and implemented across email/password, OTP, OAuth, password reset, and desktop callback handling.
- Deep-link handling for `subtrkr://` callbacks is documented separately for desktop-specific setup and testing.

See `docs/architecture/AUTHENTICATION.md` and `docs/architecture/AUTH_DEEP_LINKS.md`.

### Notifications & Timezone Delivery ✓

- Multi-channel notifications shipped with Telegram, Discord, and Slack support.
- Timezone-aware delivery is in place, and notification customization/setup docs are captured under `docs/notifications/`.

See `docs/notifications/NOTIFICATIONS_COMPLETE.md`, `docs/notifications/NOTIFICATION_SETUP.md`, and `docs/architecture/TIMEZONE_IMPLEMENTATION.md`.

### Release Workflow & Updater Verification ✓

- Desktop release, updater verification, and release-captain checklists are documented and ready for ongoing use.

See `docs/PRODUCTION_RELEASE_WORKFLOW.md`, `docs/UPDATER_TESTING_GUIDE.md`, and `docs/RELEASE_CAPTAIN_CHECKLIST.md`.

### In-App Updater UX Redesign ✓

*Completed 2026-04-06.*

- Update panel uses compact/expanded modes — minimal footprint when up to date, full panel only when actionable.
- Persistent green dot + text badge on the Settings nav icon when an update is available or ready to restart.
- Auto-update preference toggle (defaults to enabled) stored in localStorage.
- Release notes rendered with markdown formatting (headings, bullets, bold, inline code) — no external dependency.
- Launch toast offers one-click install instead of just navigating to settings.
- Dev-mode update simulation via localStorage flag for testing without building old binaries.

### Status-History / Autopay Alignment ✓

*Completed 2026-03-24. See `docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md`.*

- Cancelled items are no longer auto-archived during maintenance.
- Trials are excluded from projected spend.
- Desktop status-history coverage now includes timeline visibility and parity for archive (as a cancelled-only follow-up), start-trial, and edit-cancellation flows.
- The shared backend lifecycle contract now keeps status/history writes transactional and treats cancellation-date edits as corrections to the original cancellation event.

### Production Hardening Sweep ✓

*Completed 2026-04-20. See `docs/completed-plans/PRODUCTION_HARDENING_PLAN.md`.*

- Corrected billing-anchor behavior and added deterministic regression coverage.
- Tightened CSP, logo handling, realtime scoping, and lifecycle write safety.
- Reduced realtime reload work and completed the planned application decomposition.

### Category Normalization & Frosty UI Cleanup ✓

*Completed 2026-06-19.*

- Item-facing category display resolves from live category state.
- Replaced excessive gradients, glow effects, display typography, and tracked uppercase labels with calmer native surfaces.
- Added accessible lifecycle-action button colors and preserved completed implementation context under `docs/completed-plans/`.

---

## Up Next — Prioritized

### 1. Ship v1.3.0

- Finish the release-candidate smoke pass, prepare the changelog and versions, then publish the verified desktop build.

See `docs/plans/2026-06-19-v1.3.0-release-preparation.md` and `docs/RELEASE_CAPTAIN_CHECKLIST.md`.

### 2. Trial Pricing Data Split

- The current model overloads one `amount` field for both free-trial and post-trial pricing.
- The next desktop-owned follow-up is to split trial pricing from paid pricing in the data model, UI, and notifications.

See `docs/plans/TRIAL_PRICING_FOLLOW_UP.md`.

### 3. Shared Backend Coordination

- Shared lifecycle writes now live in the backend-owned `execute_item_status_change` RPC.
- Future schema or write-path changes still need to follow the mobile-repo backend workflow so desktop stays aligned with the shared contract.

See `docs/SUPABASE_BACKEND_WORKFLOW.md` and `docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md`.

### 4. Calendar View Workspace

- Add a dedicated calendar entry to the sidebar that turns the main workspace into a calendar-first view instead of a list/detail screen.
- Support weekly, monthly, zoomed-out, and yearly lenses so recurring items can be scanned at different planning horizons.
- Prefer a clean frontend-first implementation using the existing item schedule fields (`start_date`, `next_billing_date`, `billing_cycle`, lifecycle dates) before introducing any new backend tables or precomputed occurrences.
- Revisit backend work only if the first pass needs persisted occurrence snapshots, calendar-specific settings sync, or heavier projection queries that do not fit the current client model cleanly.

See `docs/plans/CALENDAR_VIEW_PLAN.md`.

### 5. Notification Quality-of-Life Backlog

- Quiet hours
- Smart annual subscription alerts
- Daily digest mode

See `docs/notifications/NOTIFICATION_IMPROVEMENTS.md`.

### 6. Modular Dashboard & Analytics

- Allow users to rearrange dashboard and analytics widgets to their own preferred layout (drag-to-reorder or a simpler up/down ordering).
- Provide a settings panel to show/hide individual analytics cards and dashboard components (e.g. hide spend trend, show only upcoming renewals).
- Goal: a layout that reflects how each user actually monitors their subscriptions rather than a one-size-fits-all arrangement.
- Keep persistence local first (localStorage or a settings column) before syncing layout preferences to Supabase.

### 7. UI Modernization & Polish

- **Glassmorphism / Vibrancy:** Add translucent backgrounds (like `backdrop-filter: blur()`) to the sidebar and headers for a native macOS/Windows 11 feel.
- **Spring Physics Animations:** Swap standard CSS easing for Framer Motion `spring` physics on layout changes (modals, expanding cards) for fluid, tactile weight.
- **Native Toggle Switches:** Replace standard binary settings checkboxes with animated iOS/macOS style toggle switches.
- **Overlay Scrollbars:** Style the custom web scrollbars to float over content and disappear when inactive, mimicking native OS behaviors.
- **Bespoke Empty States:** Design highly customized illustrations or subtle dashed drop-zones for empty tables and zero-data charts to elevate the premium feel.

---

## Suggested Next Session

1. Finish `docs/plans/2026-06-19-v1.3.0-release-preparation.md` and ship v1.3.0.
2. After release, start with `docs/plans/TRIAL_PRICING_FOLLOW_UP.md` or `docs/plans/CALENDAR_VIEW_PLAN.md`, depending on whether the session is data-model or UI-calendar work.
3. If the work changes shared Supabase schema or writes, start with `docs/SUPABASE_BACKEND_WORKFLOW.md` before touching code.
4. If the work is release-related, use `docs/PRODUCTION_RELEASE_WORKFLOW.md` plus `docs/RELEASE_CAPTAIN_CHECKLIST.md`.
