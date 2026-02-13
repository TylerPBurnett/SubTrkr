# SubTrkr Production Release Workflow

This runbook documents the production workflow for shipping SubTrkr to end users while continuing active development.

## Goals

- Publish installable desktop builds from GitHub Releases.
- Enable in-app update checks and signed update installation.
- Keep day-to-day feature development simple.

## Current Setup in This Repo

- Tauri updater plugin is configured in `src-tauri/tauri.conf.json`.
- Updater and process plugins are registered in `src-tauri/src/lib.rs`.
- Release workflow is defined in `.github/workflows/release.yml`.
- App includes:
  - automatic update checks after login (desktop builds, throttled)
  - manual **Check for updates** action in Settings -> Account

## One-Time Setup Checklist

1. Create updater signing keys (already done locally for this machine):

```bash
bun tauri signer generate --ci -w ~/.tauri/subtrkr.key
```

2. Add GitHub repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`:
  - Recommended: paste the private key file contents from `~/.tauri/subtrkr.key`
  - Alternative: set to an absolute path on self-hosted runners
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`:
  - Optional if your private key has a password

3. Optional (recommended for public trust):

- macOS code signing + notarization credentials
- Windows code signing certificate

Without platform signing, builds can still be distributed, but install trust/friction will be worse.

## Release Process (Stable)

1. Ensure versions are updated:
   - `package.json`
   - `src-tauri/tauri.conf.json`
   - `src-tauri/Cargo.toml`
2. Commit and push changes to `main`.
3. Tag and push release:

```bash
git tag v1.0.0
git push origin main --tags
```

4. GitHub Actions runs `.github/workflows/release.yml` and publishes artifacts to the release.
5. Verify the release contains:
   - installer/bundle files per target platform
   - updater signatures (`.sig`)
   - `latest.json`

## Development Workflow Between Releases

1. Build features on short-lived branches.
2. Open PRs to `main`.
3. Merge after review/testing.
4. Repeat until next release tag.
5. Release by tag (`vX.Y.Z`) when ready.

## Versioning Rules (SemVer)

- `MAJOR` (`2.0.0`): breaking changes or migration-required changes.
- `MINOR` (`1.1.0`): backward-compatible features.
- `PATCH` (`1.0.1`): backward-compatible bug fixes.

## Landing Page Download Strategy

- Primary CTA: latest release page  
  `https://github.com/TylerPBurnett/SubTrkr/releases/latest`
- Optional OS-specific direct links once asset naming is finalized.

## How In-App Updates Work

1. App checks `latest.json` from:
   - `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json`
2. If a new version exists, user can approve install.
3. Update is downloaded, verified via updater signature, installed, and relaunched.

## Troubleshooting

### "No published app updates are available yet."

- Expected before first GitHub release with updater artifacts.

### Update check fails with signature/pubkey errors

- Ensure:
  - `plugins.updater.pubkey` matches the private key used in CI
  - CI secret `TAURI_SIGNING_PRIVATE_KEY` contains the matching private key

### Workflow builds but no `latest.json`

- Ensure `bundle.createUpdaterArtifacts` is true in `src-tauri/tauri.conf.json`.
- Ensure `uploadUpdaterJson: true` in `.github/workflows/release.yml`.

