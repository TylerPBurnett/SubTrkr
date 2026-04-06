# Release Skill Design

**Date:** 2026-04-06
**Status:** Approved

---

## Overview

A `/release` skill that automates the full SubTrkr release flow end-to-end: preflight checks, version bump, AI-drafted changelog, tag, CI monitoring, and release verification. Invoked after a feature or bug fix is committed and ready to ship.

---

## Invocation

```
/release
```

No arguments. The skill determines the current version from `package.json` and asks for the bump type interactively.

---

## Stage 1 — Preflight

1. Read `package.json` to get current version
2. Run `git status` — abort if there are uncommitted changes (everything must be committed before releasing)
3. Run `git pull origin main` — abort if pull fails
4. Run `bun install --frozen-lockfile` — abort on failure
5. Run `bunx tsc --noEmit` — abort on any TypeScript errors

All failures print the exact error output and stop. No silent skipping.

---

## Stage 2 — Version & Changelog

1. Ask: **"Current version is X.Y.Z. Is this a patch, minor, or major bump?"**
2. Calculate new version (semver increment)
3. Bump version in:
   - `package.json` → `version` field
   - `src-tauri/Cargo.toml` → `version` field (to keep in sync; CI patches `tauri.conf.json` from the tag, not this file, but manual drift is a problem)
4. Run `git log $(git describe --tags --abbrev=0)..HEAD --oneline` to get commits since last tag
5. Draft a CHANGELOG entry following the existing format:
   - Narrative intro paragraph (1–3 sentences summarizing the release)
   - Grouped sections: Features, Improvements, Fixes, Chores (omit empty sections)
   - Migration Guide stub at the bottom
6. Prepend the draft to `CHANGELOG.md`
7. **Pause:** *"Changelog drafted. Please review and edit `CHANGELOG.md`, then press Enter to continue."*
8. After confirmation: `git add CHANGELOG.md package.json src-tauri/Cargo.toml`
9. `git commit -m "chore: prepare vX.Y.Z release"`
10. `git push origin main`

The pause at step 7 is intentional — the AI draft gets you 80% there but the user owns the final copy before anything is committed.

---

## Stage 3 — Tag & Push

1. **Confirmation gate:** *"Ready to tag and release vX.Y.Z? This triggers CI and is the point of no return. (y/n)"*
2. On confirmation:
   - Extract the intro paragraph from the new CHANGELOG entry (first paragraph of the release section, used as the tag annotation and later the GitHub Release body)
   - `git tag -a vX.Y.Z -m "vX.Y.Z — <changelog intro sentence>"`
   - `git push origin vX.Y.Z`
3. Confirm workflow started: `gh run list --workflow=release.yml --limit=1`
4. Print the GitHub Actions run URL

---

## Stage 4 — CI Monitoring & Verification

### 4a. CI Monitoring

Poll `gh run list --workflow=release.yml --limit=1` every 30 seconds until the run reaches a terminal state (`success` or `failure`). Expected duration ~8 minutes.

Report status of all 4 matrix jobs:
- macOS arm64
- macOS x64
- Ubuntu
- Windows

On any failure: print which jobs failed, print the incident response commands from `PRODUCTION_RELEASE_WORKFLOW.md` (delete-and-retag flow), and stop.

### 4b. Release Body Update

Once CI passes, update the GitHub Release body with the changelog intro paragraph:

```bash
gh release edit vX.Y.Z --notes "<changelog intro paragraph>"
```

This populates `update.body` — the field the in-app update toast and updater panel display as release notes.

### 4c. Artifact Verification

```bash
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

Confirm presence of:
- `latest.json`
- `.sig` files for all platforms
- `SubTrkr-darwin-aarch64.dmg`
- `SubTrkr-darwin-x64.dmg`
- `SubTrkr-windows-x64_setup.exe`
- `SubTrkr-linux-amd64.AppImage`

### 4d. Updater Manifest Verification

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

Confirm `version` matches the tag (without `v`). If it shows the previous version, print the exact retag recovery commands from `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

### 4e. Success Summary

Print:
- Version shipped
- Tag
- GitHub Release URL
- Note: *"Users will see the update on next app launch (auto-check throttled to 12 hours) or immediately via Settings → Account → Check for Updates."*

---

## Version Bump Logic

| Current | Bump type | New |
|---------|-----------|-----|
| 1.2.1 | patch | 1.2.2 |
| 1.2.1 | minor | 1.3.0 |
| 1.2.1 | major | 2.0.0 |

Standard semver. Minor resets patch to 0. Major resets minor and patch to 0.

---

## Files Modified Per Release

| File | Change |
|------|--------|
| `package.json` | `version` field bumped |
| `src-tauri/Cargo.toml` | `version` field bumped |
| `CHANGELOG.md` | New release section prepended |
| `src-tauri/tauri.conf.json` | **Not touched** — CI patches this from the tag at build time |

---

## Abort Conditions

The skill stops and explains what to fix for:
- Uncommitted changes at preflight
- `bun install` failure
- TypeScript errors
- `git push` failure
- Any CI matrix job failure
- `latest.json` version mismatch post-release

---

## Out of Scope

- Smoke testing the installed app (manual step per `RELEASE_CAPTAIN_CHECKLIST.md`)
- Key rotation or updater pubkey management
- Pre-release / RC flows (tags with `-` are pre-releases per workflow logic and don't update `latest`)
- Changelog editing (user owns this — the skill drafts, user edits)
