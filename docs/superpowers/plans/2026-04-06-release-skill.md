# Release Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `/release` slash command that automates the full SubTrkr release flow — preflight, version bump, AI-drafted changelog, tag, CI monitoring, and release verification.

**Architecture:** A single `.claude/commands/release.md` file following the existing project command pattern. The command uses `!` to inject live command output into context, then instructs Claude to execute each stage of the release flow interactively.

**Tech Stack:** Claude Code slash commands (`.claude/commands/`), bash via `!` injection, `gh` CLI, `bun`, `git`, `jq`, `curl`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `.claude/commands/release.md` | The `/release` slash command — full release flow |
| Already exists | `docs/superpowers/specs/2026-04-06-release-skill-design.md` | Spec (already written) |
| Already exists | `docs/superpowers/plans/2026-04-06-release-skill.md` | This plan |

---

### Task 1: Commit the spec and plan docs

**Files:**
- Modify: `docs/superpowers/specs/2026-04-06-release-skill-design.md` (already written)
- Modify: `docs/superpowers/plans/2026-04-06-release-skill.md` (this file)

- [ ] **Step 1: Stage and commit the spec and plan**

```bash
git add docs/superpowers/specs/2026-04-06-release-skill-design.md
git add docs/superpowers/plans/2026-04-06-release-skill.md
git commit -m "docs: add release skill spec and implementation plan"
```

Expected: commit succeeds, no errors.

---

### Task 2: Create the `/release` command file

**Files:**
- Create: `.claude/commands/release.md`

This is the main deliverable. The command file instructs Claude on the full release flow. Write it exactly as shown below.

- [ ] **Step 1: Create `.claude/commands/release.md`**

Write the following content exactly:

````markdown
---
description: Run the full SubTrkr release flow — preflight, version bump, changelog, tag, CI, and verification
---

## Release Context

**Current version (from package.json):**
!`node -e "const p = JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log(p.version)"`

**Git status:**
!`git status --short`

**Commits since last tag:**
!`git log $(git describe --tags --abbrev=0)..HEAD --oneline 2>/dev/null || echo "(no previous tag found — this is the first release)"`

**Last tag:**
!`git describe --tags --abbrev=0 2>/dev/null || echo "(none)"`

---

## Stage 1 — Preflight

Work through these checks in order. Stop and explain what to fix if any check fails. Do not proceed until all pass.

1. **Uncommitted changes check:** If `git status --short` above shows any output, stop. Tell the user to commit or stash everything before releasing.

2. **Pull latest:**
   ```bash
   git pull origin main
   ```
   Abort if this fails.

3. **Install dependencies:**
   ```bash
   bun install --frozen-lockfile
   ```
   Abort if this fails.

4. **TypeScript check:**
   ```bash
   bunx tsc --noEmit
   ```
   Abort on any errors. Note: `database.ts:750` unused var `now` (TS6133) is pre-existing — ignore it.

If all checks pass, tell the user preflight is clear and proceed to Stage 2.

---

## Stage 2 — Version & Changelog

1. **Ask the user:** "Current version is X.Y.Z. Is this a patch, minor, or major bump?"
   - patch: increment Z (e.g. 1.2.1 → 1.2.2)
   - minor: increment Y, reset Z to 0 (e.g. 1.2.1 → 1.3.0)
   - major: increment X, reset Y and Z to 0 (e.g. 1.2.1 → 2.0.0)

2. **Bump version in `package.json`:** Update the `"version"` field to the new version. Use the Edit tool — do not rewrite the whole file.

3. **Bump version in `src-tauri/Cargo.toml`:** Find the `version = "..."` line in the `[package]` section and update it to the same new version. Use the Edit tool.
   - Note: `tauri.conf.json` is intentionally NOT touched — the CI workflow patches it from the git tag at build time.

4. **Draft the CHANGELOG entry:** Using the commits listed above in "Commits since last tag", write a new CHANGELOG section following the format of existing entries in `CHANGELOG.md`:
   - A narrative intro paragraph (1–3 sentences summarizing what this release is about)
   - Grouped subsections: Features, Improvements, Fixes, Chores (omit any empty sections)
   - A Migration Guide at the bottom (note if no breaking changes)
   - Match the exact heading style: `## [vX.Y.Z] — YYYY-MM-DD`

5. **Prepend the draft to `CHANGELOG.md`** (insert after the `# Changelog` header and `---` separator, before the previous latest entry).

6. **Pause and tell the user:** "Changelog drafted and prepended to `CHANGELOG.md`. Please review and edit it now — open the file, make any changes you want, then come back and confirm when ready."

   Wait for the user to confirm before continuing.

7. **After confirmation, commit everything:**
   ```bash
   git add CHANGELOG.md package.json src-tauri/Cargo.toml
   git commit -m "chore: prepare vX.Y.Z release"
   git push origin main
   ```
   Replace `X.Y.Z` with the actual new version. Abort if push fails.

---

## Stage 3 — Tag & Push

1. **Confirmation gate:** Ask the user: "Ready to tag and release vX.Y.Z? This pushes the tag to GitHub, triggers CI, and is the point of no return. (y/n)"

   Stop if the user says no.

2. **Extract the tag annotation:** Use the first sentence of the intro paragraph you wrote in the CHANGELOG as the tag annotation message.

3. **Create and push the tag:**
   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z — <first sentence of changelog intro>"
   git push origin vX.Y.Z
   ```

4. **Confirm the workflow started:**
   ```bash
   gh run list --workflow=release.yml --limit=1
   ```
   Print the run ID and URL so the user can watch it in the browser if they want.

---

## Stage 4 — CI Monitoring & Verification

### 4a. Monitor CI

Poll every 30 seconds until the run reaches a terminal state. Run this to check status:
```bash
gh run list --workflow=release.yml --limit=1 --json status,conclusion,databaseId,url
```

Expected duration: ~8 minutes. All 4 matrix jobs must succeed:
- macOS arm64
- macOS x64
- Ubuntu
- Windows

If any job fails, stop and print:
```
CI failed. To retry after fixing the root cause on main:

  git push origin main
  git push origin :vX.Y.Z   # delete remote tag
  git tag -d vX.Y.Z          # delete local tag
  git tag -a vX.Y.Z -m "vX.Y.Z — re-trigger after fix"
  git push origin vX.Y.Z

Only safe if no artifacts were published. Check with:
  gh release view vX.Y.Z --json assets --jq '.assets | length'
If it returns 0, no assets were published and the retag is safe.
```

### 4b. Update release body

Once CI passes, extract the full intro paragraph from the CHANGELOG entry and set it as the GitHub Release body:
```bash
gh release edit vX.Y.Z --notes "<full intro paragraph from CHANGELOG>"
```

This is what populates the release notes shown in the in-app updater toast and the update panel.

### 4c. Verify artifacts

```bash
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

Confirm all of these are present:
- `latest.json`
- At least one `.sig` file per platform
- `SubTrkr-darwin-aarch64.dmg`
- `SubTrkr-darwin-x64.dmg`
- `SubTrkr-windows-x64_setup.exe`
- `SubTrkr-linux-amd64.AppImage`

If any are missing, tell the user and point them to `docs/PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

### 4d. Verify updater manifest

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

The `version` field must match the tag without the `v` prefix (e.g. `"1.2.2"` not `"v1.2.2"`).

If it shows the previous version, print:
```
latest.json version is wrong — the workflow's "Sync version from tag" step failed.
Delete and recreate the tag (same commands as CI failure above), then re-trigger.
See docs/PRODUCTION_RELEASE_WORKFLOW.md → Incident Response for full details.
```

### 4e. Success summary

Print a final summary:
```
Release complete.

  Version:  X.Y.Z
  Tag:      vX.Y.Z
  Release:  https://github.com/TylerPBurnett/SubTrkr/releases/tag/vX.Y.Z

Users will see the update on next app launch (auto-check throttled to 12 hours)
or immediately via Settings → Account → Check for Updates.
```
````

- [ ] **Step 2: Verify the file was written correctly**

Read `.claude/commands/release.md` and confirm:
- Frontmatter has `description:` field
- All 4 stages are present with correct headings
- `!` command injections are at the top for context
- Version bump covers both `package.json` and `src-tauri/Cargo.toml`
- Confirmation gate exists before the tag push
- Release body update (`gh release edit`) is in Stage 4b
- Success summary is at the end

- [ ] **Step 3: Commit the command file**

```bash
git add .claude/commands/release.md
git commit -m "feat: add /release slash command for automated release flow"
```

Expected: commit succeeds.

---

### Task 3: Smoke-test the preflight section

This verifies the `!` injections work and the command is discoverable before you need it for a real release.

- [ ] **Step 1: Invoke the skill**

Run `/release` in Claude Code. Verify:
- The injected context section populates correctly (current version, git status, commit log, last tag)
- Claude reaches Stage 1 and runs the preflight checks
- If there are uncommitted changes, Claude stops and says so
- If everything is clean, Claude proceeds to Stage 2 and asks for the bump type

- [ ] **Step 2: Abort at the bump type prompt**

When Claude asks "patch, minor, or major?", respond with something that cancels (e.g. "stop, just testing"). Verify Claude stops cleanly without creating any commits or tags.

This confirms the interactive flow works without accidentally triggering a release.

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|------------------|------------|
| Stage 1: git status, pull, bun install, tsc | Task 2 — Stage 1 section |
| Stage 2: version bump prompt (patch/minor/major) | Task 2 — Stage 2 step 1 |
| Bump `package.json` | Task 2 — Stage 2 step 2 |
| Bump `src-tauri/Cargo.toml` | Task 2 — Stage 2 step 3 |
| Don't touch `tauri.conf.json` | Task 2 — Stage 2 step 3 note |
| AI-draft CHANGELOG | Task 2 — Stage 2 step 4 |
| Pause for user review | Task 2 — Stage 2 step 6 |
| Commit: CHANGELOG + package.json + Cargo.toml | Task 2 — Stage 2 step 7 |
| Confirmation gate before tag | Task 2 — Stage 3 step 1 |
| Tag annotation from changelog intro | Task 2 — Stage 3 step 2–3 |
| Poll CI, report 4 matrix jobs | Task 2 — Stage 4a |
| Incident response commands on CI failure | Task 2 — Stage 4a failure block |
| Update GitHub Release body from changelog | Task 2 — Stage 4b |
| Verify artifacts | Task 2 — Stage 4c |
| Verify `latest.json` version | Task 2 — Stage 4d |
| latest.json incident response | Task 2 — Stage 4d failure block |
| Success summary | Task 2 — Stage 4e |
| About section version auto-updates | Handled by `package.json` bump (vite.config.ts reads it at build time) — no extra step needed |

All spec requirements covered. No gaps.
