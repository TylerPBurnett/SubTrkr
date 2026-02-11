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

## Semantic Tokens Reference

All tokens are defined in `src/index.css`. Here's what each one controls:

### Backgrounds

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--bg-base` | Main app background | Body, main content area |
| `--bg-surface` | Elevated surfaces | Sidebar, modals |
| `--bg-card` | Card backgrounds | Stats cards, list items |
| `--bg-input` | Form input backgrounds | Text fields, selects |
| `--bg-hover` | Hover state backgrounds | Button/list item hover |
| `--bg-active` | Active/pressed states | Button pressed state |

### Text

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--text-primary` | Main text color | Headings, body text |
| `--text-secondary` | De-emphasized text | Descriptions, labels |
| `--text-muted` | Very subtle text | Placeholders, disabled |
| `--text-inverse` | Text on brand colors | Button text on green bg |

### Borders

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--border-default` | Standard borders | Input borders, dividers |
| `--border-muted` | Subtle borders | Card borders |
| `--border-strong` | Emphasized borders | Focus states |

### Brand Colors

| Token | Purpose | Example Usage |
|-------|---------|---------------|
| `--brand-primary` | Main brand color (green) | Primary buttons, links |
| `--brand-primary-hover` | Brand hover state | Button hover |
| `--brand-muted` | Subtle brand background | Active nav item bg |
| `--brand-text` | Brand-colored text | Logo, active nav text |

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
2. **Test contrast**: Ensure `--text-primary` on `--bg-base` has sufficient contrast (4.5:1 minimum)
3. **Muted variants**: Accent muted colors should be ~15-20% opacity of the main accent
4. **Shadows**: Darker themes need more opaque shadows; lighter themes need subtler ones
5. **Brand consistency**: Keep `--brand-primary` as your main accent color (green by default)

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
