# Repo Structure Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean the repo root by moving non-tooling docs into structured `docs/` subfolders and updating references without breaking tooling.

**Architecture:** Keep required build/config files at root and reorganize documentation into `docs/architecture`, `docs/notifications`, `docs/plans`, and `docs/reference`. Update markdown links or script references to the new paths. Avoid runtime changes.

**Tech Stack:** Bun, Vite, Tauri, TypeScript, Markdown docs

---

### Task 1: Inventory docs and create target folders

**Files:**
- Modify: `docs/` (create folders)

**Step 1: Create folders**

Run:
```bash
mkdir -p docs/architecture docs/notifications docs/plans docs/reference docs/images
```

**Step 2: Confirm folders exist**

Run:
```bash
ls docs
```

Expected: new folders listed.

**Step 3: Commit**

```bash
git add docs/architecture docs/notifications docs/plans docs/reference docs/images
git commit -m "chore: add docs subfolders"
```

### Task 2: Move root markdown docs into docs subfolders

**Files:**
- Move: `DESIGN_SYSTEM.md` -> `docs/reference/DESIGN_SYSTEM.md`
- Move: `NOTIFICATION_CUSTOMIZATION.md` -> `docs/notifications/NOTIFICATION_CUSTOMIZATION.md`
- Move: `NOTIFICATION_IMPROVEMENTS.md` -> `docs/notifications/NOTIFICATION_IMPROVEMENTS.md`
- Move: `NOTIFICATION_SETUP.md` -> `docs/notifications/NOTIFICATION_SETUP.md`
- Move: `NOTIFICATIONS_COMPLETE.md` -> `docs/notifications/NOTIFICATIONS_COMPLETE.md`
- Move: `TELEGRAM_ARCHITECTURE.md` -> `docs/architecture/TELEGRAM_ARCHITECTURE.md`
- Move: `TIMEZONE_IMPLEMENTATION.md` -> `docs/architecture/TIMEZONE_IMPLEMENTATION.md`
- Move: `TRIAL_AUTOMATION_CHANGES.md` -> `docs/architecture/TRIAL_AUTOMATION_CHANGES.md`
- Move: `plan.md` -> `docs/plans/plan.md`
- Move: `Sonnet_recs.md` -> `docs/reference/Sonnet_recs.md`

**Step 1: Move files**

Run:
```bash
mv DESIGN_SYSTEM.md docs/reference/
mv NOTIFICATION_CUSTOMIZATION.md docs/notifications/
mv NOTIFICATION_IMPROVEMENTS.md docs/notifications/
mv NOTIFICATION_SETUP.md docs/notifications/
mv NOTIFICATIONS_COMPLETE.md docs/notifications/
mv TELEGRAM_ARCHITECTURE.md docs/architecture/
mv TIMEZONE_IMPLEMENTATION.md docs/architecture/
mv TRIAL_AUTOMATION_CHANGES.md docs/architecture/
mv TIMEZONE_IMPLEMENTATION.md docs/architecture/
mv plan.md docs/plans/
mv Sonnet_recs.md docs/reference/
```

**Step 2: Commit**

```bash
git add docs/architecture docs/notifications docs/plans docs/reference
git commit -m "chore: move root docs into docs folders"
```

### Task 3: Merge `Plans/` contents into `docs/plans/`

**Files:**
- Move: `Plans/*` -> `docs/plans/`
- Delete: `Plans/` (empty)

**Step 1: Move contents**

Run:
```bash
if [ -d Plans ]; then mv Plans/* docs/plans/; rmdir Plans; fi
```

**Step 2: Commit**

```bash
git add docs/plans
git commit -m "chore: move Plans content into docs/plans"
```

### Task 4: Move `enable-cron.sql` into docs reference (or supabase if required)

**Files:**
- Move: `enable-cron.sql` -> `docs/reference/enable-cron.sql`

**Step 1: Move file**

Run:
```bash
mv enable-cron.sql docs/reference/
```

**Step 2: Commit**

```bash
git add docs/reference/enable-cron.sql
git commit -m "chore: move enable-cron reference into docs"
```

### Task 5: Update markdown links and references

**Files:**
- Modify: any markdown or scripts referencing old doc paths

**Step 1: Search for old paths**

Run:
```bash
rg -n "DESIGN_SYSTEM.md|NOTIFICATION_CUSTOMIZATION.md|NOTIFICATION_IMPROVEMENTS.md|NOTIFICATION_SETUP.md|NOTIFICATIONS_COMPLETE.md|TELEGRAM_ARCHITECTURE.md|TIMEZONE_IMPLEMENTATION.md|TRIAL_AUTOMATION_CHANGES.md|plan.md|Sonnet_recs.md|enable-cron.sql" -g"!node_modules" -g"!.git" 
```

**Step 2: Update references**

Update any occurrences to their new `docs/...` locations.

**Step 3: Commit**

```bash
git add docs README.md scripts src

git commit -m "chore: update doc references after move"
```

### Task 6: Optional - move `branding/` under docs if unused by build

**Files:**
- Move: `branding/` -> `docs/branding/` (only if not referenced by code/build)

**Step 1: Check for references**

Run:
```bash
rg -n "branding/" -g"!node_modules" -g"!.git"
```

**Step 2: Move if safe**

If no build/runtime references found:
```bash
mv branding docs/branding
```

**Step 3: Commit**

```bash
git add docs/branding
git commit -m "chore: move branding assets into docs"
```

### Task 7: Optional - move `index.html` if build allows (likely keep at root)

**Files:**
- Keep: `index.html` at root unless Vite configured otherwise

**Step 1: Confirm**

No action unless you want to reconfigure Vite entrypoint.

### Task 8: Verification

**Step 1: Search for old paths again**

Run:
```bash
rg -n "DESIGN_SYSTEM.md|NOTIFICATION_CUSTOMIZATION.md|NOTIFICATION_IMPROVEMENTS.md|NOTIFICATION_SETUP.md|NOTIFICATIONS_COMPLETE.md|TELEGRAM_ARCHITECTURE.md|TIMEZONE_IMPLEMENTATION.md|TRIAL_AUTOMATION_CHANGES.md|plan.md|Sonnet_recs.md|enable-cron.sql" -g"!node_modules" -g"!.git"
```

Expected: no references to old root paths.

**Step 2: Note tests**

No tests required for doc-only changes. If desired, run:
```bash
bun test
```
Expected: likely no tests found.

