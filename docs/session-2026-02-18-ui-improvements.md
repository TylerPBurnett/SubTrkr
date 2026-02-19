# Session Summary: Comprehensive UI/UX Improvements
**Date:** February 18, 2026

## Overview

Implemented 18 UI/UX improvements across the app based on a pre-written design review, followed by a Vercel React Best Practices audit that surfaced 3 violations which were also fixed.

---

## Changes by Category

### Round 1 — Quick Wins (Items 1–7)

**1. Sidebar branding wordmark**
- Added "Sub**Trkr**" wordmark to the drag region at the top of the sidebar
- `src/App.tsx`

**2. Settings active state**
- Fixed settings button highlight: changed from green filled background to a left-border active indicator (matching the style of nav items)
- All nav items now always have a `4px solid transparent` border, swapping to the accent color when active — no layout shift
- `src/App.tsx`

**3. Nav item border padding consistency**
- Removed the conditional `paddingLeft` offset that compensated for the missing border — now all items are always padded uniformly
- `src/App.tsx`

**4. Merged drag region**
- Eliminated the separate `h-12` drag region strip at the top of the main content area; the header bar itself carries `data-tauri-drag-region`, reducing dead space
- `src/App.tsx`

**5. "View all" navigation callback**
- Wired `onViewAll` and `onAddNew` props on `Dashboard` so the "View all" upcoming button and empty state CTA actually navigate to the correct view in `App.tsx`
- `src/App.tsx`, `src/components/Dashboard.tsx`

**6. Responsive PieChart**
- Replaced hardcoded `<PieChart width={160} height={160}>` with `<ResponsiveContainer width="100%" height="100%">` inside a `w-40 h-40 shrink-0` container so the chart scales with its parent
- `src/components/Dashboard.tsx`

**7. Removed font-mono from service names**
- Item names in both grid and list views were displaying in monospace. Changed to the default sans-serif font
- `src/components/ItemList.tsx`

---

### Round 2 — Medium Effort (Items 8–13)

**8. Replaced DIY toast with Sonner**
- Installed `sonner` toast library (`bun add sonner`)
- Removed the `error` state entirely from `App.tsx`; all error display now routes through `toast.error()` directly at the callsite
- Added `<Toaster>` with `position="bottom-right"`, theme-aware, `borderRadius: '12px'`
- Added success toasts to: `handleCreateItem`, `handleUpdateItem`, `handleDeleteItem`, `handleStatusChangeConfirm`
- `src/App.tsx`

**9. Improved loading screens**
- Auth/data loading states replaced the plain pulsing circle with a branded spinner
- `src/App.tsx`

**10. Dashboard empty state**
- When `items.length === 0`, Dashboard now renders an `EmptyState` component with "Welcome to SubTrkr" copy and an "Add your first subscription" CTA wired to `onAddNew`
- `src/components/Dashboard.tsx`

**11. "View all upcoming" button**
- After the 5th upcoming item in the Dashboard list, a "View all N upcoming" button is shown that calls `onViewAll()`
- `src/components/Dashboard.tsx`

**12. Keyboard shortcuts**
- Global shortcuts added via `useEffect` in `App.tsx`:
  - `⌘N` — new subscription
  - `⌘B` — new bill
  - `⌘1`–`⌘5` — navigate to Dashboard / Subscriptions / Bills / Analytics / Settings
  - `⌘\` — toggle sidebar collapse (disabled when window is narrow)
  - `/` — focus search input
  - `Escape` — close open modal/dialog
- `src/App.tsx`

**13. Skeleton lazy-load fallback**
- Rewrote `LazyComponentFallback.tsx` to use `SkeletonCard` and `SkeletonChartCard` components instead of a bare spinner, giving a polished content-shaped placeholder while Analytics/Settings load
- `src/components/LazyComponentFallback.tsx`

---

### Round 3 — Remaining Items (14–18)

**14. Status badge repositioning**
- Grid card status badges were `position: absolute` overlapping content; moved them into document flow between the header and amount sections
- Removed `relative` from the card wrapper
- Badges are only rendered when `item.status !== 'active'` (active items don't need a label)
- `src/components/ItemList.tsx`

**15. Collapsible + responsive sidebar**
- Manual collapse: `sidebarCollapsed` persisted via `useLocalStorage('subtrkr-sidebar-collapsed')`, toggled by `PanelLeftClose`/`PanelLeftOpen` button and `⌘\` shortcut
- Auto-collapse: `windowNarrow` state (`window.innerWidth < 900`) updated by a passive resize listener
- Combined as derived value: `const isCollapsed = sidebarCollapsed || windowNarrow`
- Toggle button is hidden when `windowNarrow` (user can't fight the auto-collapse)
- Sidebar: 256px expanded ↔ 64px icon-only with tooltip labels
- `src/App.tsx`

**16. Keyboard shortcut hints in context menus**
- Added `isMac` detection via `navigator.platform`
- Added `ShortcutHint` inline component that renders `⌘E` / `⌘⌫` (or `Ctrl+E` / `Ctrl+⌫` on non-Mac) to the right of Edit and Delete menu items
- `src/components/ItemList.tsx`

**17. Reduced opacity/grayscale for non-active items**
- Lowered opacity values: paused → 80%, cancelled → 65%, archived → 55%
- Reduced grayscale filter: 30% → 15%
- `src/components/ItemList.tsx`

**18. Trend indicators on stat cards**
- Added `calculatePreviousMonthSpending()` — filters items whose `start_date` predates the current month, normalizes amounts to monthly, sums them
- Added `TrendBadge` component — compares current vs. previous month, shows a colored arrow (↑ red / ↓ green / — neutral) and percentage change
- Monthly and yearly stat cards each display a `TrendBadge` below the amount
- `src/components/Dashboard.tsx`

---

## Vercel React Best Practices Audit

After all 18 items were implemented, a `/vercel-react-best-practices` audit surfaced 3 violations:

### Fix 1 — Rule 5.3: No useMemo for simple primitives
`prevYearlySpending` was wrapped in `useMemo` but is just `prev * 12` from a primitive. Converted to a plain `const`.

```typescript
// Before
const prevYearlySpending = useMemo(() => prevMonthlySpending * 12, [prevMonthlySpending]);

// After
const prevYearlySpending = prevMonthlySpending * 12;
```

### Fix 2 — Rule 5.7: Interaction logic in event handlers, not effects
The original code used an `error` state as a bridge: handlers called `setError(msg)`, then a `useEffect` watched `error` and called `toast.error()`. This is an anti-pattern.

Removed `error` state entirely. All `toast.error()` calls now happen directly at each callsite in the handler.

### Fix 3 — Rules 5.6/8.2: Narrow effect deps + stable handler refs
The keyboard shortcut `useEffect` listed `[session, showForm, statusChangeDialog]` as deps, causing the listener to be torn down and re-registered on every dialog open/close.

Fixed using refs synced each render:

```typescript
const showFormRef = useRef(showForm);
showFormRef.current = showForm;
const statusChangeDialogRef = useRef(statusChangeDialog);
statusChangeDialogRef.current = statusChangeDialog;

// Effect deps narrowed to [session] only
useEffect(() => {
  // handler reads showFormRef.current / statusChangeDialogRef.current
}, [session]);
```

---

## Files Modified

| File | Changes |
|------|---------|
| `src/App.tsx` | Sidebar (branding, collapse, responsive, nav borders), toasts (Sonner), error state removal, keyboard shortcuts, loading screens, drag region, dashboard prop wiring |
| `src/components/Dashboard.tsx` | Trend badges, empty state, "View all" button, responsive PieChart, `onViewAll`/`onAddNew` props |
| `src/components/ItemList.tsx` | Font-mono removal, opacity/grayscale reduction, status badge flow fix, shortcut hints in menus |
| `src/components/LazyComponentFallback.tsx` | Full rewrite using skeleton components |

## Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `sonner` | latest | Toast notifications (replaces DIY fixed-position toast div) |

---

## Architectural Notes

The keyboard shortcut ref pattern established here (`useRef` + sync-each-render + narrow `useEffect` deps) is the recommended approach for any future global event listeners that need to read component state without re-registering on state changes.

The sidebar collapse pattern uses **two separate concerns**: `sidebarCollapsed` (user preference, persisted) and `windowNarrow` (window width, ephemeral), combined as `isCollapsed = sidebarCollapsed || windowNarrow`. This keeps user intent separate from environment constraints — the localStorage value is never corrupted by auto-collapse behavior.
