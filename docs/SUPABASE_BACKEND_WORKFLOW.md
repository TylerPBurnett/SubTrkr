# SubTrkr Desktop Supabase Backend Workflow

> Last updated: 2026-03-25
> Source of truth note: `docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md`

---

## Summary

The desktop app uses the same live Supabase backend as the iOS app, but the authoritative migration history now lives in the mobile repo at `/Users/tyler/Development/SubTrkr-mobile`.

That means desktop feature work is safe here, but shared schema changes are not owned from this repo.

## Core Rule

- If the task changes the shared backend schema, create and apply the migration from `/Users/tyler/Development/SubTrkr-mobile`.
- Do not treat `/Users/tyler/Development/SubTrkr/supabase/migrations` as the source of truth for the live remote database.

## Safe In The Desktop Repo

- React/Tauri feature work
- UI changes
- desktop-only logic
- TypeScript updates for backend columns that already exist
- read-only inspection of older SQL files for context

## Do Not Run From This Repo

- `supabase db push`
- `supabase db pull`
- `supabase migration repair`
- `supabase migration new`
- `supabase link`

Unless the user explicitly wants migration-history reconciliation work, those commands should not be run from `/Users/tyler/Development/SubTrkr`.

## Workflow When Desktop Needs Schema Changes

1. Make the desktop code changes in `/Users/tyler/Development/SubTrkr`.
2. Create the migration in `/Users/tyler/Development/SubTrkr-mobile/supabase/migrations`.
3. Apply the migration from `/Users/tyler/Development/SubTrkr-mobile`.
4. Update desktop types and service code to match the new schema.
5. Update docs in either repo so the follow-up is discoverable later.

## Verification

- Before any shared backend work, read `docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md`.
- If there is doubt about migration ownership, stop and treat the mobile repo as authoritative.
