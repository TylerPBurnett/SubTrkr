# Icon Setup Documentation

## Current Strategy

SubTrkr now uses a deterministic icon pipeline with one source theme generating all platform outputs.

- Canonical production theme: `dark`
- Source files: `branding/icons/sources/`
- Generator script: `scripts/generate-icons.sh`
- Output directory: `src-tauri/icons/`

## Generate Icons

From repo root:

```bash
bun run icons:generate
```

Generate a different theme variant:

```bash
bash ./scripts/generate-icons.sh clear-dark
```

Adjust icon optical scale (default `84`) if Dock/taskbar sizing needs tuning:

```bash
ICON_CONTENT_SCALE=94 bun run icons:generate
```

## Platform Configuration

Tauri config is split by platform:

- Base: `src-tauri/tauri.conf.json` (shared settings)
- macOS: `src-tauri/tauri.macos.conf.json` (`icon.icns`)
- Windows: `src-tauri/tauri.windows.conf.json` (`icon.ico` + NSIS `installerIcon`)

This keeps macOS and Windows icon behavior explicit and prevents cross-platform drift.

## Generated Outputs

The generator updates all required desktop assets, including:

- `icon.icns`
- `icon.ico`
- `icon.png`
- `32x32.png`
- `64x64.png`
- `128x128.png`
- `128x128@2x.png`
- `icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-256.png`
- `Square*Logo.png`, `StoreLogo.png` (Windows bundle assets)

If local debug/release bundles already exist, the generator also syncs their `icon.icns` so `tauri dev` and packaged builds do not drift.

## QA Checklist

1. Build macOS package: `bun tauri build`
2. Verify macOS icon in Finder, Dock, Cmd+Tab, and DMG
3. Build Windows package and verify EXE/taskbar/Start icon
4. Verify installer icon for NSIS
5. Check at 100%, 125%, 150%, and 200% display scaling on Windows
