# Theme Extension Summary

Quick reference for adding new themes (Monokai, Gruvbox, etc.) to SubTrkr.

## Current Theme Architecture

- Theme IDs live in `/Users/tyler/Development/SubTrkr/src/theme.ts`.
- Active theme is stored in localStorage key `subtrkr-theme`.
- `/Users/tyler/Development/SubTrkr/src/App.tsx` applies:
  - `document.documentElement.setAttribute('data-theme', theme)`
  - `document.documentElement.classList.toggle('dark', themeTone === 'dark')`
- All visual styles should read semantic CSS variables from `/Users/tyler/Development/SubTrkr/src/index.css`.

## Add A New Theme (Checklist)

1. Add the theme option in `/Users/tyler/Development/SubTrkr/src/theme.ts`.

```ts
export const THEME_OPTIONS = [
  { id: 'dark', label: 'Dark', tone: 'dark' },
  { id: 'light', label: 'Light', tone: 'light' },
  { id: 'monokai', label: 'Monokai', tone: 'dark' }, // add new theme here
] as const;
```

2. Add a CSS token block in `/Users/tyler/Development/SubTrkr/src/index.css`.

```css
[data-theme="monokai"] {
  /* Backgrounds */
  --bg-base: #272822;
  --bg-surface: #2d2e27;
  --bg-card: #3a3b34;
  --bg-input: #3a3b34;
  --bg-hover: #3f4038;
  --bg-active: #494a43;
  --bg-default: #2b2c25;

  /* Text */
  --text-primary: #f8f8f2;
  --text-secondary: #c2c2b8;
  --text-muted: #8f908a;
  --text-inverse: #1f201b;

  /* Borders */
  --border-default: #4b4c43;
  --border-muted: #3e3f37;
  --border-strong: #606157;

  /* Brand + accents + shadows + shell + focus + bridge tokens */
  /* Copy the full token contract from an existing theme block and replace values. */
}
```

3. Keep the full token contract complete.
Do not remove variables from a theme block. Safest approach: copy the existing dark block and only change values.

## Token Groups You Must Cover

- Core surfaces/text/borders:
  - `--bg-*`, `--text-*`, `--border-*`
- Brand and accents:
  - `--brand-*`, `--accent-*`
- Shadows and card depth:
  - `--shadow-*`, `--card-*`
- App shell:
  - `--shell-*`, `--sidebar-ambient`, `--main-panel-*`
- Focus:
  - `--ring-offset`
- Segmented controls (new):
  - `--segmented-*`
- Settings tab navigation (new):
  - `--settings-*`
- shadcn bridge variables:
  - `--background`, `--foreground`, `--primary`, `--border`, etc.

## Tone Rules

- `tone: 'dark'` means the app adds `.dark` on `<html>`.
- `tone: 'light'` means `.dark` is removed.
- Use dark tone for themes like Monokai/Gruvbox dark.

## Validation Before Commit

Run:

```bash
bunx tsc --noEmit
bun run build
```

Manual checks:

- Toggle into the new theme and verify sidebar, cards, inputs, dropdowns, charts, segmented tabs, and settings tabs.
- Confirm contrast in both active and inactive states.
- Confirm focus ring visibility.

## Notes

- The current theme toggle cycles through `THEME_OPTIONS` automatically.
- As you add more themes, consider replacing the cycle button with an explicit theme picker in Settings for faster selection.
