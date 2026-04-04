# Supabase Backend Source Of Truth

Last Updated: 2026-03-14

## Summary

The live Supabase backend used by the desktop app is shared with the iOS app, but the authoritative migration history now lives in the iOS repo:

- authoritative migration repo: `/Users/tyler/Development/SubTrkr-mobile`
- authoritative migration directory: `/Users/tyler/Development/SubTrkr-mobile/supabase/migrations`
- production project ref: `bpgsfyallqqvvtjorybl`

The desktop repo at `/Users/tyler/Development/SubTrkr` is **not** the migration source of truth.

## Why This Exists

The desktop app was created first. The mobile app and its Supabase workflow were added later.

Over time, the shared backend history continued from the mobile-side migration set. That means the remote database migration history now matches the mobile repo's timestamped migrations and does not match the older desktop-side migration directory one-for-one.

This is an operational issue, not an immediate runtime issue:

- the database is healthy
- both apps can work against it
- but migration-management commands must come from one authoritative repo

## Current Rule

If you need to change the shared backend schema, do it from:

- `/Users/tyler/Development/SubTrkr-mobile`

Do **not** manage the shared remote database schema from:

- `/Users/tyler/Development/SubTrkr`

## What Is Safe In The Desktop Repo

Safe work in the desktop repo includes:

- React/Tauri feature work
- UI changes
- desktop-only logic
- TypeScript updates for new backend columns that already exist
- read-only review of old SQL files for context

## What Is Not Safe In The Desktop Repo

Do not run these from the desktop repo unless the user explicitly asks to perform migration-history reconciliation:

- `supabase db push`
- `supabase db pull`
- `supabase migration repair`
- `supabase migration new`
- `supabase link`

Also do not treat `/Users/tyler/Development/SubTrkr/supabase/migrations` as authoritative when deciding what the remote database should look like.

## Practical Workflow For Agents

If a desktop task needs a schema change:

1. make the necessary desktop code changes in `/Users/tyler/Development/SubTrkr`
2. create the SQL migration in `/Users/tyler/Development/SubTrkr-mobile/supabase/migrations`
3. apply the migration from `/Users/tyler/Development/SubTrkr-mobile`
4. update desktop types and service code to match the new schema
5. add or update documentation in either repo as needed

## Example: Effective-Date History Migration

On 2026-03-14, the `item_status_history` schema was extended with:

- `action`
- `effective_date`

That migration was applied from the iOS repo because the remote migration history matched the iOS repo's migration set. Attempting to push the same change from the desktop repo produced a migration-history mismatch.

This is the exact failure mode this note is meant to prevent in the future.

## Long-Term Direction

The ideal long-term fix is to have only one clearly designated backend migration home:

- either keep using the iOS repo as the canonical Supabase repo
- or extract the shared backend into a dedicated third repo

Until that cleanup happens, treat the iOS repo as the backend source of truth.
