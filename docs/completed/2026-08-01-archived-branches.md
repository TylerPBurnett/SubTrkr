# Archived Branch Cleanup — 2026-08-01

`main` at `e0257ad` is the only active source of truth after this cleanup. The
entries below preserve old experiments for reference without treating them as
work that should be merged.

## Recovery Notes

The stash commit hashes are stable identifiers even if their `stash@{n}` index
changes. Inspect an archive with `git stash show --stat <hash>`. To recover one
for investigation, use `git stash branch recover/<name> <hash>` from a clean
checkout. The full-diff archives recreate the old branch tree for inspection;
do not apply them directly to `main`.

| Archived work | Former tip | Stash commit | Notes |
|---|---|---|---|
| `claude/buttons-update` uncommitted work | `670334c` | `b0a1660fabfc26b2be0c51ca53d7731ce0e0a1dd` | Ten tracked UI/CSS changes, including removal of `src/components/ui/button.tsx`. The branch's committed history was already contained in `main`. |
| `app-review-suggestions` | `dacbbe8` | `9d9ee88d328a3543aee09c824b37576029ac2a5a` | Old budgets, logo-proxy, application refactors, tests, and documentation. Remote tip was `bd74761`. Archived as a full tree diff from `main`. |
| `claude/improve-app-security-B4Rv7` | `a4845a4` | `11d5a6d9922dd8cb77917bc0c239fbb8dfdb233d` | Old auth, CSP, validation, notification, and data-exposure hardening. Archived as a full tree diff from `main`. |
| `claude/sticky-search-add-button-yQ9IZ` | `df77b1d` | `617d339a0eee7669e766ada6bae0a7d20c9eb4fb` | Sticky search/add-button experiment and its implementation plan. Archived as a full tree diff from `main`. |
| `claude/improve-windows-titlebar-f1q53` | `7e604d9` | None | Three commits added, scoped, and then reverted title-bar branding. The branch had no net change relative to its fork point, so no code stash was needed. |

Two older `feat/supabase-auth-sync` stash entries predated this cleanup and were
left untouched.

No release tag was created as part of this branch cleanup.
