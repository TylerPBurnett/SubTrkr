# Repo Structure Cleanup Design

## Goal
Make the repository root scannable by keeping only tooling-required files/folders at the top level and organizing documentation into structured folders under `docs/`. The cleanup should be low risk: no runtime behavior changes, only file moves and reference updates.

## Architecture
- Keep tooling-required files and folders at the root.
- Consolidate documentation into `docs/` with clear categories.
- Move ad-hoc plans into `docs/plans/`.
- Leave build/runtime artifacts in place if the build expects them.

## Root Layout (Target)
- Required tooling and entry points stay at root:
  - `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`
  - `src/`, `public/`, `src-tauri/`, `supabase/`, `scripts/`
  - `dist/` (if build output is expected there)
  - `README.md`
- Everything else moves into structured folders under `docs/`.

## Documentation Structure
- `docs/architecture/` — system and feature architecture docs
- `docs/notifications/` — notification-related guides and summaries
- `docs/plans/` — feature plans and implementation notes
- `docs/reference/` — standalone references, setup notes, and misc docs
- `docs/branding/` — if `branding/` is not used by tooling
- `docs/images/` — images (if not already organized)

## Move Map (Root Only)
- `DESIGN_SYSTEM.md` -> `docs/reference/`
- `NOTIFICATION_CUSTOMIZATION.md` -> `docs/notifications/`
- `NOTIFICATION_IMPROVEMENTS.md` -> `docs/notifications/`
- `NOTIFICATION_SETUP.md` -> `docs/notifications/`
- `NOTIFICATIONS_COMPLETE.md` -> `docs/notifications/`
- `TELEGRAM_ARCHITECTURE.md` -> `docs/architecture/`
- `TIMEZONE_IMPLEMENTATION.md` -> `docs/architecture/`
- `TRIAL_AUTOMATION_CHANGES.md` -> `docs/architecture/`
- `plan.md` -> `docs/plans/`
- `Plans/` -> `docs/plans/` (merge contents)
- `Sonnet_recs.md` -> `docs/reference/`
- `enable-cron.sql` -> `docs/reference/` (or `supabase/` if needed by tooling)
- `tmux-*.log` -> `logs/` (optional; keep out of git)
- `branding/` -> `docs/branding/` (only if not used at build/runtime)

## Data Flow
No runtime data flow changes. Only documentation locations and references are updated.

## Error Handling
Risk is limited to broken doc links or scripts referencing old doc paths. Mitigation:
- Search for old paths with ripgrep and update references.
- Validate no runtime code depends on moved docs.

## Testing
No code changes, so no runtime tests required. Verify by checking for lingering references to old doc paths.
