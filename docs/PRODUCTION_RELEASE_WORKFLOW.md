# SubTrkr Production Release Workflow

Reference doc for cutting a release. For the per-release execution checklist, use `RELEASE_CAPTAIN_CHECKLIST.md`.

---

## How a Release Works

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which:

1. Reads the tag name, strips the `v`, and writes that version into `src-tauri/tauri.conf.json` at build time (you do **not** need to manually bump the version in that file before tagging)
2. Builds signed installers for macOS arm64, macOS x64, Ubuntu, and Windows
3. Publishes all artifacts to a GitHub Release
4. Generates and uploads `latest.json` — the manifest the in-app updater polls

Users are notified on next app launch (auto-check throttled to every 12 hours) or immediately via Settings → Check for Updates.

---

## Implementation Map

| Concern | File |
|---|---|
| Release CI | `.github/workflows/release.yml` |
| Updater config (endpoint, pubkey) | `src-tauri/tauri.conf.json` |
| Updater runtime (auto-check, throttle) | `src/services/updater.ts` |
| Manual update button | `src/components/AccountSettings.tsx` |
| Plugin wiring | `src-tauri/src/lib.rs`, `src-tauri/capabilities/default.json` |

---

## Release Process

### 1. Prepare

Ensure `main` is clean and all features for this release are merged.

```bash
git status
git pull origin main
```

Run a quick sanity check:

```bash
bun install --frozen-lockfile
bunx tsc --noEmit
```

### 2. Update the Changelog

Edit `CHANGELOG.md` — move content from `[Unreleased]` to the new version section, or write it fresh from the git log:

```bash
git log vX.Y.Z-previous..HEAD --oneline
```

Commit:

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

That's it. The workflow handles version injection, builds, signing, and publishing.

> **You do not need to manually bump `src-tauri/tauri.conf.json`** before tagging — the CI workflow sets it from the tag at build time. It's good practice to bump it after a release so your local dev version stays accurate, but it does not affect what gets shipped.

### 4. Monitor CI

```bash
gh run list --workflow=release.yml --limit=3
```

All four matrix jobs (macOS arm64, macOS x64, Ubuntu, Windows) must complete with `success`. The full run takes ~8 minutes.

### 5. Verify the Release

```bash
# Check all artifacts are present
gh release view vX.Y.Z --json assets --jq '.assets[].name'

# Verify latest.json version matches the tag
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'
```

The version in `latest.json` must match the tag (without `v`). If it says the previous version, the version injection step in the workflow failed — see Troubleshooting.

---

## Stable Download URLs

These URLs stay consistent across releases (the `assetNamePattern` in the workflow keeps filenames fixed):

| Platform | URL |
|---|---|
| macOS (Apple Silicon) | `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/SubTrkr-darwin-aarch64.dmg` |
| macOS (Intel) | `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/SubTrkr-darwin-x64.dmg` |
| Windows | `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/SubTrkr-windows-x64_setup.exe` |
| Linux (AppImage) | `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/SubTrkr-linux-amd64.AppImage` |
| All platforms | `https://github.com/TylerPBurnett/SubTrkr/releases/latest` |

Do not link `.sig`, `.app.tar.gz`, or `latest.json` to end users — those are updater internals.

---

## Incident Response

### CI failed before assets were published

Fix the root cause on `main`, push, then delete and recreate the tag:

```bash
git push origin main

git push origin :vX.Y.Z   # delete remote tag
git tag -d vX.Y.Z          # delete local tag
git tag -a vX.Y.Z -m "vX.Y.Z — re-trigger after CI fix"
git push origin vX.Y.Z
```

This is safe as long as no users have already downloaded artifacts from the failed release. Check the GitHub Release to confirm no assets were published before deleting the tag.

### latest.json version is wrong (version mismatch)

Cause: `tauri.conf.json` was not properly updated by the workflow, or the workflow failed the version sync step silently.

Fix: same as above — delete and recreate the tag after confirming the workflow's "Sync version from tag" step logs the correct version.

### Release published but has a defect

Ship a patch release (`vX.Y.Z+1`) as quickly as possible. Do not delete or modify the published release — keep it for auditability. Users on the bad version will auto-update to the patch.

### Updater key compromise or loss

Existing installs trust the public key baked into the shipped binary. Rotating keys means those clients cannot verify updates signed by the new key. Treat as a high-severity incident — plan an explicit user communication and migration path before rotating.

---

## One-Time Setup (Already Done)

Documented here for disaster recovery.

### Generate updater keypair

```bash
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(openssl rand -base64 32)"
bun tauri signer generate --password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" -w ~/.tauri/subtrkr-prod.key
```

Store the private key and password in a secure vault with at least one off-machine backup.

### Set GitHub Actions secrets

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/subtrkr-prod.key
printf '%s' "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
gh secret set VITE_SUPABASE_URL --body 'https://your-project.supabase.co'
gh secret set VITE_SUPABASE_ANON_KEY --body 'your-anon-key'
```

### Set public key in app config

Copy the `.pub` file contents into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`. The CI private key and this public key must always be a matching pair.

---

## Troubleshooting

### latest.json version doesn't match the tag

The "Sync version from tag" step in the workflow failed or was skipped. Check the CI logs:

```bash
gh run view $(gh run list --workflow=release.yml --limit=1 --json databaseId --jq '.[0].databaseId') --log | grep -A5 "Sync version"
```

If the step ran but produced wrong output, delete and recreate the tag after verifying the workflow step logic in `.github/workflows/release.yml`.

### "failed to decode secret key" / signing errors

Ensure `TAURI_SIGNING_PRIVATE_KEY` is valid key file content and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` exactly matches. Validate locally:

```bash
tmp=$(mktemp)
echo "test" > "$tmp"
bun tauri signer sign -k "$(cat ~/.tauri/subtrkr-prod.key)" -p "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" "$tmp"
rm -f "$tmp" "$tmp.sig"
```

### macOS "app is damaged and can't be opened"

The release workflow uses ad-hoc signing (`APPLE_SIGNING_IDENTITY: "-"`), which prevents broken bundle signatures but is not notarized. Workaround for testing:

```bash
xattr -cr /path/to/SubTrkr.app
```

For production UX, configure Apple Developer ID signing + notarization.

### Workflow builds but no latest.json

Ensure `bundle.createUpdaterArtifacts: true` in `src-tauri/tauri.conf.json` and `includeUpdaterJson: true` in the workflow action inputs. Do not change the action version and input names independently — they must match.

### "No published app updates are available yet" in-app

Verify `latest.json` exists and its version is newer than the installed app:

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq '{version}'
```

The auto-check is throttled to once every 12 hours per device. To force a check immediately, use Settings → Check for Updates.
