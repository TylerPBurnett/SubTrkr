# Release Captain Checklist

Use this checklist for each release tag (`vX.Y.Z`).

## Release Info

- Version:
- Release date:
- Release captain:
- Commit SHA:
- Git tag:

## Preflight

- [ ] `main` is clean and synced with `origin/main`
- [ ] Version updated in:
  - [ ] `package.json`
  - [ ] `src-tauri/tauri.conf.json`
  - [ ] `src-tauri/Cargo.toml`
- [ ] `bun install --frozen-lockfile` succeeds
- [ ] `bunx tsc --noEmit` succeeds
- [ ] Optional local build completed (`bun tauri build`)

## Tag + Trigger

- [ ] Commit pushed to `main`
- [ ] Tag created: `git tag vX.Y.Z`
- [ ] Tag pushed: `git push origin vX.Y.Z`
- [ ] Release workflow started in GitHub Actions

## CI Verification

- [ ] macOS arm64 job passed
- [ ] macOS x64 job passed
- [ ] Ubuntu job passed
- [ ] Windows job passed
- [ ] Workflow completed with `success`

## Artifact Verification

- [ ] GitHub Release exists for `vX.Y.Z`
- [ ] `latest.json` present
- [ ] Updater `.sig` files present
- [ ] macOS artifacts present
- [ ] Windows artifacts present
- [ ] Linux artifacts present
- [ ] Landing-page direct links (stable `releases/latest/download/...`) return 200

## Updater Verification

- [ ] `latest.json` endpoint resolves
- [ ] `latest.json` version matches `vX.Y.Z`
- [ ] URLs/signatures are populated in `latest.json`
- [ ] Manual in-app update check tested from prior version

## Sign-Off

- [ ] Release notes reviewed
- [ ] Any known issues documented
- [ ] Team notified of release
- [ ] Follow-up tasks created (if needed)

## Incident Notes (if applicable)

- What failed:
- User impact:
- Mitigation:
- Permanent fix:
