# Bespoke Empty States

Upgrade empty states in the three main data views (Dashboard, ItemList, Analytics) from plain text to premium, informational ghost previews that teach users what filled views look like.

## Scope

**In scope:** All empty states in Dashboard, ItemList (subscriptions/bills), and Analytics — the three views where empty states face every user and where ghost previews add clear value.

**Out of scope:** Empty states in CategorySettings, StatusHistoryDialog, NotificationSettings, and other settings/modal surfaces. These are secondary UI that shows form controls regardless, making ghost previews less impactful. They can be upgraded in a follow-up pass.

## Approach

**Hybrid pattern:** Ghost card previews for list-type empty states, illustrated chart silhouettes for chart-type empty states. Each empty state doubles as onboarding — showing a faded preview of the populated view.

## Component Architecture

### Redesigned `EmptyState` (src/components/ui/EmptyState.tsx)

Add an optional `preview` prop (React node) to the existing component. When provided, the preview renders below the title/description as a ghost element. When absent, the component behaves as it does today.

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  preview?: React.ReactNode;  // NEW
}
```

The preview renders inside a container with `pointer-events: none`. The container does NOT apply its own opacity — each ghost component (GhostListPreview, GhostChartPreview) manages opacity internally so chart fills and list rows can use different opacity levels without compounding. Title + description sit above the preview, centered.

Layout change: shift from the current icon-heavy layout (96x96 green gradient box) to a more compact header (48x48 icon, smaller title) when a preview is present, so the ghost preview gets visual priority. When no preview is provided, keep the existing large icon layout.

### New: `GhostListPreview` (src/components/ui/GhostListPreview.tsx)

Renders 2-3 fake list rows mimicking the real item layout.

```tsx
interface GhostListPreviewProps {
  variant: 'item-card' | 'item-row' | 'payment-row' | 'ranked-row' | 'cancelled-row';
  count?: number; // default 2
}
```

**Variants:**
- `item-card`: Mimics a subscription/bill grid card (logo circle, name bar, price bar, status pill). Used in ItemList (grid mode) and Dashboard welcome.
- `item-row`: Mimics a subscription/bill table row (checkbox, logo, name, renews, amount columns). Used in ItemList (list mode). Matches the table header layout from ItemList's list view.
- `payment-row`: Mimics an upcoming payment row (logo, name, cycle text, days-until badge). Used in Dashboard Upcoming Payments.
- `ranked-row`: Mimics a ranked item (#1 badge, logo, name, amount). Used in Analytics Most Expensive.
- `cancelled-row`: Mimics a cancelled item row with strikethrough styling. Used in Analytics Cancellation History.

**Visual treatment:**
- Background: `color-mix(in srgb, var(--bg-hover) 15%, transparent)` (tokens are hex, so use `color-mix` for opacity)
- Border: `1px dashed color-mix(in srgb, var(--border-default) 50%, transparent)`
- Rounded corners: `rounded-xl` (matching real cards)
- Content placeholders: rounded rectangles using `color-mix(in srgb, var(--text-muted) 12%, transparent)`
  - Logo: 40x40 circle
  - Name: 80-120px wide bar, 12px tall
  - Price: 60px wide bar, 10px tall
  - Status pill: 48px wide, 6px tall
- Shimmer animation: slow left-to-right gradient sweep (3s loop, `ease-in-out`). CSS `@keyframes` using a `linear-gradient` background that translates across. Subtle, not skeleton-loader aggressive.

### New: `GhostChartPreview` (src/components/ui/GhostChartPreview.tsx)

Renders a CSS/SVG-only chart skeleton. No Recharts dependency.

```tsx
interface GhostChartPreviewProps {
  variant: 'area-chart' | 'bar-chart' | 'pie-chart';
}
```

**Variants:**
- `area-chart`: SVG with a smooth cubic bezier path. `fill: var(--brand-primary)` at 8% opacity, `stroke` at 15% opacity. Simulates the monthly spending trend. Fixed viewBox, responsive width.
- `bar-chart`: 3-4 horizontal rounded rectangles with decreasing widths. Uses `var(--brand-primary)` at varying opacities (8-15%). Simulates category breakdown.
- `pie-chart`: CSS `conic-gradient` with 3 segments in brand green at varying opacities (8%, 12%, 16%). `border-radius: 50%` with a center cutout (pseudo-element) to create a donut. Accompanied by 3 ghost legend rows to the right (small colored circle + name bar + amount bar) to match the real pie chart's layout which shows a donut + legend side by side. Simulates spending by category.

**Visual treatment:**
- No shimmer — charts stay static, letting shape communicate
- Container height matches the real chart container (`h-64` for Analytics charts, proportional for Dashboard)
- Brand green only, no multi-color (the ghosts are monochrome hints)

## Empty State Inventory

### List-type (ghost card pattern)

| # | Location | Component | Ghost variant | Count | Title | Description | CTA |
|---|----------|-----------|---------------|-------|-------|-------------|-----|
| 1 | ItemList (no subscriptions) | EmptyState | `item-card` or `item-row` | 2 | "No subscriptions yet" | "Start tracking your recurring payments by adding your first subscription." | "Add Subscription" |
| 2 | ItemList (no bills) | EmptyState | `item-card` or `item-row` | 2 | "No bills yet" | "Start tracking your recurring payments by adding your first bill." | "Add Bill" |
| 3 | ItemList (no search results) | EmptyState | (none) | — | "No matches found" | "Try adjusting your search or filter criteria." | (none) |
| 4 | Dashboard welcome | EmptyState | `item-card` | 3 | "Welcome to SubTrkr" | "Start tracking your subscriptions and bills to see spending insights, upcoming payments, and more." | "Add Your First Item" |
| 5 | Dashboard: Upcoming Payments | EmptyState (compact) | `payment-row` | 2 | "No upcoming payments" | "Payments due in the next 7 days will appear here." | (none) |
| 6 | Analytics: Most Expensive | EmptyState (compact) | `ranked-row` | 2 | "No active items" | "Your top spending items will be ranked here." | (none) |
| 7 | Analytics: Cancellation History | EmptyState (compact) | `cancelled-row` | 1 | "No cancellations yet" | "Cancelled items and savings will be tracked here." | (none) |

### Chart-type (illustrated preview)

| # | Location | Component | Ghost variant | Title | Description | CTA |
|---|----------|-----------|---------------|-------|-------------|-----|
| 8 | Dashboard: Spending by Category | EmptyState (compact) | `pie-chart` | "No spending data yet" | "Category breakdown will appear once you add items." | (none) |
| 9 | Analytics: Monthly Trend | EmptyState (compact) | `area-chart` | "No spending data yet" | "Your monthly spending trend will appear here." | (none) |
| 10 | Analytics: Category Breakdown | EmptyState (compact) | `bar-chart` | "No category data yet" | "Spending by category will be charted here." | (none) |

## First-Run Dashboard Behavior

When `items.length === 0`, the Dashboard currently renders the welcome EmptyState card alongside zeroed stat cards and empty sub-sections — a cluttered first impression. The new behavior:

**When `items.length === 0`:** Show ONLY the welcome EmptyState (full layout, #4) centered in the page body. Hide the stat cards grid, the Upcoming Payments card, and the Spending by Category card entirely. The segmented control (All/Bills/Subscriptions) remains visible for orientation.

**When `items.length > 0`:** Show the full dashboard. Individual sub-sections (Upcoming Payments, Spending by Category) use their own compact empty states (#5, #8) when their specific data set is empty (e.g., no items due in the next 7 days).

This gives first-run users a single, focused call-to-action instead of a wall of empty widgets.

## ItemList View Mode Matching

ItemList supports both `grid` and `list` (table) view modes, persisted in localStorage. The ghost preview must match the user's current view mode:

- **Grid mode** (`viewMode === "grid"`): use `GhostListPreview variant="item-card"`
- **List mode** (`viewMode === "list"`): use `GhostListPreview variant="item-row"`

Read `viewMode` from the existing `useLocalStorage` hook and pass the appropriate variant. The Dashboard welcome state always uses `item-card` since it's not tied to a specific view.

## Compact vs Full Layout

The existing `EmptyState` uses a large layout (96x96 icon, `text-2xl` title, `py-16` padding). This works for page-level empty states (#1-4) but is too heavy for card-level empty states (#5-10) that sit inside Dashboard/Analytics cards alongside other content.

**Full layout** (items 1-4): Current sizing. Used when the empty state IS the page content.

**Compact layout** (items 5-10): Smaller green gradient icon box (40x40 instead of 96x96), `text-base` title, `py-6` padding. Used when the empty state is inside a card that has its own heading. The card's `<h3>` already provides context, so the empty state title is secondary.

Implementation: a `compact` boolean prop on `EmptyState`, defaulting to `false`.

## Accessibility

Ghost previews are purely decorative. Requirements:

- **`aria-hidden="true"`** on the preview container in `EmptyState`. This excludes all ghost content from the accessibility tree.
- **`tabIndex={-1}`** is unnecessary since `pointer-events: none` already prevents focus, but the container should not contain any focusable elements (no `<button>`, `<a>`, or `<input>` in ghost markup).
- **`role="presentation"`** on the ghost container as a secondary signal.
- **`prefers-reduced-motion`**: All shimmer animations and entry scale transitions must be disabled under `prefers-reduced-motion: reduce`. Ghost previews render immediately at their final state (no fade-in, no shimmer). Use a CSS media query, not JS detection.

```css
@media (prefers-reduced-motion: reduce) {
  .ghost-shimmer { animation: none !important; }
  .empty-state-enter { animation: none !important; opacity: 1 !important; transform: none !important; }
}
```

## Animation

- Entry: `fade-in` + `scale(0.97 → 1)` over 300ms, matching existing `zoom-in-95` pattern
- Shimmer on ghost list rows: CSS `@keyframes shimmer` — a translucent highlight sweeps left-to-right across placeholder bars. 3s duration, infinite loop, `ease-in-out`.
- No shimmer on chart ghosts — static shapes
- All animations disabled under `prefers-reduced-motion: reduce` (see Accessibility section)

```css
@keyframes ghost-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

Applied via `background: linear-gradient(90deg, transparent 0%, var(--text-muted) 50%, transparent 100%)` with `background-size: 200% 100%`.

## Files to Create

1. `src/components/ui/GhostListPreview.tsx`
2. `src/components/ui/GhostChartPreview.tsx`

## Files to Modify

1. `src/components/ui/EmptyState.tsx` — add `preview` and `compact` props, layout variants
2. `src/components/ItemList.tsx` — pass `GhostListPreview` to existing EmptyState usages
3. `src/components/Dashboard.tsx` — replace 2 inline empty states + upgrade welcome state
4. `src/components/Analytics.tsx` — replace 4 inline empty states
5. `src/index.css` — add `ghost-shimmer` keyframes, `prefers-reduced-motion` overrides, `.ghost-shimmer` utility class

## Design Token Usage

All ghost elements use existing tokens only:
- `var(--bg-hover)` — ghost row background
- `var(--border-default)` — dashed borders
- `var(--text-muted)` — placeholder bar fills
- `var(--brand-primary)` — chart silhouette fills
- `var(--shadow-card)` — not used on ghosts (they should feel flat/insubstantial)

No new CSS custom properties needed. Fractional opacities on hex tokens are achieved via `color-mix(in srgb, ...)` throughout — no rgba conversion required.
