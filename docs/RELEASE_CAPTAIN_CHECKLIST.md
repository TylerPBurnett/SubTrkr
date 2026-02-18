# Release Captain Checklist

One checklist per release. Fill in the header, work top to bottom.

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

- [ ] `main` is clean and up to date with origin
- [ ] `bun install` succeeds
- [ ] TypeScript has no errors

---

## 2. Changelog

```bash
git log vPREVIOUS..HEAD --oneline   # review commits
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
- [ ] Release workflow started in GitHub Actions

---

## 4. CI — Wait ~8 Minutes

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
- [ ] Windows `.exe` and `.msi` present
- [ ] Linux `.AppImage` present

---

## 6. Verify Updater Manifest

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

- [ ] `version` matches the tag (e.g. `"1.1.0"`, not the previous release)
- [ ] `pub_date` is recent
- [ ] URLs and signatures are populated (not empty strings)

> **If version is wrong:** The workflow's "Sync version from tag" step failed.
> Delete and recreate the tag — see `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

---

## 7. Smoke Test (Optional but Recommended for Minor/Major)

- [ ] Launched installed older version
- [ ] Settings → Check for Updates → detects new version
- [ ] Download and install completed
- [ ] App relaunched on new version

---

## Sign-Off

- [ ] Release notes / changelog reviewed
- [ ] Known issues documented (if any)
- [ ] Done — close this checklist

---

## Incident Notes

_Fill in if anything went wrong:_

- What failed:
- User impact:
- Mitigation:
- Permanent fix:
