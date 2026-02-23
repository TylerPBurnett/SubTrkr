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

---

## Sign-Off

- [ ] Done

---

## Incident Notes

_Fill in only if something went wrong:_

- What failed:
- User impact:
- Fix applied:
