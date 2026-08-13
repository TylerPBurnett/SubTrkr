# SubTrkr Theming Architecture

This document explains the CSS custom properties theming system used in SubTrkr, enabling easy addition of new themes like Monokai, Gruvbox, Nord, etc.

See also: [`THEME_EXTENSION_SUMMARY.md`](./THEME_EXTENSION_SUMMARY.md) for a concise future-theme checklist aligned with the current implementation.

## Overview

SubTrkr uses **semantic design tokens** (CSS custom properties) for all colors. Instead of hardcoding colors like `#22c55e` throughout the codebase, we use purpose-based variables like `--brand-primary`. Themes override these variables.

### How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  <html data-theme="dark">                                    │
│                                                              │
│  CSS reads [data-theme="dark"] selector                      │
│  ↓                                                           │
│  Variables are set: --bg-base: #0a0a0a; --text-primary: #fff │
│  ↓                                                           │
│  Components use: style={{ color: 'var(--text-primary)' }}   │
│  ↓                                                           │
│  Result: White text on dark background                       │
└─────────────────────────────────────────────────────────────┘
```

### File Locations

| File | Purpose |
|------|---------|
| `src/index.css` | All theme definitions (CSS variables) |
| `src/App.tsx` | Theme state + `data-theme` attribute setter |

---

## Visual Hierarchy Principle

Cards must be visually distinct from the surface they sit on. The app uses a **3-tier background system** — each layer is a clearly different shade so content layers read as elevated:

```
Shell/Sidebar      ← darkest (outer frame)
  └─ Main Panel    ← mid (bg-surface)
       └─ Cards    ← lightest (bg-card)
```

**The rule: `--bg-card` must differ from `--bg-surface` by at least ~10 RGB units** in at least one channel. Less than that and cards dissolve into the background.

### Current token values

| Theme | `--bg-surface` | `--bg-card` | Gap |
|-------|---------------|-------------|-----|
| Light | `#edeef2` | `#ffffff` | ~15 units |
| Dark  | `#131415` | `#1e2022` | ~12 units |

Card borders use `--border-default` (not `--border-muted`) so they have a visible edge against the surface.

---

## Semantic Tokens Reference

All tokens are defined in `src/index.css`. Here's what each one controls:

### Backgrounds

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--bg-base` | Outermost shell background | Tiny margin gap around sidebar+panel |
| `--bg-surface` | Main content panel | The white/gray panel cards sit on |
| `--bg-card` | Card backgrounds | Stats cards, subscription cards |
| `--bg-input` | Form input backgrounds | Text fields, selects |
| `--bg-hover` | Hover state backgrounds | Button/list item hover |
| `--bg-active` | Active/pressed states | Button pressed state |
| `--bg-default` | Subtle fills | Table headers, secondary areas |

### Text

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--text-primary` | Main text color | Headings, body text |
| `--text-secondary` | De-emphasized text | Descriptions, labels |
| `--text-muted` | Very subtle text | Placeholders, disabled |
| `--text-inverse` | Text on an inverted neutral surface | Tooltip on a dark chip |

> `--text-inverse` flips per theme, so it is **not** the token for text on a
> green fill — in light it resolves to white and measures 2.28:1 on
> `--brand-primary`. Use `--brand-on-primary` there.

### Borders

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--border-default` | Standard borders | Input borders, dividers |
| `--border-muted` | Subtle borders | Card borders |
| `--border-strong` | Emphasized borders | Focus states |

### Brand Colors

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--brand-primary` | Main brand color (green) — **fills, borders, chart marks only** | Button background, switch track, meter bar |
| `--brand-primary-hover` | Brand hover state | Button hover |
| `--brand-muted` | Subtle brand background | Active nav item bg |
| `--brand-text` | Brand green when it carries **words or icons** | Links, active nav text, badge labels |
| `--brand-on-primary` | Ink for text/icons sitting **on** a `--brand-primary` fill | `.btn-primary` label, today's date pill |

#### Green never carries text as `--brand-primary`

`#22c55e` is a fill colour. As text on a light surface it measures **2.28:1 on
`--bg-card`** — it misses the 4.5:1 text floor and even the 3:1 non-text floor
for icons. Two tokens cover the cases where green has to be legible:

- **Green on a neutral background → `--brand-text`.** `#166534` in light clears
  4.5:1 on every light background in the palette (7.13:1 on `--bg-card`, 5.14:1
  on the darkest, `--bg-active`). Dark's `#4ade80` clears 7.60:1 at worst.
  Note `#15803d` (green-700) is *not* sufficient — it drops to 4.33:1 on
  `--bg-surface` and 3.62:1 on `--bg-active`.
- **Anything on a green fill → `--brand-on-primary`.** White fails on `#22c55e`
  in *both* themes (2.28:1), so the fill keeps a dark label in both: 7.87:1 at
  rest, 5.44:1 on the light hover (`#16a34a`), 10.29:1 on the dark hover
  (`#4ade80`). Do not reach for `--text-inverse` here — it flips per theme and
  so lands on white in light.

The one exception is the **wordmark** in `App.tsx`, which stays raw
`--brand-primary`: WCAG exempts logotypes from the contrast floor.

This mirrors the `--accent-red` / red-text split: the saturated token stays the
fill, and a darker sibling carries the words.

### Accent Colors (for categories/status)

| Token | Purpose |
|-------|---------|
| `--accent-blue` / `--accent-blue-muted` | Info states, "Active Subscriptions" |
| `--accent-purple` / `--accent-purple-muted` | "Yearly Spending" stat |
| `--accent-amber` / `--accent-amber-muted` | Warnings, "Due This Week" |
| `--accent-red` / `--accent-red-muted` | Errors, delete actions |
| `--accent-emerald` / `--accent-emerald-muted` | Success, positive trends |
| `--accent-pink` | Category color option |
| `--accent-cyan` | Category color option |
| `--accent-gray` | Uncategorized items |

### Shadows

| Token | Purpose |
|-------|---------|
| `--shadow-sm` | Subtle shadow |
| `--shadow-card` | Card shadow |
| `--shadow-elevated` | Modal/dropdown shadow |
| `--shadow-brand` | Brand button glow |

### Miscellaneous

| Token | Purpose |
|-------|---------|
| `--ring-offset` | Focus ring offset color (matches bg) |

---

## Adding a New Theme

### Step 1: Add CSS Variables

In `src/index.css`, add a new `[data-theme="your-theme-name"]` block after the existing themes:

```css
/* Your Custom Theme */
[data-theme="monokai"] {
  /* Backgrounds */
  --bg-base: #272822;
  --bg-surface: #2d2e27;
  --bg-card: #3e3d32;
  --bg-input: #3e3d32;
  --bg-hover: #49483e;
  --bg-active: #75715e;
  
  /* Text */
  --text-primary: #f8f8f2;
  --text-secondary: #a6a6a6;
  --text-muted: #75715e;
  --text-inverse: #272822;
  
  /* Borders */
  --border-default: #49483e;
  --border-muted: #3e3d32;
  --border-strong: #75715e;
  
  /* Brand - Monokai Green */
  --brand-primary: #a6e22e;
  --brand-primary-hover: #b8f332;
  --brand-muted: rgba(166, 226, 46, 0.15);
  --brand-text: #a6e22e;
  
  /* Accents - Monokai palette */
  --accent-blue: #66d9ef;
  --accent-blue-muted: rgba(102, 217, 239, 0.2);
  --accent-purple: #ae81ff;
  --accent-purple-muted: rgba(174, 129, 255, 0.2);
  --accent-amber: #e6db74;
  --accent-amber-muted: rgba(230, 219, 116, 0.2);
  --accent-red: #f92672;
  --accent-red-muted: rgba(249, 38, 114, 0.2);
  --accent-emerald: #a6e22e;
  --accent-emerald-muted: rgba(166, 226, 46, 0.2);
  --accent-pink: #f92672;
  --accent-cyan: #66d9ef;
  --accent-gray: #75715e;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 8px 24px -8px rgba(0, 0, 0, 0.5);
  --shadow-brand: 0 4px 14px -3px rgba(166, 226, 46, 0.3);
  
  /* Focus ring */
  --ring-offset: #272822;
}
```

### Step 2: Add Theme to TypeScript

In `src/App.tsx`, update the `Theme` type:

```typescript
type Theme = 'light' | 'dark' | 'monokai';
```

### Step 3: Add Theme Toggle UI (Optional)

If you want a theme selector instead of a toggle, update the sidebar button in `App.tsx`:

```tsx
<select 
  value={theme} 
  onChange={(e) => setTheme(e.target.value as Theme)}
  className="input px-4 py-2 rounded-xl"
>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="monokai">Monokai</option>
</select>
```

---

## Example Themes

### Gruvbox Dark

```css
[data-theme="gruvbox-dark"] {
  --bg-base: #282828;
  --bg-surface: #32302f;
  --bg-card: #3c3836;
  --bg-input: #3c3836;
  --bg-hover: #504945;
  --bg-active: #665c54;
  
  --text-primary: #ebdbb2;
  --text-secondary: #a89984;
  --text-muted: #665c54;
  --text-inverse: #282828;
  
  --border-default: #504945;
  --border-muted: #3c3836;
  --border-strong: #665c54;
  
  --brand-primary: #b8bb26;
  --brand-primary-hover: #98971a;
  --brand-muted: rgba(184, 187, 38, 0.15);
  --brand-text: #b8bb26;
  
  --accent-blue: #83a598;
  --accent-blue-muted: rgba(131, 165, 152, 0.2);
  --accent-purple: #d3869b;
  --accent-purple-muted: rgba(211, 134, 155, 0.2);
  --accent-amber: #fabd2f;
  --accent-amber-muted: rgba(250, 189, 47, 0.2);
  --accent-red: #fb4934;
  --accent-red-muted: rgba(251, 73, 52, 0.2);
  --accent-emerald: #b8bb26;
  --accent-emerald-muted: rgba(184, 187, 38, 0.2);
  --accent-pink: #d3869b;
  --accent-cyan: #8ec07c;
  --accent-gray: #928374;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-elevated: 0 8px 24px -8px rgba(0, 0, 0, 0.5);
  --shadow-brand: 0 4px 14px -3px rgba(184, 187, 38, 0.3);
  
  --ring-offset: #282828;
}
```

### Nord

```css
[data-theme="nord"] {
  --bg-base: #2e3440;
  --bg-surface: #3b4252;
  --bg-card: #434c5e;
  --bg-input: #434c5e;
  --bg-hover: #4c566a;
  --bg-active: #5e6779;
  
  --text-primary: #eceff4;
  --text-secondary: #d8dee9;
  --text-muted: #4c566a;
  --text-inverse: #2e3440;
  
  --border-default: #4c566a;
  --border-muted: #434c5e;
  --border-strong: #5e6779;
  
  --brand-primary: #a3be8c;
  --brand-primary-hover: #8fbcbb;
  --brand-muted: rgba(163, 190, 140, 0.15);
  --brand-text: #a3be8c;
  
  --accent-blue: #81a1c1;
  --accent-blue-muted: rgba(129, 161, 193, 0.2);
  --accent-purple: #b48ead;
  --accent-purple-muted: rgba(180, 142, 173, 0.2);
  --accent-amber: #ebcb8b;
  --accent-amber-muted: rgba(235, 203, 139, 0.2);
  --accent-red: #bf616a;
  --accent-red-muted: rgba(191, 97, 106, 0.2);
  --accent-emerald: #a3be8c;
  --accent-emerald-muted: rgba(163, 190, 140, 0.2);
  --accent-pink: #b48ead;
  --accent-cyan: #88c0d0;
  --accent-gray: #4c566a;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
  --shadow-elevated: 0 8px 24px -8px rgba(0, 0, 0, 0.4);
  --shadow-brand: 0 4px 14px -3px rgba(163, 190, 140, 0.25);
  
  --ring-offset: #2e3440;
}
```

---

## Tips for Creating Themes

1. **Start with a base**: Copy an existing theme (light or dark) as a starting point
2. **Ensure card separation**: `--bg-card` must differ from `--bg-surface` by ≥10 RGB units — this is the most common mistake
3. **Test contrast**: Ensure `--text-primary` on `--bg-card` has sufficient contrast (4.5:1 minimum)
4. **Muted variants**: Accent muted colors should be ~15-20% opacity of the main accent
5. **Shadows**: Darker themes need more opaque shadows; lighter themes need subtler ones
6. **Brand consistency**: Keep `--brand-primary` as your main accent color (green `#22c55e` by default)
7. **Forms use brand green**: `ItemForm.tsx` uses brand green for both bill and subscription forms — no type-specific color overrides

## Brand Color Usage

- **Brand primary**: `#22c55e` (light) / `#22c55e` (dark, same) — fill only
- **Brand hover**: `#16a34a` (light) / `#4ade80` (dark, lighter for visibility)
- **Brand text**: `#166534` (light) / `#4ade80` (dark) — green that carries words or icons
- **Brand on-primary**: `#171717` (both themes) — ink on a green fill
- **ItemForm**: Both bill and subscription forms use the green gradient — `linear-gradient(135deg, #22c55e 0%, #16a34a 100%)`
- Never use orange/amber as a form accent; that was removed in favor of consistent brand green

---

## Persisting Theme Preference

To persist the user's theme choice across sessions, update `App.tsx`:

```typescript
// Load saved theme on mount
const [theme, setTheme] = useState<Theme>(() => {
  const saved = localStorage.getItem('theme');
  return (saved as Theme) || 'dark';
});

// Save theme when changed
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
}, [theme]);
```

---

## Architecture Benefits

- **Single source of truth**: All colors in one CSS file
- **No component changes needed**: Add themes without touching React code
- **Easy customization**: Users could eventually provide their own CSS overrides
- **Performant**: CSS variables are native and fast
- **Future-proof**: Easy to add theme import/export features later
