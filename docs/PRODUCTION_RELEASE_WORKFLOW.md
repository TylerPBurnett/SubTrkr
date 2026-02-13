# SubTrkr Production Release Workflow

This runbook documents the production release process for SubTrkr and matches the current implementation in this repository.

## Scope

- Build and publish desktop installers from GitHub Releases.
- Publish signed updater artifacts (`.sig` + `latest.json`) for in-app updates.
- Continue normal feature development between releases.

## Implementation Map (Current)

- Release workflow: `.github/workflows/release.yml`
  - Trigger: push tag `v*`
  - Matrix: macOS arm64, macOS x64, Ubuntu, Windows
  - Action: `tauri-apps/tauri-action@v0.6.1`
- Updater configuration: `src-tauri/tauri.conf.json`
  - `bundle.createUpdaterArtifacts: true`
  - `plugins.updater.endpoints` points to GitHub `latest.json`
  - `plugins.updater.pubkey` is the updater verification key shipped to clients
- Runtime updater behavior:
  - `src/services/updater.ts` (auto-check on launch, throttled to every 12h)
  - `src/components/AccountSettings.tsx` (manual "Check for updates")
- Tauri permissions and plugin wiring:
  - `src-tauri/src/lib.rs` (updater/process plugins registered)
  - `src-tauri/capabilities/default.json` (`updater:default` and `process:default`)

## Standards This Workflow Follows

- Semantic Versioning (`MAJOR.MINOR.PATCH`).
- Signed update artifacts (required by Tauri updater).
- Immutable release tags (do not overwrite existing tags/releases).
- Multi-platform artifact publication.
- Secret-based CI signing (no private keys in repository).

## One-Time Setup

### 1. Create a password-protected updater keypair

Use a long random password and store it safely before generating keys.

```bash
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(openssl rand -base64 32)"
bun tauri signer generate --password "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" -w ~/.tauri/subtrkr-prod.key
```

Outputs:

- Private key: `~/.tauri/subtrkr-prod.key` (secret)
- Public key: `~/.tauri/subtrkr-prod.key.pub` (safe to publish)

### 2. Back up key material

Treat updater signing material as long-lived production root credentials.

- Store private key in a secure vault.
- Store password in a secure secret manager.
- Keep at least one recovery backup outside a single laptop.

### 3. Configure GitHub Actions secrets

```bash
gh secret set TAURI_SIGNING_PRIVATE_KEY < ~/.tauri/subtrkr-prod.key
printf '%s' "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" | gh secret set TAURI_SIGNING_PRIVATE_KEY_PASSWORD
gh secret set VITE_SUPABASE_URL --body 'https://your-project.supabase.co'
gh secret set VITE_SUPABASE_ANON_KEY --body 'your-anon-key'
```

Notes:

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are required at build time for Vite/Tauri release builds.
- The anon key is intended to be public in client apps, but storing it in GitHub secrets keeps CI configuration centralized.

### 4. Update Tauri updater public key

Copy `~/.tauri/subtrkr-prod.key.pub` into:

- `src-tauri/tauri.conf.json` -> `plugins.updater.pubkey`

Important: The CI private key and app `pubkey` must always be a matching pair.

### 5. Platform trust signing (recommended for production UX)

Updater signatures secure update integrity, but OS trust prompts are separate.

- macOS: release CI uses ad-hoc app signing (`APPLE_SIGNING_IDENTITY: "-"`) to avoid broken/damaged bundle signatures.
- macOS: configure Apple Developer ID code signing + notarization for best install UX.
- Windows: configure Authenticode signing certificate.

Without Developer ID / Authenticode trust signing, installs still work but user trust prompts are stronger.

## Release Process (Stable)

### 1. Preflight checklist

- Confirm `main` is clean and up to date.
- Bump version in:
  - `package.json`
  - `src-tauri/tauri.conf.json`
  - `src-tauri/Cargo.toml`
- Validate locally:

```bash
bun install --frozen-lockfile
bunx tsc --noEmit
```

- Optional but recommended before major/minor releases:

```bash
bun tauri build
```

### 2. Commit and push

```bash
git add .
git commit -m "chore(release): bump to vX.Y.Z"
git push origin main
```

### 3. Tag and trigger release

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 4. CI publishes release artifacts

GitHub Actions runs `.github/workflows/release.yml` and uploads assets to GitHub Releases.

## Workflow Version Caveat (Important)

This repository is currently pinned to:

- `tauri-apps/tauri-action@v0.6.1`

For this action version, the updater JSON input is:

- `includeUpdaterJson: true`

This workflow also sets:

- `assetNamePattern: '[name]-[platform]-[arch][_setup][ext]'`

This keeps user-facing download URLs stable across releases.

If you upgrade to a newer action release, verify input names because some versions use:

- `uploadUpdaterJson`

Do not change action version and input names independently.

## Landing Page Download Links

Why there are many assets in GitHub Releases:

- Installers for multiple operating systems and CPU architectures
- Updater bundles/signatures (`.sig`, `.app.tar.gz`, etc.)
- `latest.json` used by the in-app updater

For end users, link installers only (not `.sig`, `.app.tar.gz`, or `latest.json`).

Recommended buttons:

- Windows: `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-windows-x64_setup.exe`
- macOS (Apple Silicon): `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-darwin-aarch64.dmg`
- macOS (Intel): `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-darwin-x64.dmg`
- Linux (AppImage): `https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/subtrkr-linux-amd64.AppImage`

If you want a single fallback button:

- `https://github.com/TylerPBurnett/SubTrkr/releases/latest`

Note: these stable direct-link filenames take effect on releases created after the `assetNamePattern` workflow change.

## Post-Release Verification

For per-release execution tracking, use: `docs/RELEASE_CAPTAIN_CHECKLIST.md`

### 1. Confirm workflow success

```bash
gh run list --workflow Release --limit 5
```

All matrix jobs must be `completed/success`.

### 2. Confirm release assets

```bash
gh release view vX.Y.Z --json assets,url
```

Expected at minimum:

- `latest.json`
- platform installers/bundles
- `.sig` files for updater artifacts

### 3. Confirm updater metadata endpoint

```bash
curl -fsSL https://github.com/TylerPBurnett/SubTrkr/releases/latest/download/latest.json | jq .
```

Verify:

- version matches released tag
- signatures/URLs are populated

### 4. Smoke-test update path

- Install an older SubTrkr desktop build.
- Launch app and run "Check for updates".
- Confirm download, install, and relaunch succeed.

## Development Workflow Between Releases

1. Build features on short-lived branches.
2. Open PRs to `main`.
3. Merge after review/testing.
4. Cut release tags only when ready (`vX.Y.Z`).

## Incident Response and Rollback

### CI failed before assets were published

- Fix root cause on `main`.
- Bump patch version.
- Create a new tag (for example `v1.0.8`).

Do not reuse old tags.

### Release published but has a defect

- Ship a new patch release quickly (`vX.Y.(Z+1)`).
- Keep the bad release for auditability; do not rewrite release history.

### Updater key compromise or loss

- Existing installed clients trust the old public key.
- Rotating keys means older installs cannot verify updates signed by the new key.
- If compromise/loss occurs after users are in production, treat as high-severity incident and plan migration/communication explicitly.

## Troubleshooting

### "No published app updates are available yet."

- Expected before first successful release with updater artifacts.
- Confirm `latest.json` exists on the latest release.

### "failed to decode secret key" / "incorrect updater private key password"

- Ensure `TAURI_SIGNING_PRIVATE_KEY` is valid key content.
- Ensure `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` exactly matches that key.
- Validate key/password locally with:

```bash
tmp=$(mktemp); echo "test" > "$tmp"
bun tauri signer sign -k "$(cat ~/.tauri/subtrkr-prod.key)" -p "$TAURI_SIGNING_PRIVATE_KEY_PASSWORD" "$tmp"
rm -f "$tmp" "$tmp.sig"
```

### "Missing Supabase environment variables" at runtime

- Ensure these are set in GitHub Actions secrets and injected by `.github/workflows/release.yml`:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
- Ensure values are valid for your production Supabase project.

### Signature or pubkey verification errors in-app

- Ensure `src-tauri/tauri.conf.json` `plugins.updater.pubkey` matches the CI signing private key.
- If key was rotated, release clients built with the new pubkey before expecting updates signed by that key.

### macOS says "<app> is damaged and can't be opened"

- Root cause is usually an invalid app bundle signature (missing/invalid `Contents/_CodeSignature/CodeResources`).
- Ensure release workflow sets `APPLE_SIGNING_IDENTITY: "-"` (ad-hoc signing) for macOS jobs at minimum.
- Validate a built app bundle before shipping:

```bash
codesign --verify --deep --strict --verbose=2 /path/to/subtrkr.app
```

- For production-grade UX, add Apple Developer ID signing + notarization; ad-hoc signing prevents broken bundles but is not trusted notarization.

### Workflow builds but no `latest.json`

- Ensure `bundle.createUpdaterArtifacts` is `true` in `src-tauri/tauri.conf.json`.
- Ensure action input for current action version is correct (`includeUpdaterJson` for `v0.6.1`).

## Operational Ownership Checklist

- At least 2 maintainers can access release workflow and secrets.
- Key/password backups verified.
- Release health checks documented per release.
- Emergency hotfix path tested at least once.
