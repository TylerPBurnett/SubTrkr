# SubTrkr Updater Testing Guide

How to verify the in-app updater works before or after shipping a release.

---

## How the Updater Works

The app polls this endpoint on launch and when "Check for Updates" is clicked:

```
https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json
```

GitHub's `/releases/latest/` resolves to the **most recent non-pre-release, non-draft release**. The Tauri updater compares the `version` in `latest.json` against the installed app version. If the manifest version is higher, the user is prompted to update.

**Important:** Tags with `-` in their name (e.g. `-rc.1`, `-beta.1`) are marked as pre-releases by the workflow and do **not** update the `/releases/latest/` pointer. Publishing `v1.1.0-rc.1` will not cause any installed app to see an update — `/releases/latest/download/latest.json` will still return the previous stable release. The RC flow described in older versions of this doc does not work.

---

## Recommended Testing Method

The most reliable approach is to build a local "old" version that points at a specific release's `latest.json`, then verify it detects and installs the update.

### Step 1: Build a local "old" app

Temporarily modify `src-tauri/tauri.conf.json` — do **not** commit these changes:

```json
{
  "version": "0.0.1",
  "plugins": {
    "updater": {
      "endpoints": [
        "https://github.com/TylerPBurnett/SubTrkr/releases/download/vX.Y.Z-TARGET/latest.json"
      ],
      "pubkey": "..."
    }
  }
}
```

Set `version` lower than the target release. Set `endpoints` to a specific release's `latest.json` URL (swap in the tag you want to test updating to).

Build and install:

```bash
bun tauri build
# Installer is in src-tauri/target/release/bundle/
```

**Revert `tauri.conf.json` before committing anything.**

### Step 2: Trigger the update

Launch the installed build. Go to Settings → Check for Updates.

Expected:
- Detects the target release as newer
- Prompts to install
- Downloads, installs, relaunches on the new version
- User data is intact after relaunch

---

## Post-Release Verification (Run After Every Production Release)

```bash
# 1. Confirm workflow succeeded
gh run list --workflow=release.yml --limit=1

# 2. Confirm latest.json version matches the tag
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json \
  | jq '{version, pub_date}'

# 3. Confirm all artifacts are present
gh release view vX.Y.Z --json assets --jq '.assets[].name'
```

The `version` in `latest.json` must match the release tag (without `v`). If it shows the previous version, see `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

To force an immediate update check without waiting for the 12-hour auto-check throttle: Settings → Account Settings → Check for Updates.

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

### No update prompt even though a new version was released

Check what `latest.json` actually says:

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq .version
```

If it shows the previous version rather than the new one, the workflow's version sync step failed — see `PRODUCTION_RELEASE_WORKFLOW.md` → Incident Response.

If it shows the correct version, the installed app may have already checked within the past 12 hours and cached the "up to date" result. Use the manual Check for Updates button to bypass the throttle.

### macOS "app is damaged and can't be opened"

Clear the quarantine flag:

```bash
xattr -cr /Applications/SubTrkr.app
# or on the DMG before installing:
xattr -cr ~/Downloads/SubTrkr-darwin-aarch64.dmg
```

### "Signature verification failed"

The `pubkey` in `tauri.conf.json` doesn't match `TAURI_SIGNING_PRIVATE_KEY` in GitHub Actions. These must be a matching pair. If they diverged, ship a new build with the correct pubkey before the updater will work again.

### Update downloads but install fails

- Check available disk space
- Verify the app isn't installed in a read-only location
- macOS: check Console.app for errors at the time of install
- Fallback: direct download from the GitHub Release page

---

## Related

- [Production Release Workflow](PRODUCTION_RELEASE_WORKFLOW.md)
- [Release Captain Checklist](RELEASE_CAPTAIN_CHECKLIST.md)
- [Tauri Updater Plugin docs](https://v2.tauri.app/plugin/updater/)
