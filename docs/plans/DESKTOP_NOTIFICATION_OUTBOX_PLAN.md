# Desktop Notification Outbox Plan

> Date: 2026-04-10
> Status: Proposed follow-up after `TASK-008` hardening fixes
> Scope: Replace client-side desktop reminder scheduling with a server-scheduled outbox model while keeping native desktop delivery best-effort when the app is open

---

## Summary

SubTrkr currently has two reminder systems:

- Server-side scheduled delivery through `pg_cron` + `send-notifications` for Telegram/Discord/Slack
- Client-side scheduling for native desktop notifications in the Tauri app

The short-term hardening fix restored correct desktop reminder behavior, but the long-term architecture should remove duplicated scheduling logic. The target model is:

- The server remains the single source of truth for reminder eligibility and deduplication
- The desktop app becomes a consumer of pending native-delivery rows
- Native desktop notifications still require the app to be open; this plan does not add APNS/WNS or background daemons

## Problem

- Desktop reminder scheduling is duplicated between server and client
- Desktop deduplication is local to one machine via `localStorage`
- The app shell is responsible for both data sync and reminder timing concerns
- Refactors to app startup/reload logic can accidentally break desktop reminders, as seen in the hardening branch

## Goal

- Unify reminder scheduling behind the existing server-side notification pipeline
- Preserve native desktop notifications when the app is open
- Remove client-side reminder scheduling and `localStorage` reminder history
- Keep external channels (Telegram/Discord/Slack) working unchanged

## Non-Goals

- True native push delivery when the app is closed
- APNS/WNS integration
- Background agents, launchd helpers, or scheduled desktop daemons
- Notification UI redesign

## Proposed Architecture

- Add a server-side desktop delivery channel or outbox representation
- Have `send-notifications` enqueue pending desktop deliveries instead of relying on the client to decide reminder timing
- Subscribe the desktop app to pending delivery rows and drain them on startup plus realtime inserts
- Move desktop deduplication and delivery state into the database

## Required Design Constraints

- Do not mark a desktop notification as fully delivered before the local Tauri notification call succeeds
- Do not assume every user already has a `notification_preferences` row unless the migration or app flow guarantees it
- Keep delivery semantics explicit: native desktop notifications remain best-effort while the app is open
- Keep this work separate from `TASK-008`; it is an architecture follow-up, not a hardening patch

## Open Questions

- Should desktop delivery use `notification_log` directly, or a dedicated outbox table with clearer claim semantics?
- What is the correct claim lifecycle: `pending -> claiming -> delivered`, or an equivalent token-based design?
- How should failed local delivery be retried without causing duplicates?
- Should desktop channel enablement live alongside existing `notification_channels` rows, or be implied by app presence?
- What bootstrap path guarantees users have the required preferences/timezone data for server scheduling?

## Recommended Execution Order

1. Finalize the outbox data model and claim semantics
2. Version the current deployed `send-notifications` source into the repo
3. Add schema changes and verification queries
4. Implement server-side desktop enqueue behavior
5. Implement client drain hook and native delivery service
6. Delete legacy client-side reminder scheduling
7. Run end-to-end verification for startup drain, realtime drain, and duplicate prevention

## Source Material

- Draft implementation details currently live in [docs/superpowers/plans/2026-04-10-desktop-notifications-unified.md](../superpowers/plans/2026-04-10-desktop-notifications-unified.md)
- Hardening follow-up context is in [docs/plans/PRODUCTION_HARDENING_PLAN.md](PRODUCTION_HARDENING_PLAN.md)

## Exit Criteria

- Desktop reminder scheduling no longer depends on app-shell reload timing
- Native desktop notification deduplication is server-backed rather than `localStorage`-backed
- Legacy `src/services/notifications.ts` scheduling logic is removed
- External notification channels still pass manual verification
- The product/docs clearly state that native desktop reminders require the app to be open unless future push/background infrastructure is added
