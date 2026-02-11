# Chart Visual Enhancements (Evil Charts-Inspired)

**Date:** Feb 2026
**Branch:** `bill-sub-icons`
**Last commit before changes:** `2bc4f7c` (style: add floating main panel with shell composition)

## Rollback

To revert all chart enhancements at once:

```bash
# Restore original files from the commit before changes
git checkout 2bc4f7c -- src/components/Analytics.tsx src/components/Dashboard.tsx src/index.css

# Delete the new file
rm src/components/ui/ChartEffects.tsx
```

---

## Files Changed

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/ui/ChartEffects.tsx` | **NEW** | Shared SVG effect utilities (glow filter, gradient fill, color lightening) |
| `src/components/Analytics.tsx` | Modified | Line chart + bar chart visual overhaul |
| `src/components/Dashboard.tsx` | Modified | Pie chart visual overhaul + summary card styling |
| `src/index.css` | Modified | Chart animation keyframes + hover styles |

---

## What Changed Per Chart

### 1. Line Chart → Area Chart (Analytics.tsx)

**Original:**
- `LineChart` with `type="monotone"`
- Dashed `CartesianGrid` (`strokeDasharray="3 3"`)
- Basic dots (`fill: brand-primary, strokeWidth: 2`)
- `activeDot={{ r: 6 }}`
- Standard axis lines and tick marks

**Enhanced:**
- Switched to `AreaChart` with overlaid `Area` + `Line` components
- `type="bump"` interpolation for smoother, more dramatic curves
- SVG glow filter on the line (`GlowFilter` id="line-glow", blur=5, opacity=0.5)
- Gradient fill under the line (`GradientFill` id="area-fill", brand-primary, 0.3→0 opacity)
- Grid: solid lines, reduced opacity (0.5), vertical lines hidden
- Axis: removed `tickLine` and `axisLine` for cleaner look
- Active dot pulsates via CSS animation (`chart-active-dot` class)
- Tooltip: compact padding (6px 10px), smaller font (13px), no separator label

**Imports changed:**
```diff
- import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
+ import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
+ import { GlowFilter, GradientFill, lightenColor } from './ui/ChartEffects';
```

### 2. Horizontal Bar Chart (Analytics.tsx)

**Original:**
- Flat category colors via `<Cell fill={entry.color} />`
- `radius={[0, 4, 4, 0]}`
- Dashed grid (`strokeDasharray="3 3"`)
- Standard axis lines and tick marks
- Default Recharts tooltip cursor (gray background rectangle on hover)

**Enhanced:**
- Per-bar horizontal gradient fill (category color → lightened variant via `lightenColor()`)
- SVG glow filter on bars (`GlowFilter` id="bar-glow", blur=3, opacity=0.25)
- `radius={[0, 6, 6, 0]}` (more rounded)
- Grid: solid lines, reduced opacity (0.3), horizontal lines hidden
- Axis: removed `tickLine` and `axisLine`
- `cursor={false}` on Tooltip to remove the gray hover background
- CSS entrance animation: bars slide in from left with staggered delays
- CSS hover: subtle `opacity: 0.85` + `scaleY(1.03)`
- Tooltip: same compact style as line chart

### 3. Pie/Donut Chart (Dashboard.tsx)

**Original:**
- `ResponsiveContainer` wrapper (ResizeObserver overhead)
- `LineChart` with `type="monotone"`
- Flat category colors via `<Cell fill={entry.color} />`
- `paddingAngle={2}`, no `cornerRadius`
- Basic tooltip styling
- No center label
- Default Recharts mount animation (~400ms)

**Enhanced:**
- Flat category colors (removed gradients — barely visible on 160px donut, caused lag)
- `paddingAngle={3}`, `cornerRadius={4}` for rounded slice edges
- Center label: "MONTHLY" + formatted total spend inside the donut hole
- CSS hover: `opacity: 0.85` + `scale(1.04)` via `chart-pie-sector` class
- Tooltip: compact padding, monospace font, no separator
- Removed `ResponsiveContainer`, replaced with fixed `width={160} height={160}` — eliminates resize observer
- `isAnimationActive={true}`, `animationDuration={300}`, `animationEasing="ease-out"` — fast snappy entrance on load, no lag

**Imports changed:**
```diff
- import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
+ import { PieChart, Pie, Cell, Tooltip } from 'recharts';
```

**Performance notes:**
- Removing dynamic per-slice gradients eliminated SVG computation overhead
- Fixed dimensions + `isAnimationActive={true}` with `animationDuration={300}` provides instant paint + snappy entrance animation
- ResizeObserver removal = faster initial load

### 4. Summary Cards (Analytics.tsx + Dashboard.tsx)

**Original (Analytics):**
- No `borderLeft` styling on summary cards

**Enhanced (Analytics):**
- Each card has `borderLeft: 4px solid` with a unique accent color:
  - Monthly Average: `--brand-primary`
  - Monthly Savings: `--accent-emerald`
  - Yearly Total: `--accent-purple`
  - Active Items: `--accent-blue`

**Dashboard cards:** Already had `borderLeft` styling; removed the `background: linear-gradient(...)` in favor of the simpler left-border approach.

---

## New File: `src/components/ui/ChartEffects.tsx`

Three exports:

1. **`GlowFilter`** — SVG `<filter>` element using `feGaussianBlur` + `feFlood` + `feComposite` + `feMerge` to create a neon glow behind chart elements.
   - Props: `id`, `color` (default: `--brand-primary`), `blur` (default: 6), `opacity` (default: 0.6)

2. **`GradientFill`** — SVG `<linearGradient>` element for area fills.
   - Props: `id`, `startColor`, `endColor`, `startOpacity` (default: 0.4), `endOpacity` (default: 0), `direction` (`'vertical'` | `'horizontal'`)

3. **`lightenColor(hex, amount)`** — Utility that lightens a hex color by mixing with white. Used for gradient end-colors on bars and pie slices.

---

## CSS Added (src/index.css)

```css
/* Line ~710-769 */

/* Pulsing active dot on line chart hover */
@keyframes chart-pulse-dot { ... }
.chart-active-dot { animation: chart-pulse-dot 1.2s ease-in-out infinite; }

/* Bar chart entrance animation */
@keyframes chart-bar-slide { from: scaleX(0) → to: scaleX(1) }
.chart-bar-enter .recharts-bar-rectangle { animation with staggered delays per child }

/* Bar hover */
.chart-bar-enter .recharts-bar-rectangle:hover { opacity: 0.85; scaleY(1.03); }

/* Pie chart sector hover */
.chart-pie-sector .recharts-sector:hover { opacity: 0.85; scale(1.04); }
```

---

## No New Dependencies

All enhancements use SVG filters/gradients and CSS animations on top of the existing Recharts library. No new npm packages were added.
