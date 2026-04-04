# Session Summary: Bespoke Empty States
**Date:** March 29, 2026

## Overview

Replaced all plain-text empty states in Dashboard, ItemList, and Analytics with premium ghost previews that teach users what populated views look like. Ghost previews use a hybrid pattern: faded placeholder cards for list-type views, CSS/SVG chart silhouettes for chart-type views.

---

## Components Created

### `GhostListPreview` (`src/components/ui/GhostListPreview.tsx`)
Renders shimmer-animated placeholder rows mimicking real item layouts.

**Variants:**
- `item-card` — subscription/bill grid card (logo circle, name bar, price bar, status pill)
- `item-row` — subscription/bill table row (checkbox, logo, columns)
- `payment-row` — upcoming payment row (logo, name, days-until badge)
- `ranked-row` — ranked item (#1 badge, logo, name, amount)
- `cancelled-row` — cancelled item with strikethrough styling

### `GhostChartPreview` (`src/components/ui/GhostChartPreview.tsx`)
Renders CSS/SVG-only chart skeletons. No Recharts dependency.

**Variants:**
- `area-chart` — SVG with smooth bezier path, gradient fill, dashed grid lines, dots
- `bar-chart` — horizontal rounded bars with decreasing widths
- `pie-chart` — conic-gradient donut with center cutout + ghost legend rows

---

## Components Modified

### `EmptyState` (`src/components/ui/EmptyState.tsx`)
Added two new optional props:
- `preview: React.ReactNode` — ghost content rendered below title/description in an accessible container (`aria-hidden`, `role="presentation"`, `pointer-events: none`)
- `compact: boolean` — smaller layout (40x40 icon, `text-base` title, `py-6` padding) for card-level empty states

When neither prop is provided, the component behaves identically to before.

---

## Integration Points

### Dashboard (`src/components/Dashboard.tsx`)
- **First-run gate:** When `items.length === 0`, only the welcome EmptyState renders. Stat cards, Upcoming Payments, and Spending by Category are hidden entirely.
- **Upcoming Payments:** compact EmptyState + `GhostListPreview variant="payment-row"`
- **Spending by Category:** compact EmptyState + `GhostChartPreview variant="pie-chart"`

### ItemList (`src/components/ItemList.tsx`)
- Ghost preview adapts to the user's persisted view mode: `item-card` in grid mode, `item-row` in list mode

### Analytics (`src/components/Analytics.tsx`)
- **Monthly Spending Trend:** compact EmptyState + `GhostChartPreview variant="area-chart"`
- **Spending by Category:** compact EmptyState + `GhostChartPreview variant="bar-chart"`
- **Most Expensive:** compact EmptyState + `GhostListPreview variant="ranked-row"`
- **Cancellation History:** compact EmptyState + `GhostListPreview variant="cancelled-row"`

---

## CSS (`src/index.css`)

- `@keyframes ghost-shimmer` — slow left-to-right gradient sweep (3s, infinite)
- `.ghost-shimmer-bar` — utility class combining shimmer animation with `color-mix()` gradient
- `.empty-state-enter` — entry animation using existing `zoomIn95` keyframes
- `@media (prefers-reduced-motion: reduce)` — disables all shimmer and entry animations

---

## Design Decisions

- **`color-mix(in srgb, ...)`** used throughout for fractional opacity on hex design tokens — no rgba conversion needed
- **Ghost charts are static** (no shimmer) — the shape communicates, letting them feel more like illustrations than loading indicators
- **Ghost lists shimmer subtly** — 3s cycle, gentle gradient, not aggressive skeleton-loader style
- **No new design tokens** — all ghost elements use existing `--bg-hover`, `--border-default`, `--text-muted`, `--brand-primary`

## Out of Scope

Empty states in CategorySettings, StatusHistoryDialog, and NotificationSettings were intentionally excluded — these are secondary settings surfaces where ghost previews add less value. Can be upgraded in a follow-up.

## Files Changed

| File | Action |
|------|--------|
| `src/index.css` | Modified — shimmer keyframes + reduced-motion |
| `src/components/ui/EmptyState.tsx` | Modified — preview + compact props |
| `src/components/ui/GhostListPreview.tsx` | Created |
| `src/components/ui/GhostChartPreview.tsx` | Created |
| `src/components/ItemList.tsx` | Modified — ghost preview integration |
| `src/components/Dashboard.tsx` | Modified — first-run gate + ghost previews |
| `src/components/Analytics.tsx` | Modified — 4 ghost preview integrations |
