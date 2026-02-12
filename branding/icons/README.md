# SubTrkr Icon Sources

These files are the source-of-truth theme variants for SubTrkr app icons.

## Source files

- `sources/subtrkr-dark.png` (current production theme)
- `sources/subtrkr-default.png`
- `sources/subtrkr-clear-dark.png`
- `sources/subtrkr-clear-light.png`
- `sources/subtrkr-tinted-template-dark.png` (template mask for macOS tinted dark)
- `sources/subtrkr-tinted-template-light.png` (template mask for macOS tinted light)
- `sources/subtrkr-tinted-dark.png` (optional full-color theme source)
- `sources/subtrkr-tinted-light.png` (optional full-color theme source)

## Generate app icons

From repository root:

```bash
bun run icons:generate
```

Or choose a specific theme:

```bash
bash ./scripts/generate-icons.sh tinted-dark
```

Optional optical sizing override:

```bash
ICON_CONTENT_SCALE=94 bun run icons:generate
```

Generated files are written to `src-tauri/icons/`.

## macOS appearance variants

The generator also emits macOS-specific icon variants used for runtime appearance sync:

- `icon-light.icns`
- `icon-dark.icns`
- `icon-clear-light.icns`
- `icon-clear-dark.icns`
- `icon-tinted-light.icns`
- `icon-tinted-dark.icns`
- `icon-tinted-template-light.png`
- `icon-tinted-template-dark.png`
