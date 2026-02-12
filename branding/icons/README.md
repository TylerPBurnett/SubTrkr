# SubTrkr Icon Sources

These files are the source-of-truth theme variants for SubTrkr app icons.

## Source files

- `sources/subtrkr-dark.png` (current production theme)
- `sources/subtrkr-default.png`
- `sources/subtrkr-clear-dark.png`
- `sources/subtrkr-clear-light.png`
- `sources/subtrkr-tinted-dark.png`
- `sources/subtrkr-tinted-light.png`

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
