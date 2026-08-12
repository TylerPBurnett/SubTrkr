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

## Brand Green Never Carries Text

`--brand-primary` (#22c55e) is a fill/border/chart colour. As text on a light
surface it measures 2.28:1 — below the 4.5:1 text floor and below the 3:1
non-text floor for icons. Two tokens cover legibility:

- `--brand-text` — green on a neutral background (links, labels, icons).
  #166534 light / #4ade80 dark. Clears 4.5:1 on every background in the
  palette. `#15803d` is **not** enough (4.33:1 on `--bg-surface`).
- `--brand-on-primary` — ink sitting on a `--brand-primary` fill (`.btn-primary`
  labels, today's date pill). #171717 in **both** themes; 7.87:1 at rest.

Do not use `--text-inverse` on a green fill — it resolves to white in light and
fails at 2.28:1. The wordmark in `App.tsx` keeps raw `--brand-primary` (WCAG
exempts logotypes).

Same split as red: the saturated token fills, a darker sibling carries words.

## Form Styling (ItemForm)

Both bill AND subscription forms use brand green — no type-specific orange.
Gradient: `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`

## Theme System

- CSS custom properties defined in `src/index.css`
- `useAppTheme` sets **both** `data-theme="light" | "dark"` and a `.dark` class on `documentElement`; `index.css` selects on `[data-theme="dark"], .dark`, so either alone is enough
- Use `var(--text-primary)`, `var(--bg-hover)`, etc.
- Full token reference: `docs/reference/THEMING.md`
