# UI Container Style Notes

This file documents the shell/container styling changes made during the Dribbble-inspired UI pass, and how to restore the original look quickly.

## Current Look (Dribbble-Inspired)

- Sidebar is fixed/non-draggable.
- Layout uses a shared shell wrapper (`app-layout` + `app-shell`).
- Main panel floats over shell surface with rounded corners and shadow.
- Sidebar gradient is currently toggled **off** (flat).

Files:
- `src/App.tsx`
- `src/index.css`

## Fast Toggle: Sidebar Gradient

Location:
- `src/index.css` in `.sidebar`

Current state is OFF:

```css
/* Toggle ON for gradient look:
background:
  radial-gradient(95% 140% at 18% 4%, var(--sidebar-ambient) 0%, transparent 58%),
  var(--shell-surface);
*/
background: var(--shell-surface); /* Toggle OFF (flat sidebar) */
```

## Restore Original Container Look (Pre-Dribbble Shell)

### 1) Restore Layout Structure in `src/App.tsx`

Replace:

```tsx
<div className="app-layout h-screen flex" ...>
  <div className="app-shell flex w-full h-screen">
```

with:

```tsx
<div className="min-h-screen flex" ...>
```

Then:

- Remove the extra `app-shell` wrapper closing tag (`</div>`) that wraps sidebar + main.
- Set sidebar class back to:

```tsx
<aside className="sidebar w-64 h-screen flex flex-col">
```

- Replace sidebar top spacer:

```tsx
<div className="h-12 shrink-0" />
```

with draggable title bar:

```tsx
<div
  data-tauri-drag-region
  className="h-12 shrink-0"
  style={{
    WebkitAppRegion: 'drag'
  } as React.CSSProperties}
/>
```

- Set main class back to:

```tsx
<main className="main-content flex-1 h-screen flex flex-col">
```

- In bottom sidebar controls, restore top border token:

```tsx
style={{ borderTop: '1px solid var(--border-default)' }}
```

### 2) Restore Container CSS in `src/index.css`

Replace the current shell/sidebar/main block with this original block:

```css
/* Sidebar */
.sidebar {
  background-color: var(--bg-surface);
  border-right: 1px solid var(--border-default);
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

/* Main content area */
.main-content {
  background-color: var(--bg-base);
  transition: background-color 0.2s ease;
}
```

Also remove these helper blocks if present:

```css
.app-layout { ... }
.app-shell { ... }
```

### 3) Optional Token Cleanup

These tokens were added for the Dribbble container treatment and can be removed if you fully revert:

- `--shell-surface`
- `--sidebar-ambient`
- `--shell-divider`
- `--main-panel-border`
- `--main-panel-shadow`

## Reuse Prompt for Codex

If you want this reverted later, use:

`Use docs/completed/UI_CONTAINER_STYLE_NOTES.md and restore the pre-Dribbble container look exactly.`
