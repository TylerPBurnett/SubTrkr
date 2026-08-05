---
paths:
  - "src/index.css"
  - "src/components/**"
---

# Theming & Design Token Rules

## 3-Tier Background Hierarchy

`bg-base` -> `bg-surface` (main panel) -> `bg-card` (cards). Each must differ by >=10 RGB units or cards dissolve into the background.

- Light: `--bg-surface: #edeef2`, `--bg-card: #ffffff` (~15 unit gap)
- Dark: `--bg-surface: #131415`, `--bg-card: #1e2022` (~12 unit gap)

## Card Borders

Use `--border-default` (NOT `--border-muted`) for visible card edges.

## Form Styling (ItemForm)

Both bill AND subscription forms use brand green — no type-specific orange.
Gradient: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`

## Theme System

- CSS custom properties defined in `src/index.css`
- `useAppTheme` sets **both** `data-theme="light" | "dark"` and a `.dark` class on `documentElement`; `index.css` selects on `[data-theme="dark"], .dark`, so either alone is enough
- Use `var(--text-primary)`, `var(--bg-hover)`, etc.
- Full token reference: `docs/reference/THEMING.md`
