# SubTrkr Production Release Workflow

Reference for cutting a release. For the per-release execution checklist, use `RELEASE_CAPTAIN_CHECKLIST.md`.

---

## How a Release Works

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which:

1. Strips the `v` from the tag name and writes that version into `src-tauri/tauri.conf.json` at build time — **you do not need to manually bump the version in that file before tagging**
2. Builds signed installers for macOS arm64, macOS x64, Ubuntu, and Windows
3. Publishes all artifacts to a GitHub Release
4. Generates and uploads `latest.json` — the manifest the in-app updater polls

Users are notified on next app launch (auto-check throttled to every 12 hours) or immediately via Settings → Check for Updates.

---

## Implementation Map

| Concern | Location |
|---|---|
| Release CI | `.github/workflows/release.yml` |
| Updater config (endpoint, pubkey) | `src-tauri/tauri.conf.json` |
| Updater runtime (auto-check, throttle) | `src/services/updater.ts` |
| Manual update button | `src/components/AccountSettings.tsx` |
| Plugin wiring | `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` |

---

## Release Process

### 1. Prepare

```bash
git status
git pull origin main
bun install --frozen-lockfile
bunx tsc --noEmit
```

All clear? Continue.

### 2. Write the Changelog

Review commits since the last tag:

```bash
git log $(git describe --tags --abbrev=0)..HEAD --oneline
```

Edit `CHANGELOG.md`, then commit and push:

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG for vX.Y.Z"
git push origin main
```

### 3. Tag and Release

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — short summary"
git push origin vX.Y.Z
```

That's it. The workflow handles version injection, builds, signing, and publishing automatically.

### 4. Monitor CI (~8 minutes)

```bash
gh run list --workflow=release.yml --limit=3
```

All four matrix jobs (macOS arm64, macOS x64, Ubuntu, Windows) must show `success`.

### 5. Verify the Release

```bash
# Confirm all artifacts uploaded
gh release view vX.Y.Z --json assets --jq '.assets[].name'

# Confirm latest.json version matches the tag — this is the critical check
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

The `version` field must match the tag (without `v`). If it shows the previous release version, see **Incident: latest.json version is wrong** below.

---

## Stable Download URLs

These URLs stay consistent across releases due to the `assetNamePattern` in the workflow:

| Platform | URL |
|---|---|
| macOS (Apple Silicon) | `.../releases/latest/download/SubTrkr-darwin-aarch64.dmg` |
| macOS (Intel) | `.../releases/latest/download/SubTrkr-darwin-x64.dmg` |
| Windows | `.../releases/latest/download/SubTrkr-windows-x64_setup.exe` |
| Linux (AppImage) | `.../releases/latest/download/SubTrkr-linux-amd64.AppImage` |
| All platforms | `.../releases/latest` |

Base URL: `https://github.com/TylerPBurnett/SubTrkr`

Do not link `.sig`, `.app.tar.gz`, or `latest.json` to end users — those are updater internals.

---

## Incident Response

### CI failed — nothing published yet

Fix the root cause on `main`, push, then delete and recreate the tag:

```bash
git push origin main

git push origin :vX.Y.Z   # delete remote tag
git tag -d vX.Y.Z          # delete local tag
git tag -a vX.Y.Z -m "vX.Y.Z — re-trigger after fix"
git push origin vX.Y.Z
```

Safe to do as long as no artifacts were published from the failed run. Check with:

```bash
gh release view vX.Y.Z --json assets --jq '.assets | length'
```

If it returns `0`, no assets were published and the retag is safe.

### latest.json version is wrong (shows previous release)

The workflow's "Sync version from tag" step failed. The build ran with the version from `tauri.conf.json` in the repo rather than the tag.

Fix: same delete-and-retag flow above. Check the CI logs to confirm the step ran:

```bash
gh run view $(gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId') --log | grep -A5 "Sync version"
```

### Release published but has a defect

Ship a patch release (`vX.Y.Z+1`) as quickly as possible. Do not delete or modify the published release — keep it for auditability. Users on the bad version will auto-update to the patch.

### Updater key compromise or loss

Existing installs trust the public key baked into the shipped binary. Rotating keys means those clients cannot verify updates signed by the new key. Treat as high-severity — plan explicit user communication and migration before rotating.

---

## One-Time Setup (Already Done — Disaster Recovery Reference)

### Generate updater keypair

```bash
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(openssl rand -base64 32)"
bun tauri signer generate --password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" -w ~/.tauri/subtrkr-prod.key
```

Back up the private key and password in a secure vault with at least one off-machine copy.

### Set GitHub Actions secrets

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/subtrkr-prod.key
printf '%s' "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
gh secret set VITE_SUPABASE_URL --body 'https://your-project.supabase.co'
gh secret set VITE_SUPABASE_ANON_KEY --body 'your-anon-key'
```

### Set public key in app config

Copy the `.pub` file contents into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`. The CI private key and this public key must always be a matching pair — if they diverge, the updater will fail signature verification.

---

## Troubleshooting

### latest.json version doesn't match the tag

See **Incident: latest.json version is wrong** above.

### In-app updater not prompting users

- The auto-check is throttled to once per 12 hours per device. Users can force a check via Settings → Check for Updates.
- Confirm `latest.json` version is actually higher than the installed version:
  ```bash
  curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq .version
  ```

### "failed to decode secret key" / signing errors

Validate the key/password match locally:

```bash
tmp=$(mktemp)
echo "test" > "$tmp"
bun tauri signer sign -k "$(cat ~/.tauri/subtrkr-prod.key)" -p "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" "$tmp"
rm -f "$tmp" "$tmp.sig"
```

### macOS "app is damaged and can't be opened"

The release uses ad-hoc signing — not notarized. Workaround for users:

```bash
xattr -cr /Applications/SubTrkr.app
```

For production-grade UX, configure Apple Developer ID signing + notarization.

### Workflow builds but no latest.json

- Confirm `bundle.createUpdaterArtifacts: true` in `src-tauri/tauri.conf.json`
- Confirm `includeUpdaterJson: true` in the workflow action inputs (correct for `tauri-action@v0.6.1`)

### tauri-action version note

Currently pinned to `tauri-apps/tauri-action@v0.6.1`. If upgrading, verify input names — some versions use `uploadUpdaterJson` instead of `includeUpdaterJson`. Do not change the action version and input names independently.
