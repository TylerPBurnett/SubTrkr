# Release Captain Checklist

One copy per release. Fill in the header, work top to bottom.

---

## Release Info

- **Version:** vX.Y.Z
- **Date:**
- **Type:** patch / minor / major
- **Captain:**

---

## 1. Preflight

```bash
git status && git pull origin main
bun install --frozen-lockfile
bunx tsc --noEmit
```

- [ ] `main` is clean and up to date
- [ ] `bun install` succeeds
- [ ] TypeScript has no errors

---

## 2. Changelog

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

- [ ] `CHANGELOG.md` written and committed
- [ ] Pushed to `main`

---

## 3. Tag and Push

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — short summary"
git push origin vX.Y.Z
```

- [ ] Tag created and pushed
- [ ] GitHub Actions release workflow started

> No version bump needed — the workflow sets it from the tag automatically.

---

## 4. CI (~8 min)

```bash
gh run list --workflow=release.yml --limit=1
```

- [ ] macOS arm64 — success
- [ ] macOS x64 — success
- [ ] Ubuntu — success
- [ ] Windows — success

---

## 5. Verify Artifacts

```bash
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

- [ ] `latest.json` present
- [ ] `.sig` files present for all platforms
- [ ] macOS `.dmg` files present
- [ ] Windows `.exe` / `.msi` present
- [ ] Linux `.AppImage` present

---

## 6. Verify Updater Manifest ← most important step

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

- [ ] `version` matches this release (e.g. `"1.1.0"`, **not** the previous release)
- [ ] `pub_date` is recent
- [ ] Signatures and URLs are populated

> **If version is wrong:** the workflow's "Sync version from tag" step failed.
> Delete and recreate the tag — see `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

---

## 7. Smoke Test (recommended for minor/major releases)

- [ ] Opened older installed version
- [ ] Settings → Check for Updates → detected new version
- [ ] Downloaded, installed, relaunched successfully

### Phase 0 Hardening Regression Pass

- [ ] Created a new item and confirmed `next_billing_date` is anchored from the selected `start_date`
- [ ] Edited an existing item, changed `billing_cycle`, and confirmed the next billing date stayed on the item's recurrence anchor instead of shifting from today's date
- [ ] Ran pause, resume, cancel, reactivate, archive, start-trial, and convert flows without status/history regressions
- [ ] Confirmed analytics still reflects recent lifecycle changes correctly
- [ ] Connected, disconnected, and test-sent notification channels without breaking delivery setup
- [ ] Verified the in-app updater still reports the current release version correctly

### Phase 1 CSP Validation Pass

- [ ] App launches without CSP violations in the console
- [ ] Auth flows still work: existing session restore, sign-in, sign-out, and OAuth browser handoff
- [ ] Supabase-backed data loads correctly and realtime updates still arrive
- [ ] Notification settings load, Telegram verification works, and test-send still succeeds
- [ ] Known service logos still render from `img.logo.dev`
- [ ] Existing user-supplied external `logo_url` images were spot-checked for CSP blocking
- [ ] Fonts and overall styling load correctly in both dev and packaged builds

---

## Sign-Off

- [ ] Done

---

## Incident Notes

_Fill in only if something went wrong:_

- What failed:
- User impact:
- Fix applied:
