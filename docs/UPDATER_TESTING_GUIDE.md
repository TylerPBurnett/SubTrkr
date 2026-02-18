# SubTrkr Updater Testing Guide

How to verify the in-app updater works before or after shipping a release.

---

## How the Updater Works

The app polls this endpoint on launch and when "Check for Updates" is clicked:

```
https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json
```

GitHub's `/releases/latest/` resolves to the **most recent non-pre-release, non-draft release**. The Tauri updater compares the version in `latest.json` to the installed app version. If the manifest version is higher, it prompts the user.

**Key implication:** Tags marked as pre-releases (any tag containing `-`, per the release workflow) do **not** update this endpoint. A tag like `v1.1.0-rc.1` will not trigger updates to users — `/releases/latest/download/latest.json` will still return the previous stable version.

---

## Recommended Testing Approach

The simplest and most reliable way to test the updater is to point a local build at a version-specific `latest.json` rather than the live endpoint. This lets you test without publishing anything to users.

### Step 1: Pick or publish a target release to update to

You need a GitHub release that has a `latest.json`. Any existing stable release works, or you can push a real release tag (which will become the new stable for users).

For isolated testing, use an **existing older release** as the "update" target — just to verify the download and install mechanism works end-to-end.

### Step 2: Build a local "old" app that points to a specific release

Temporarily modify the updater endpoint in `src-tauri/tauri.conf.json` to point at a specific release rather than `/latest/`:

```json
"updater": {
  "endpoints": [
    "https://github.com/TylerPBurnett/SubTrkr/releases/download/vX.Y.Z-TARGET/latest.json"
  ],
  "pubkey": "..."
}
```

Set the app version to something *lower* than the target:

```json
"version": "0.0.1"
```

Build locally:

```bash
bun tauri build
```

Install the resulting app from `src-tauri/target/release/bundle/`.

**Revert `tauri.conf.json` before committing anything.**

### Step 3: Trigger an update

Launch the locally-built "old" app. Go to Settings → Check for Updates.

Expected behavior:
- App detects the target version as newer
- Prompts to install
- Downloads, installs, relaunches
- New version is running

### Step 4: Verify post-update state

- [ ] App version reflects the target release
- [ ] User data intact
- [ ] No errors in the app on first launch post-update

---

## Post-Release Verification (After Shipping)

After every production release, run these to confirm users will receive the update:

```bash
# 1. Confirm workflow completed
gh run list --workflow=release.yml --limit=1

# 2. Check latest.json version matches the tag
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'

# 3. Check release assets are all present
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

To manually trigger an update check from a real installed build:

1. Open the app
2. Settings → Account Settings → Check for Updates

The auto-check on launch is throttled to once every 12 hours — the manual button bypasses the throttle.

---

## Complete Uninstall (For Clean Test Installs)

### macOS

```bash
rm -rf /Applications/SubTrkr.app
rm -rf ~/Library/Application\ Support/com.tyler.subtrkr
rm -rf ~/Library/Caches/com.tyler.subtrkr
rm -f  ~/Library/Preferences/com.tyler.subtrkr.plist
rm -rf ~/Library/WebKit/com.tyler.subtrkr
```

### Windows

```powershell
# Uninstall via: Settings → Apps → SubTrkr → Uninstall
rmdir /s /q "$env:APPDATA\com.tyler.subtrkr"
rmdir /s /q "$env:LOCALAPPDATA\com.tyler.subtrkr"
```

### Linux

```bash
rm -f  ~/.local/share/applications/subtrkr.desktop
rm -rf ~/.config/com.tyler.subtrkr
rm -rf ~/.local/share/com.tyler.subtrkr
```

---

## Troubleshooting

### "No published app updates are available yet"

`latest.json` either doesn't exist or is unreachable.

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq .
```

If that 404s, the CI workflow didn't publish `latest.json`. Check:

```bash
gh run list --workflow=release.yml --limit=3
gh release view vX.Y.Z --json assets --jq '.assets[].name' | grep latest
```

### latest.json version matches installed version (no update offered)

The workflow's version sync step didn't run or failed. The release was built with the version from `tauri.conf.json` in the repo rather than the tag.

```bash
# Check what version latest.json actually reports
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq .version
```

Fix: delete and recreate the tag — see `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

### macOS "app is damaged and can't be opened"

The release uses ad-hoc signing (not notarized). Clear the quarantine flag:

```bash
xattr -cr /path/to/SubTrkr.dmg
# or after install:
xattr -cr /Applications/SubTrkr.app
```

### "Signature verification failed"

The `pubkey` in `tauri.conf.json` doesn't match `TAURI_SIGNING_PRIVATE_KEY` in GitHub Actions secrets. These must be a matching pair. If they got out of sync, you need to ship a new build with the matching pubkey before the updater will work again.

### Update downloads but install fails

- Check disk space
- Verify the app isn't installed in a read-only location
- macOS: check Console.app for errors around the time of install
- Fallback: direct download from GitHub Releases

---

## Related

- [Production Release Workflow](PRODUCTION_RELEASE_WORKFLOW.md)
- [Release Captain Checklist](RELEASE_CAPTAIN_CHECKLIST.md)
- [Tauri Updater Plugin](https://v2.tauri.app/plugin/updater/)
