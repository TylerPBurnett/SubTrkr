# SubTrkr Desktop — Roadmap & Next Steps

> Last updated: 2026-03-25
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

### Status-History / Autopay Alignment ✓

*Completed 2026-03-24. See `docs/completed-plans/2026-03-10-desktop-autopay-alignment-recommendations.md`.*

- Cancelled items are no longer auto-archived during maintenance.
- Trials are excluded from projected spend.
- Desktop status-history coverage now includes timeline visibility and parity for archive, start-trial, and edit-cancellation flows.

---

## Up Next — Prioritized

### 1. Transactional Status-Change Write Path

- Remaining hardening item from the status-history rollout.
- This is blocked on shared backend migration ownership and must be coordinated through the mobile repo workflow.

See `docs/SUPABASE_BACKEND_WORKFLOW.md` and `docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md`.

### 2. Trial Pricing Data Split

- The current model overloads one `amount` field for both free-trial and post-trial pricing.
- The next desktop-owned follow-up is to split trial pricing from paid pricing in the data model, UI, and notifications.

See `docs/plans/TRIAL_PRICING_FOLLOW_UP.md`.

### 3. Notification Quality-of-Life Backlog

- Quiet hours
- Smart annual subscription alerts
- Daily digest mode

See `docs/notifications/NOTIFICATION_IMPROVEMENTS.md`.

---

## Suggested Next Session

1. If the work is desktop-only, start with `docs/plans/TRIAL_PRICING_FOLLOW_UP.md`.
2. If the work changes shared Supabase schema or writes, start with `docs/SUPABASE_BACKEND_WORKFLOW.md` before touching code.
3. If the work is release-related, use `docs/PRODUCTION_RELEASE_WORKFLOW.md` plus `docs/RELEASE_CAPTAIN_CHECKLIST.md`.
