# SubTrkr Design System

## Intent

**Who:** Someone managing personal finances—reviewing recurring expenses, tracking where money goes each month. Not an accountant; wants to feel in control.

**Task:** Track recurring payments. See upcoming charges. Catch trials before conversion. Pause unused subscriptions. Understand spending patterns.

**Feel:** Calm confidence. A well-organized financial ledger—structured but not sterile. Sharp enough to feel trustworthy with numbers, warm enough to not feel like a spreadsheet.

---

## Direction

**Domain:** Personal finance, subscription management, recurring payments
**Signature:** Monospace numbers + green accent—a "financial terminal" aesthetic that's approachable

---

## Color

### Palette Philosophy
Green = growth, financial health, positive action
Neutrals = ledger paper, ink, structure
Amber = warnings, attention needed
Red = alerts, cancellations, destructive

### Tokens (Dark Theme)

```css
/* Backgrounds - cool charcoal, layered */
--bg-base: #0a0a0a      /* App background */
--bg-surface: #171717   /* Sidebar, elevated panels */
--bg-card: #1c1c1c      /* Cards */
--bg-input: #262626     /* Form inputs */
--bg-hover: #262626     /* Hover states */
--bg-active: #333333    /* Active/pressed states */

/* Text - high contrast, readable */
--text-primary: #fafafa    /* Headings, important content */
--text-secondary: #a3a3a3  /* Body, descriptions */
--text-muted: #525252      /* Placeholders, disabled */

/* Borders - subtle separation */
--border-default: #2e2e2e
--border-muted: #262626
--border-strong: #404040

/* Brand - green growth */
--brand-primary: #22c55e
--brand-primary-hover: #4ade80
--brand-muted: rgba(34, 197, 94, 0.15)
--brand-text: #4ade80

/* Semantic accents */
--accent-blue: #60a5fa     /* Info, trials */
--accent-purple: #a78bfa   /* Analytics, yearly */
--accent-amber: #fbbf24    /* Warnings, paused */
--accent-red: #f87171      /* Errors, cancelled */
--accent-green: #34d399    /* Success, active */
```

### Usage Rules
- Cards use `--bg-card` with `--border-muted` borders
- Hover states lighten to `--bg-hover`
- Primary actions always use `--brand-primary`
- Status colors: active=green, paused=amber, cancelled=red, trial=blue

---

## Typography

### Fonts
- **Display/UI:** Inter (weights 400-900)
- **Data/Numbers:** JetBrains Mono (weights 400-700)

### Scale
```css
/* Headings */
h1: 2rem / 800 weight / -0.02em tracking
h2: 1.5rem / 800 weight / -0.02em tracking
h3: 1.25rem / 700 weight / -0.02em tracking

/* Body */
body: 1rem / 500 weight / -0.01em tracking
small: 0.875rem / 500 weight
label: 0.6875rem / 600 weight / 0.08em tracking / uppercase

/* Monospace (for numbers, amounts) */
data-large: 1.5rem / 650 weight / -0.02em tracking
data-medium: 1rem / 600 weight / -0.01em tracking
data-small: 0.75rem / 600 weight
```

### Rules
- All monetary amounts use `font-mono`
- Dates use `font-mono`
- Status badges use `font-mono` at 11px with slight letter-spacing
- Headings always use negative letter-spacing (-0.02em to -0.03em)

---

## Spacing

### Base Unit: 4px

### Common Values
```
4px   - Tight gaps (badge padding, icon margins)
8px   - Small gaps (between related elements)
12px  - Medium gaps (form field spacing)
16px  - Default gaps (card content sections)
24px  - Large gaps (card padding, section margins)
32px  - Page padding
```

### Component Patterns
- Card padding: 24px
- Input padding: 12px horizontal, 10px vertical
- Button padding: 10px vertical, 20px horizontal
- Nav item padding: 16px horizontal, 12px vertical
- Table cell padding: 12px horizontal, 12px vertical

---

## Depth

### Shadow Scale
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2)
--shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2)
--shadow-elevated: 0 8px 24px -8px rgba(0, 0, 0, 0.4)
--shadow-brand: 0 4px 14px -3px rgba(34, 197, 94, 0.25)
```

### Elevation Order (low to high)
1. Base background (`--bg-base`)
2. Surface/sidebar (`--bg-surface`)
3. Cards (`--bg-card` + `--shadow-card`)
4. Dropdowns/modals (`--bg-surface` + `--shadow-elevated`)

### Border Strategy
- Cards: 1px `--border-muted` + category color left border (6px)
- Inputs: 2px `--border-default`, focus changes to `--brand-primary`
- Dividers: 1px `--border-muted`
- Active nav: 4px left border `--brand-primary`

---

## Components

### Cards
```
- Background: var(--bg-card)
- Border: 1px solid var(--border-muted)
- Border-radius: 1rem (16px)
- Padding: 1.5rem (24px)
- Shadow: var(--shadow-card)
- Hover: var(--shadow-elevated), translateY(-1px)
- Category accent: 6px left border in category color
```

### Buttons

**Primary:**
```
- Background: var(--brand-primary)
- Color: var(--text-inverse)
- Shadow: var(--shadow-brand)
- Border-radius: 0.75rem (12px)
- Padding: 10px 20px
- Hover: var(--brand-primary-hover), translateY(-1px)
```

**Secondary:**
```
- Background: var(--bg-hover)
- Border: 2px solid var(--border-default)
- Color: var(--text-secondary)
- Hover: var(--bg-active), var(--text-primary)
```

### Inputs
```
- Background: var(--bg-input)
- Border: 2px solid var(--border-default)
- Border-radius: 0.5rem (8px)
- Font: JetBrains Mono
- Focus: border-color var(--brand-primary), subtle shadow
```

### Status Badges
```
- Font: JetBrains Mono, 11px, semibold
- Padding: 4px 10px
- Border-radius: 9999px (pill)
- Active: green bg muted, green text
- Paused: amber bg muted, amber text
- Trial: blue bg muted, blue text
- Cancelled: red bg muted, red text
```

### Dropdowns
```
- Background: var(--bg-surface)
- Border: 1px solid var(--border-default)
- Shadow: var(--shadow-elevated)
- Border-radius: 0.75rem (12px)
- Animation: slide down + fade, 200ms ease-out-expo
```

---

## Motion

### Timing
- Micro-interactions: 150-200ms
- Transitions: 200-300ms
- Page transitions: 300-400ms

### Easing
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)  /* Standard */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1)  /* Bouncy */
```

### Patterns
- Hover lift: `transform: translateY(-1px)` + shadow increase
- Card appear: `slideUp` with stagger (0.05s per item)
- Dropdown: `translateY(-8px)` to `translateY(0)` + opacity
- Focus: immediate border color, smooth shadow

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--ring-offset), 0 0 0 4px var(--brand-primary);
}
```

### Color Contrast
- Text primary on bg-card: 15.5:1 (AAA)
- Text secondary on bg-card: 6.4:1 (AA)
- Brand primary on dark: 8.2:1 (AAA)

### Interactive Targets
- Minimum touch target: 44px
- Button minimum height: 40px
- Nav items: 48px height

---

## Patterns

### List Item with Status
```
[Logo] [Name + Category] [Amount] [Status Badge] [Menu]
       Left-aligned       Right    Color-coded    ...
```

### Stat Card
```
┌────────────────────────────────┐
│ LABEL              [Icon]     │
│ $1,234.56                     │
│ secondary info                │
└────────────────────────────────┘
Left border accent color
```

### Filter Toolbar
```
[Search input] [Category dropdown] [Status toggles] [View toggle]
```

---

## Do / Don't

**Do:**
- Use monospace for all financial data
- Add category color accents to cards
- Use semantic status colors consistently
- Animate with purpose (entrance, feedback)

**Don't:**
- Mix fonts for numbers
- Use pure black (#000) backgrounds
- Add shadows to everything
- Animate continuously (except loading states)
