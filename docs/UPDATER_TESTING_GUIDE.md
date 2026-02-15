# SubTrkr Updater Testing Guide

This guide shows how to safely test the auto-updater flow before pushing production releases.

## Why Test the Updater?

The updater is critical infrastructure. A broken updater means users can't get new versions without manually downloading. Testing ensures:

- Updates are detected correctly
- Downloads complete successfully
- Installation works without errors
- App relaunches on the new version
- Users don't lose data during updates

## Pre-Production Testing Strategy

### The Challenge

The updater endpoint (`/releases/latest/download/latest.json`) always points to the latest release, including pre-releases. This means you can't test in complete isolation without affecting the "latest" pointer.

### The Solution: Release Candidate Flow

Use pre-release tags (`-rc.1`, `-rc.2`, etc.) to test the update chain, then promote to production once verified.

## Recommended Testing Flow

### Step 1: Install Current Production Version

Download and install the latest stable release from GitHub:

```bash
# macOS
open https://github.com/TylerPBurnett/SubTrkr/releases/latest

# Or use direct link:
curl -L -o ~/Downloads/subtrkr.dmg \
  https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-darwin-aarch64.dmg

# Install by opening the DMG and dragging to Applications
```

**Windows:**
- Download: https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-windows-x64_setup.exe
- Run installer

**Linux:**
- Download: https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-linux-amd64.AppImage
- Make executable: `chmod +x subtrkr-linux-amd64.AppImage`
- Run: `./subtrkr-linux-amd64.AppImage`

### Step 2: Push First Release Candidate

Bump version to the next release with `-rc.1` suffix:

```bash
# Update version in these 3 files to "1.0.11" (or next version):
# - package.json
# - src-tauri/tauri.conf.json
# - src-tauri/Cargo.toml

# Commit and push
git add -A
git commit -m "chore(release): bump to v1.0.11-rc.1"
git push origin main

# Create and push tag
git tag v1.0.11-rc.1
git push origin v1.0.11-rc.1
```

Wait for CI to complete (~10 minutes). Verify success:

```bash
gh run list --workflow Release --limit 1
```

### Step 3: Test Update Detection (Stable → RC)

1. Open the installed production app (e.g., v1.0.10)
2. Navigate to **Settings** → **Account Settings**
3. Click **"Check for Updates"**
4. Expected: Prompt appears: _"SubTrkr 1.0.11-rc.1 is available. Install now?"_
5. Click **Yes/OK**
6. Wait for download progress
7. Expected: Prompt: _"Update installed successfully. Restart SubTrkr now to finish updating?"_
8. Click **Yes/OK**
9. App relaunches
10. Verify app shows version `1.0.11-rc.1` (check Settings or About)

### Step 4: Test RC → RC Update

Push a second release candidate to test the update chain:

```bash
# No version changes needed in files (still "1.0.11")
# Just create a new RC tag:
git tag v1.0.11-rc.2
git push origin v1.0.11-rc.2
```

Wait for CI to complete, then:

1. Open the installed RC app (v1.0.11-rc.1)
2. Settings → **"Check for Updates"**
3. Expected: Detects v1.0.11-rc.2
4. Install and verify relaunch works

### Step 5: Test Fresh Install

Completely uninstall the app (see [Complete Uninstall](#complete-uninstall-after-testing) below), then:

1. Download and install v1.0.11-rc.2 from GitHub Releases
2. Open app, sign in
3. Verify all features work:
   - [ ] Login/signup
   - [ ] Items load and display
   - [ ] Add/edit/delete items
   - [ ] Notification settings save
   - [ ] Analytics page renders

### Step 6: Ship Production

Once all tests pass:

```bash
# Tag the production release (no "-rc" suffix)
git tag v1.0.11
git push origin v1.0.11
```

This becomes the new stable release. Existing users (on any version) will now update to v1.0.11.

## Alternative Testing Approach: Version-Specific Endpoint

For isolated testing without affecting the "latest" pointer, you can temporarily modify the updater endpoint in a local build.

### Local Build with Custom Endpoint

1. **Modify `src-tauri/tauri.conf.json` locally** (don't commit):
   ```json
   "plugins": {
     "updater": {
       "endpoints": [
         "https://github.com/TylerPBurnett/SubTrkr/releases/download/v1.0.10/latest.json"
       ],
       "pubkey": "..."
     }
   }
   ```

2. **Build locally:**
   ```bash
   bun tauri build
   ```

3. **Install this build** (find in `src-tauri/target/release/bundle/`)

4. **Push a test RC tag:**
   ```bash
   git tag v1.0.11-rc.1
   git push origin v1.0.11-rc.1
   ```

5. **Update your local `tauri.conf.json`** to point to the RC:
   ```json
   "endpoints": [
     "https://github.com/TylerPBurnett/SubTrkr/releases/download/v1.0.11-rc.1/latest.json"
   ]
   ```

6. **Test update detection** — the installed app should find the RC

7. **Revert `tauri.conf.json`** before final production release

**⚠️ Important:** This approach is more complex and error-prone. The RC flow (Steps 1-6 above) is recommended.

## Pre-Release Tag Behavior

Tags with `-` in the name (e.g., `v1.0.11-rc.1`, `v1.0.11-beta.2`) are automatically marked as pre-releases by the workflow:

```yaml
prerelease: ${{ contains(github.ref_name, '-') }}
```

This means:
- ✅ CI builds and signs everything normally
- ✅ Creates `latest.json` with correct signatures
- ✅ Marked as "Pre-release" in GitHub UI
- ⚠️ **BUT**: `/releases/latest/` still points to it (GitHub includes pre-releases in "latest")

This is why the RC testing flow works — users on stable versions will detect the RC as "latest" until you push the final production tag.

## Complete Uninstall After Testing

### macOS

```bash
# Remove the app
rm -rf /Applications/subtrkr.app

# Remove app data
rm -rf ~/Library/Application\ Support/com.tylerpburnett.subtrkr

# Remove cache
rm -rf ~/Library/Caches/com.tylerpburnett.subtrkr

# Remove preferences
rm -f ~/Library/Preferences/com.tylerpburnett.subtrkr.plist

# Remove WebKit data
rm -rf ~/Library/WebKit/com.tylerpburnett.subtrkr

# Remove any downloaded DMGs
rm -f ~/Downloads/subtrkr*.dmg
```

### Windows

1. **Uninstall via Settings:**
   - Settings → Apps → subtrkr → Uninstall

2. **Remove app data:**
   ```powershell
   rmdir /s /q %APPDATA%\com.tylerpburnett.subtrkr
   rmdir /s /q %LOCALAPPDATA%\com.tylerpburnett.subtrkr
   ```

### Linux

```bash
# Remove the AppImage
rm -f ~/.local/share/applications/subtrkr.desktop
rm -f ~/Downloads/subtrkr*.AppImage

# Remove app data
rm -rf ~/.config/com.tylerpburnett.subtrkr
rm -rf ~/.local/share/com.tylerpburnett.subtrkr
```

## Testing Checklist

Use this checklist for each release:

### Pre-Flight
- [ ] Latest stable version installed (e.g., v1.0.10)
- [ ] Version bumped in 3 files (package.json, tauri.conf.json, Cargo.toml)
- [ ] `bun install --frozen-lockfile` succeeds
- [ ] `bunx tsc --noEmit` succeeds

### RC Testing
- [ ] Push v1.0.11-rc.1 tag
- [ ] CI completes successfully (all 4 platforms)
- [ ] `latest.json` endpoint resolves with rc.1 version
- [ ] Stable version detects rc.1 update
- [ ] Download completes without errors
- [ ] Installation succeeds
- [ ] App relaunches on rc.1
- [ ] Push v1.0.11-rc.2 tag
- [ ] RC.1 detects rc.2 update
- [ ] Update chain works (rc.1 → rc.2)

### Fresh Install Test
- [ ] Complete uninstall performed
- [ ] Fresh install of rc.2 from GitHub
- [ ] App launches without errors
- [ ] Login/signup works
- [ ] Core features functional (items, notifications, analytics)

### Production Release
- [ ] All RC tests passed
- [ ] Known issues documented (if any)
- [ ] Push v1.0.11 tag (no "-rc" suffix)
- [ ] CI completes successfully
- [ ] `latest.json` points to v1.0.11
- [ ] Verify stable download URLs return 200:
  - [ ] macOS: `/releases/latest/download/subtrkr-darwin-aarch64.dmg`
  - [ ] Windows: `/releases/latest/download/subtrkr-windows-x64_setup.exe`
  - [ ] Linux: `/releases/latest/download/subtrkr-linux-amd64.AppImage`

## Troubleshooting

### "No published app updates are available yet"

**Cause:** `latest.json` doesn't exist or is unreachable.

**Fix:**
```bash
# Verify endpoint exists:
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | python3 -m json.tool

# If 404, check CI logs:
gh run list --workflow Release --limit 1
gh run view <run-id> --log-failed
```

### macOS says "subtrkr is damaged and can't be opened"

**Cause:** Invalid app bundle signature.

**Workaround for testing:**
```bash
xattr -cr ~/Downloads/subtrkr-darwin-aarch64.dmg
```

**Permanent fix:** Add Apple Developer ID signing (requires Apple Developer Program membership).

### Update downloads but installation fails

**Possible causes:**
- Disk space full
- Permissions issue
- App is running from read-only location

**Debug:**
1. Check Console.app (macOS) / Event Viewer (Windows) for errors
2. Verify app has write permissions to its installation directory
3. Try manual install from GitHub Releases

### "Signature verification failed"

**Cause:** Mismatch between `TAURI_SIGNING_PRIVATE_KEY` in CI and `pubkey` in `tauri.conf.json`.

**Fix:**
```bash
# Verify pubkey in tauri.conf.json matches the key used in CI
# If keys were rotated, you need to ship a new version with the new pubkey
```

## Post-Release Verification

After pushing production:

```bash
# 1. Verify workflow success
gh run list --workflow Release --limit 1

# 2. Verify release assets
gh release view v1.0.11 --json assets --jq '.assets[].name'

# 3. Verify updater metadata
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | python3 -m json.tool | head -10

# 4. Verify version in latest.json matches tag
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | grep -o '"version": "[^"]*"'
```

## Related Documentation

- [Production Release Workflow](PRODUCTION_RELEASE_WORKFLOW.md) — Full release process
- [Release Captain Checklist](RELEASE_CAPTAIN_CHECKLIST.md) — Per-release execution checklist
- [Tauri Updater Docs](https://v2.tauri.app/plugin/updater/) — Official Tauri documentation
