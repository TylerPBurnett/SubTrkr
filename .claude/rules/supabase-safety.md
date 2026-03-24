---
paths:
  - "supabase/**"
  - "src/services/database.ts"
---

# Supabase Backend Safety

The shared production Supabase backend is **not** managed from this repo.

- Production project ref: `bpgsfyallqqvvtjorybl`
- Authoritative migration repo: `/Users/tyler/Development/SubTrkr-mobile`
- Authoritative migrations: `/Users/tyler/Development/SubTrkr-mobile/supabase/migrations`

This repo's `supabase/` directory is legacy reference only.

## Never Run From This Repo

Unless the user explicitly asks to reconcile legacy history, do **not** run:

- `supabase db push` / `supabase db pull`
- `supabase migration repair` / `supabase migration new`
- `supabase link`
- Any command that changes or repairs remote migration history

## Safe Work Here

- Desktop UI and application code changes
- TypeScript updates for columns that already exist
- React/Tauri feature work
- Read-only inspection of `supabase/`

## If Desktop Work Needs A Schema Change

1. Implement desktop app code here
2. Create SQL migration in `/Users/tyler/Development/SubTrkr-mobile/supabase/migrations`
3. Run `supabase db push` from `/Users/tyler/Development/SubTrkr-mobile`
4. Update desktop types and service code to match
5. Do not create migration history in this repo

## Why

The remote migration history matches the mobile repo. Running migration commands here causes mismatch errors, unsafe repair suggestions, and duplicated SQL history.

See: [docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md](docs/reference/SUPABASE_BACKEND_SOURCE_OF_TRUTH.md)
