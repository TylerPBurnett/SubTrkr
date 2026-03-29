# Bespoke Empty States Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all plain-text empty states in Dashboard, ItemList, and Analytics with premium ghost previews that teach users what populated views look like.

**Architecture:** Extend the existing `EmptyState` component with `preview` and `compact` props. Two new presentational components (`GhostListPreview`, `GhostChartPreview`) provide the ghost content. CSS animations in `index.css`. Integration into Dashboard, ItemList, and Analytics.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, CSS custom properties, inline SVG, `color-mix()` for token opacity.

**Spec:** `docs/superpowers/specs/2026-03-28-bespoke-empty-states-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/index.css` | Modify | Ghost shimmer keyframes, empty-state-enter animation, `prefers-reduced-motion` overrides |
| `src/components/ui/EmptyState.tsx` | Modify | Add `preview`, `compact` props; two layout modes; accessible preview container |
| `src/components/ui/GhostListPreview.tsx` | Create | Ghost rows for lists: `item-card`, `item-row`, `payment-row`, `ranked-row`, `cancelled-row` |
| `src/components/ui/GhostChartPreview.tsx` | Create | Ghost chart skeletons: `area-chart`, `bar-chart`, `pie-chart` (with legend) |
| `src/components/Dashboard.tsx` | Modify | First-run behavior (hide sections when 0 items), upgrade 3 empty states |
| `src/components/ItemList.tsx` | Modify | Pass ghost previews to EmptyState, view-mode-aware variant |
| `src/components/Analytics.tsx` | Modify | Replace 4 inline empty states with EmptyState + ghost previews |

---

### Task 1: CSS Foundation — Animations and Reduced Motion

**Files:**
- Modify: `src/index.css:1178` (append after last rule)

- [ ] **Step 1: Add ghost shimmer keyframes and utility class**

Add at the end of `src/index.css`:

```css
/* ============================================
   GHOST PREVIEW ANIMATIONS
   ============================================ */

@keyframes ghost-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.ghost-shimmer-bar {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--text-muted) 8%, transparent) 0%,
    color-mix(in srgb, var(--text-muted) 16%, transparent) 50%,
    color-mix(in srgb, var(--text-muted) 8%, transparent) 100%
  );
  background-size: 200% 100%;
  animation: ghost-shimmer 3s ease-in-out infinite;
  border-radius: 6px;
}

.empty-state-enter {
  animation: zoomIn95 0.3s var(--ease-out-expo);
}

@media (prefers-reduced-motion: reduce) {
  .ghost-shimmer-bar {
    animation: none !important;
  }
  .empty-state-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}
```

- [ ] **Step 2: Verify the app still loads**

Run: `open http://localhost:1420` or check the existing Vite dev server.
Expected: App renders normally, no visual changes yet.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): add ghost shimmer animation and reduced-motion overrides"
```

---

### Task 2: Redesign EmptyState Component

**Files:**
- Modify: `src/components/ui/EmptyState.tsx`

- [ ] **Step 1: Add `preview` and `compact` props with dual layout**

Replace the entire contents of `src/components/ui/EmptyState.tsx` with:

```tsx
import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  preview?: React.ReactNode;
  compact?: boolean;
}

export default function EmptyState({ icon: Icon, title, description, action, preview, compact = false }: EmptyStateProps) {
  const iconSize = compact ? 'w-10 h-10' : preview ? 'w-12 h-12' : 'w-24 h-24';
  const innerIconSize = compact ? 'w-5 h-5' : preview ? 'w-6 h-6' : 'w-12 h-12';
  const iconRadius = compact ? 'rounded-xl' : 'rounded-2xl';
  const titleClass = compact ? 'text-base' : 'text-2xl';
  const padding = compact ? 'py-6 px-4' : 'py-16 px-4';
  const iconMargin = compact ? 'mb-3' : 'mb-6';

  return (
    <div className={`empty-state-enter flex flex-col items-center justify-center ${padding}`}>
      {/* Icon with gradient */}
      <div className={`relative ${iconMargin}`}>
        {!compact && (
          <div
            className="absolute inset-0 rounded-full blur-2xl scale-150"
            style={{
              background: 'radial-gradient(circle, var(--brand-primary) 0%, transparent 70%)',
              opacity: 0.15,
            }}
          />
        )}
        <div
          className={`relative ${iconSize} ${iconRadius} flex items-center justify-center`}
          style={{
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, #16a34a 100%)',
            boxShadow: compact ? undefined : '0 4px 14px -3px rgba(34, 197, 94, 0.35)',
          }}
        >
          <Icon className={`${innerIconSize} text-white`} />
        </div>
      </div>

      {/* Text */}
      <h3
        className={`${titleClass} mb-1 text-center`}
        style={{ color: 'var(--text-primary)', fontWeight: compact ? 700 : 800 }}
      >
        {title}
      </h3>
      <p
        className={`text-center max-w-sm ${compact ? 'text-sm mb-4' : 'mb-6'}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {description}
      </p>

      {/* Action button */}
      {action && (
        <button
          onClick={action.onClick}
          className={`btn-primary rounded-xl font-bold transition-all duration-200 ${compact ? 'px-4 py-2 text-sm' : 'px-6 py-3'}`}
        >
          {action.label}
        </button>
      )}

      {/* Ghost preview */}
      {preview && (
        <div
          className={`w-full ${action ? 'mt-6' : 'mt-2'}`}
          aria-hidden="true"
          role="presentation"
          style={{ pointerEvents: 'none' }}
        >
          {preview}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify existing empty states still render**

Check that the Dashboard welcome state, ItemList empty states, and ItemList search empty state all still render correctly — they pass no `preview` or `compact` prop so should use the full layout.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/EmptyState.tsx
git commit -m "feat(ui): add preview and compact props to EmptyState"
```

---

### Task 3: Create GhostListPreview Component

**Files:**
- Create: `src/components/ui/GhostListPreview.tsx`

- [ ] **Step 1: Create the component with all five variants**

Create `src/components/ui/GhostListPreview.tsx`:

```tsx
interface GhostListPreviewProps {
  variant: 'item-card' | 'item-row' | 'payment-row' | 'ranked-row' | 'cancelled-row';
  count?: number;
}

const ghostBorder = '1px dashed color-mix(in srgb, var(--border-default) 50%, transparent)';
const ghostBg = 'color-mix(in srgb, var(--bg-hover) 15%, transparent)';

function ShimmerBar({ width, height = 12 }: { width: number | string; height?: number }) {
  return (
    <div
      className="ghost-shimmer-bar"
      style={{ width, height, flexShrink: 0 }}
    />
  );
}

function ShimmerCircle({ size = 40 }: { size?: number }) {
  return (
    <div
      className="ghost-shimmer-bar"
      style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
    />
  );
}

function ItemCardGhost() {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <div className="flex items-center gap-3">
        <ShimmerCircle size={40} />
        <div className="flex-1 space-y-2">
          <ShimmerBar width={100} height={12} />
          <ShimmerBar width={60} height={10} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <ShimmerBar width={80} height={14} />
        <ShimmerBar width={48} height={6} />
      </div>
    </div>
  );
}

function ItemRowGhost() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ borderBottom: ghostBorder }}
    >
      <div
        className="ghost-shimmer-bar"
        style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }}
      />
      <ShimmerCircle size={32} />
      <ShimmerBar width={120} height={12} />
      <div className="flex-1" />
      <ShimmerBar width={80} height={10} />
      <ShimmerBar width={70} height={12} />
      <ShimmerBar width={60} height={10} />
    </div>
  );
}

function PaymentRowGhost() {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <ShimmerBar width={100} height={12} />
        <ShimmerBar width={80} height={10} />
      </div>
      <div className="text-right space-y-2">
        <ShimmerBar width={48} height={12} />
        <ShimmerBar width={56} height={10} />
      </div>
    </div>
  );
}

function RankedRowGhost({ rank }: { rank: number }) {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--bg-hover) 30%, transparent)',
          color: 'color-mix(in srgb, var(--text-muted) 40%, transparent)',
        }}
      >
        {rank}
      </div>
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <ShimmerBar width={100} height={12} />
        <ShimmerBar width={70} height={10} />
      </div>
      <div className="text-right space-y-2">
        <ShimmerBar width={64} height={14} />
        <ShimmerBar width={80} height={10} />
      </div>
    </div>
  );
}

function CancelledRowGhost() {
  return (
    <div
      className="flex items-center gap-4 p-3 rounded-xl"
      style={{ background: ghostBg, border: ghostBorder, opacity: 0.7 }}
    >
      <ShimmerCircle size={40} />
      <div className="flex-1 space-y-2">
        <div style={{ textDecoration: 'line-through', opacity: 0.5 }}>
          <ShimmerBar width={100} height={12} />
        </div>
        <ShimmerBar width={70} height={10} />
      </div>
      <ShimmerBar width={64} height={14} />
    </div>
  );
}

export default function GhostListPreview({ variant, count = 2 }: GhostListPreviewProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  if (variant === 'item-card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((i) => <ItemCardGhost key={i} />)}
      </div>
    );
  }

  if (variant === 'item-row') {
    return (
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: ghostBorder }}
      >
        {items.map((i) => <ItemRowGhost key={i} />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((i) => {
        switch (variant) {
          case 'payment-row':
            return <PaymentRowGhost key={i} />;
          case 'ranked-row':
            return <RankedRowGhost key={i} rank={i + 1} />;
          case 'cancelled-row':
            return <CancelledRowGhost key={i} />;
        }
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to GhostListPreview.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/GhostListPreview.tsx
git commit -m "feat(ui): add GhostListPreview component with 5 variants"
```

---

### Task 4: Create GhostChartPreview Component

**Files:**
- Create: `src/components/ui/GhostChartPreview.tsx`

- [ ] **Step 1: Create the component with all three variants**

Create `src/components/ui/GhostChartPreview.tsx`:

```tsx
interface GhostChartPreviewProps {
  variant: 'area-chart' | 'bar-chart' | 'pie-chart';
}

function AreaChartGhost() {
  return (
    <div className="h-64 w-full flex items-end">
      <svg viewBox="0 0 400 200" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="ghost-area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[50, 100, 150].map((y) => (
          <line
            key={y}
            x1="0" y1={y} x2="400" y2={y}
            stroke="var(--border-default)"
            strokeOpacity="0.3"
            strokeDasharray="4 4"
          />
        ))}
        {/* Area fill */}
        <path
          d="M0,180 C50,170 80,140 120,120 C160,100 200,60 240,80 C280,100 320,50 360,40 L400,30 L400,200 L0,200 Z"
          fill="url(#ghost-area-fill)"
        />
        {/* Line stroke */}
        <path
          d="M0,180 C50,170 80,140 120,120 C160,100 200,60 240,80 C280,100 320,50 360,40 L400,30"
          fill="none"
          stroke="var(--brand-primary)"
          strokeOpacity="0.15"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Dots */}
        {[
          [0, 180], [120, 120], [240, 80], [360, 40],
        ].map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r="4"
            fill="var(--brand-primary)"
            fillOpacity="0.15"
          />
        ))}
      </svg>
    </div>
  );
}

function BarChartGhost() {
  const bars = [
    { width: '85%', label: 100 },
    { width: '65%', label: 76 },
    { width: '45%', label: 52 },
    { width: '30%', label: 34 },
  ];

  return (
    <div className="h-64 flex flex-col justify-center gap-4 px-2">
      {bars.map((bar, i) => (
        <div key={i} className="flex items-center gap-3">
          <div
            className="ghost-shimmer-bar"
            style={{ width: 80, height: 10, flexShrink: 0, animation: 'none' }}
          />
          <div className="flex-1 h-6 rounded-md overflow-hidden">
            <div
              className="h-full rounded-r-md"
              style={{
                width: bar.width,
                background: `color-mix(in srgb, var(--brand-primary) ${8 + i * 2}%, transparent)`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function PieChartGhost() {
  const legendItems = [
    { width: 80 },
    { width: 64 },
    { width: 72 },
  ];

  return (
    <div className="flex items-center gap-6 justify-center py-4">
      {/* Donut */}
      <div
        className="shrink-0"
        style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `conic-gradient(
            color-mix(in srgb, var(--brand-primary) 16%, transparent) 0deg 120deg,
            color-mix(in srgb, var(--brand-primary) 10%, transparent) 120deg 240deg,
            color-mix(in srgb, var(--brand-primary) 6%, transparent) 240deg 360deg
          )`,
          position: 'relative',
        }}
      >
        {/* Center cutout */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            background: 'var(--bg-card)',
          }}
        />
      </div>

      {/* Legend */}
      <div className="space-y-3">
        {legendItems.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                background: `color-mix(in srgb, var(--brand-primary) ${16 - i * 4}%, transparent)`,
              }}
            />
            <div
              className="ghost-shimmer-bar"
              style={{ width: item.width, height: 10, animation: 'none' }}
            />
            <div
              className="ghost-shimmer-bar"
              style={{ width: 48, height: 10, animation: 'none' }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GhostChartPreview({ variant }: GhostChartPreviewProps) {
  switch (variant) {
    case 'area-chart':
      return <AreaChartGhost />;
    case 'bar-chart':
      return <BarChartGhost />;
    case 'pie-chart':
      return <PieChartGhost />;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `bunx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No new errors related to GhostChartPreview.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/GhostChartPreview.tsx
git commit -m "feat(ui): add GhostChartPreview component with area, bar, pie variants"
```

---

### Task 5: Integrate into ItemList

**Files:**
- Modify: `src/components/ItemList.tsx:704-719` (no-items empty state)

- [ ] **Step 1: Add imports**

Add to the top of `src/components/ItemList.tsx`, after existing imports:

```tsx
import GhostListPreview from './ui/GhostListPreview';
```

- [ ] **Step 2: Update the no-items empty state to pass ghost preview**

In `src/components/ItemList.tsx`, find the block at ~line 704-719 that renders the EmptyState when `typeFilteredItems.length === 0`. Replace:

```tsx
      {typeFilteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Icon}
            title={`No ${labels.plural} yet`}
            description={`Start tracking your recurring payments by adding your first ${labels.singular}.`}
            action={
              onAddNew
                ? {
                    label: `Add ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`,
                    onClick: onAddNew,
                  }
                : undefined
            }
          />
        </div>
```

With:

```tsx
      {typeFilteredItems.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Icon}
            title={`No ${labels.plural} yet`}
            description={`Start tracking your recurring payments by adding your first ${labels.singular}.`}
            action={
              onAddNew
                ? {
                    label: `Add ${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)}`,
                    onClick: onAddNew,
                  }
                : undefined
            }
            preview={
              <GhostListPreview
                variant={viewMode === 'list' ? 'item-row' : 'item-card'}
                count={2}
              />
            }
          />
        </div>
```

- [ ] **Step 3: Verify visually**

Navigate to the Subscriptions or Bills view with no items. Confirm:
- Ghost preview renders below the title/description
- Grid mode shows 2 ghost cards in a 2-column grid
- List mode shows 2 ghost table rows
- Shimmer animation runs smoothly
- CTA button still works

- [ ] **Step 4: Commit**

```bash
git add src/components/ItemList.tsx
git commit -m "feat(ui): add ghost list preview to ItemList empty state"
```

---

### Task 6: Integrate into Dashboard — First-Run + Sub-Section Empty States

**Files:**
- Modify: `src/components/Dashboard.tsx:23,155-165,282-286,350-354`

- [ ] **Step 1: Add imports**

Add after the existing `EmptyState` import in `src/components/Dashboard.tsx`:

```tsx
import GhostListPreview from './ui/GhostListPreview';
import GhostChartPreview from './ui/GhostChartPreview';
```

- [ ] **Step 2: Upgrade the welcome empty state with ghost preview**

Find the welcome empty state block at ~line 155-165. Replace:

```tsx
      {/* Empty state when no items exist */}
      {items.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Plus}
            title="Welcome to SubTrkr"
            description="Start tracking your subscriptions and bills to see spending insights, upcoming payments, and more."
            action={onAddNew ? { label: 'Add Your First Item', onClick: onAddNew } : undefined}
          />
        </div>
      )}
```

With:

```tsx
      {/* First-run: show only the welcome state, hide everything else */}
      {items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Plus}
            title="Welcome to SubTrkr"
            description="Start tracking your subscriptions and bills to see spending insights, upcoming payments, and more."
            action={onAddNew ? { label: 'Add Your First Item', onClick: onAddNew } : undefined}
            preview={<GhostListPreview variant="item-card" count={3} />}
          />
        </div>
      ) : (
        <>
```

- [ ] **Step 3: Close the conditional wrapper**

Find the closing `</div>` of the Dashboard's main content (after the Spending by Category card, at the end of the `<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">` block, around line 430). Add after the closing `</div>` of that grid:

```tsx
        </>
      )}
```

This wraps the stat cards grid + the two-column grid (Upcoming Payments, Spending by Category) inside the `items.length > 0` branch. The segmented control above remains visible in both cases.

- [ ] **Step 4: Replace Upcoming Payments inline empty state**

Find the inline empty state at ~line 282-286:

```tsx
          {upcomingItems.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No payments due in the next 7 days</p>
            </div>
```

Replace with:

```tsx
          {upcomingItems.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No upcoming payments"
              description="Payments due in the next 7 days will appear here."
              compact
              preview={<GhostListPreview variant="payment-row" count={2} />}
            />
```

- [ ] **Step 5: Replace Spending by Category inline empty state**

Find the inline empty state at ~line 350-354:

```tsx
          {chartData.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>No spending data yet</p>
            </div>
```

Replace with:

```tsx
          {chartData.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No spending data yet"
              description="Category breakdown will appear once you add items."
              compact
              preview={<GhostChartPreview variant="pie-chart" />}
            />
```

- [ ] **Step 6: Verify visually**

Check three scenarios:
1. **Zero items**: Only welcome state + segmented control visible. No stat cards, no sub-section cards.
2. **Items exist but none due in 7 days**: Full dashboard with compact ghost payment rows in Upcoming Payments.
3. **Items exist but no category data**: Full dashboard with compact ghost pie chart in Spending by Category.

- [ ] **Step 7: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat(ui): add ghost previews to Dashboard empty states, hide sections on first run"
```

---

### Task 7: Integrate into Analytics — All Four Empty States

**Files:**
- Modify: `src/components/Analytics.tsx:449-452,552-555,626-629,677-680`

- [ ] **Step 1: Add imports**

Add to the imports section of `src/components/Analytics.tsx`:

```tsx
import EmptyState from './ui/EmptyState';
import GhostListPreview from './ui/GhostListPreview';
import GhostChartPreview from './ui/GhostChartPreview';
```

Also add the necessary icon imports if not already present. `TrendingUp` is already imported. Add `BarChart3` for the category chart:

```tsx
import { TrendingUp, TrendingDown, Minus, Receipt, CreditCard, BarChart3 } from 'lucide-react';
```

- [ ] **Step 2: Replace Monthly Spending Trend empty state**

Find the empty state at ~line 449-452:

```tsx
          {!hasTrendData ? (
            <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No spending data to display
            </div>
```

Replace with:

```tsx
          {!hasTrendData ? (
            <EmptyState
              icon={TrendingUp}
              title="No spending data yet"
              description="Your monthly spending trend will appear here."
              compact
              preview={<GhostChartPreview variant="area-chart" />}
            />
```

- [ ] **Step 3: Replace Category Breakdown empty state**

Find the empty state at ~line 552-555:

```tsx
          {categoryChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
              No category data to display
            </div>
```

Replace with:

```tsx
          {categoryChartData.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No category data yet"
              description="Spending by category will be charted here."
              compact
              preview={<GhostChartPreview variant="bar-chart" />}
            />
```

- [ ] **Step 4: Replace Most Expensive empty state**

Find the empty state at ~line 626-629. The `itemTypeLabel` variable is already available in this scope:

```tsx
          {topItems.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No active {itemTypeLabel.toLowerCase()}
            </div>
```

Replace with:

```tsx
          {topItems.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No active items"
              description="Your top spending items will be ranked here."
              compact
              preview={<GhostListPreview variant="ranked-row" count={2} />}
            />
```

- [ ] **Step 5: Replace Cancellation History empty state**

Find the empty state at ~line 677-680:

```tsx
          {cancelledItems.length === 0 ? (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No cancelled {itemTypeLabel.toLowerCase()} yet
            </div>
```

Replace with:

```tsx
          {cancelledItems.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No cancellations yet"
              description="Cancelled items and savings will be tracked here."
              compact
              preview={<GhostListPreview variant="cancelled-row" count={1} />}
            />
```

- [ ] **Step 6: Verify visually**

Navigate to Analytics with no items (or with items that produce empty charts). Confirm all four empty states show:
1. Area chart ghost in Monthly Spending Trend
2. Bar chart ghost in Spending by Category
3. Ranked row ghosts in Most Expensive
4. Cancelled row ghost in Cancellation History

Check both light and dark themes.

- [ ] **Step 7: Commit**

```bash
git add src/components/Analytics.tsx
git commit -m "feat(ui): add ghost previews to all Analytics empty states"
```

---

### Task 8: Final Verification and Polish

**Files:**
- All modified files

- [ ] **Step 1: TypeScript check**

Run: `bunx tsc --noEmit --pretty`
Expected: No errors (the pre-existing `database.ts:750` unused var warning may still appear — ignore it).

- [ ] **Step 2: Full visual audit — light theme**

Walk through every empty state location in light theme:
1. Dashboard with 0 items → welcome state with ghost cards, no stat cards visible
2. Dashboard with items but no upcoming → compact ghost payment rows
3. Dashboard with items but no category data → compact ghost pie chart
4. Subscriptions with 0 items (grid mode) → ghost cards
5. Subscriptions with 0 items (list mode) → ghost table rows
6. Bills with 0 items → same pattern as subscriptions
7. Search with no results → no ghost (just icon + text)
8. Analytics: all 4 empty states → ghost charts/rows

- [ ] **Step 3: Full visual audit — dark theme**

Repeat the same walkthrough in dark theme. Verify:
- `color-mix` opacity values produce visible but subtle ghosts
- Ghost elements don't blend into `--bg-card` (they should be slightly lighter/more visible)
- Shimmer animation reads well on dark backgrounds

- [ ] **Step 4: Test reduced motion**

In macOS System Settings → Accessibility → Display, enable "Reduce motion." Verify:
- No shimmer animation on ghost rows
- No entry animation on EmptyState
- Ghost previews render instantly at final state

- [ ] **Step 5: Commit any polish fixes**

If any visual adjustments were needed:

```bash
git add -u
git commit -m "fix(ui): polish ghost preview styling across themes"
```
