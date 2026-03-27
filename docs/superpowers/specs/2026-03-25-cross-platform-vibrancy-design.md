# Cross-Platform Native Window Vibrancy

## Goal

Replace the current CSS-only translucency (which blurs a solid color, producing no visible effect) with real OS-level window vibrancy on macOS and Windows. The sidebar and shell area (the region surrounding the main content panel) become truly transparent with native blur, while the main content panel stays opaque as the elevated surface. Unsupported platforms fall back to opaque styling automatically via a capability gate.

## Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│  OS desktop / wallpaper                     │
│  ┌───────────────────────────────────────┐  │
│  │  Tauri window (transparent)           │  │
│  │  ┌─────┬─────────────────────────┐    │  │
│  │  │ S   │  .main-content (opaque) │    │  │
│  │  │ I   │  ┌───────────────────┐  │    │  │
│  │  │ D   │  │ Cards, content    │  │    │  │
│  │  │ E   │  │                   │  │    │  │
│  │  │ B   │  └───────────────────┘  │    │  │
│  │  │ A   │                         │    │  │
│  │  │ R   │                         │    │  │
│  │  └─────┴─────────────────────────┘    │  │
│  │  ↑ native blur shows through here     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

The transparent areas are: `body`, `.app-layout`, `.app-shell`, `.sidebar`. The `.main-content` panel remains opaque with its existing border-radius, border, and shadow — it floats above the vibrancy layer.

### Capability gate (P1 fix)

CSS transparency must only activate when native vibrancy is actually working, not just when the user preference is on. Otherwise, on unsupported platforms (Linux, Windows 10), the CSS makes everything transparent while no OS blur is behind it — exposing a bare desktop/webview background.

**Approach**: Two `data-` attributes on `<html>`, both required for transparent CSS:

- `data-vibrancy-supported` — set by Rust after vibrancy is successfully applied
- `data-vibrancy` — set by React based on user preference

CSS selector: `html[data-vibrancy-supported="true"][data-vibrancy="true"]` — transparent styles only activate when the OS effect is confirmed active AND the user wants it.

**Rust sets `data-vibrancy-supported`**: After successfully calling `apply_vibrancy`/`apply_mica`, the Rust setup evaluates JS on the webview to set the attribute:

```rust
window.eval("document.documentElement.setAttribute('data-vibrancy-supported', 'true')")
    .unwrap_or_default();
```

If the platform call fails or isn't attempted (Linux), the attribute is never set, and CSS stays opaque regardless of `data-vibrancy`.

**React sets `data-vibrancy`**: An effect syncs the user preference to `<html>`:

```tsx
useEffect(() => {
  document.documentElement.setAttribute('data-vibrancy', useVibrancy ? 'true' : 'false');
}, [useVibrancy]);
```

### Rust: `window-vibrancy` crate

`window-vibrancy = "0.6"` is already a transitive dependency of Tauri 2 (confirmed in `Cargo.lock` at line 4975). Add it as an explicit dependency in `src-tauri/Cargo.toml` to use its API directly.

In `lib.rs`, add vibrancy inside the existing `.setup()` closure (idiomatic for Tauri 2 window setup). Use `if let Some(window)` to avoid panicking if the window lookup fails:

```rust
// Inside .setup(|app| { ... }), after existing deep link code:

if let Some(window) = app.get_webview_window("main") {
    #[cfg(target_os = "macos")]
    {
        use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};
        if apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None).is_ok() {
            let _ = window.eval(
                "document.documentElement.setAttribute('data-vibrancy-supported', 'true')"
            );
        }
    }

    #[cfg(target_os = "windows")]
    {
        use window_vibrancy::apply_mica;
        if apply_mica(&window, None).is_ok() {
            let _ = window.eval(
                "document.documentElement.setAttribute('data-vibrancy-supported', 'true')"
            );
        }
    }
}
```

No Linux block needed — the crate isn't called, `data-vibrancy-supported` is never set, CSS stays opaque.

### Tauri config

In `src-tauri/tauri.conf.json`:

1. Add `"transparent": true` to the window object:

```json
"windows": [{
  "title": "",
  "width": 1280,
  "height": 800,
  "titleBarStyle": "Overlay",
  "hiddenTitle": true,
  "transparent": true
}]
```

2. Add `"macOSPrivateApi": true` to the `app` object:

```json
"app": {
  "macOSPrivateApi": true,
  ...
}
```

**Why `macOSPrivateApi`**: On macOS, Tauri's `transparent: true` requires this flag to enable the underlying private API for window transparency. This flag makes the app ineligible for the Mac App Store. SubTrkr distributes directly via GitHub releases + Tauri updater, so this is not a concern. If App Store distribution is ever needed, vibrancy would need to be gated behind a build flag.

### CSS changes

All vibrancy selectors use the compound gate: `html[data-vibrancy-supported="true"][data-vibrancy="true"]`. Abbreviated as `html[dvs][dv]` below for readability.

**Base styles** (always applied, opaque):

```css
/* Move fallback background from inline style to class */
.app-layout {
  padding: 0;
  background-color: var(--bg-base);
}

/* Sticky header base */
.vibrant-header {
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
}
```

**Vibrancy-enabled overrides** (only when OS vibrancy confirmed + user wants it):

```css
html[data-vibrancy-supported="true"][data-vibrancy="true"] body {
  background: transparent;
}

html[data-vibrancy-supported="true"][data-vibrancy="true"] .app-layout {
  background: transparent;
}

html[data-vibrancy-supported="true"][data-vibrancy="true"] .app-shell {
  background-color: transparent;
}

html[data-vibrancy-supported="true"][data-vibrancy="true"] .sidebar {
  background: transparent;
}

html[data-vibrancy-supported="true"][data-vibrancy="true"] .vibrant-header {
  background-color: var(--bg-surface-translucent);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--border-default);
}
```

**Key point**: The sidebar and shell go fully `transparent` — the native OS vibrancy provides the blur/tint. The sticky header keeps a CSS `backdrop-filter` because it overlaps scrollable content within the webview.

**Cleanup**:
- Remove the current `[data-vibrancy="true"] .sidebar` rule with `backdrop-filter`
- Remove the old `[data-vibrancy="true"].app-layout` rule
- Reorder CSS: base/fallback rules first, vibrancy overrides second
- The `.main-content` panel is never affected by vibrancy — it stays opaque

### Translucent token adjustments

The existing tokens are fine for the sticky header tint:
- Light: `--bg-surface-translucent: rgba(237, 238, 242, 0.45)`
- Dark: `--bg-surface-translucent: rgba(19, 20, 21, 0.45)`

No new tokens needed.

### React changes

**Remove inline style on `.app-layout`**: In `App.tsx`, the root div has `style={{ backgroundColor: 'var(--bg-base)' }}` which overrides CSS regardless of specificity. Remove this and move the fallback to the `.app-layout` CSS class.

**Sync `data-vibrancy` to `<html>`**: Replace the `data-vibrancy` attribute on the `.app-layout` div with a `useEffect` that sets it on `document.documentElement`. This allows CSS selectors to reach `body` and all descendants.

**Remove duplicate toggle**: Delete the "Appearance" section from `AccountSettings.tsx`, remove the `useVibrancy`/`setUseVibrancy` props. Keep the toggle only in the `Settings.tsx` Appearance tab.

## Affected files

| File | Change |
|------|--------|
| `src-tauri/Cargo.toml` | Add explicit `window-vibrancy = "0.6"` dependency |
| `src-tauri/tauri.conf.json` | Add `"transparent": true` to window, `"macOSPrivateApi": true` to app |
| `src-tauri/src/lib.rs` | Apply platform vibrancy in `.setup()`, set `data-vibrancy-supported` on success |
| `src/index.css` | Rewrite vibrancy CSS with compound capability gate, move `.app-layout` bg to class |
| `src/App.tsx` | Remove inline bg style, sync `data-vibrancy` to `<html>` via useEffect |
| `src/components/AccountSettings.tsx` | Remove duplicate vibrancy toggle + unused props |
| `src/components/Settings.tsx` | Remove vibrancy props from AccountSettings usage |

## What stays the same

- `.main-content` — opaque, elevated card with border-radius, shadow, border
- Theme tokens — all existing `--bg-*`, `--shell-*` values untouched
- State management — `useLocalStorage('subtrkr-vibrancy', true)` + `data-vibrancy` attribute
- The Settings Appearance tab toggle UI

## Platform behavior matrix

| Platform | Vibrancy ON | Vibrancy OFF |
|----------|-------------|--------------|
| macOS | `apply_vibrancy` succeeds → `data-vibrancy-supported=true` set → CSS goes transparent, native blur visible | `data-vibrancy=false` → CSS stays opaque, native blur hidden |
| Windows 11 | `apply_mica` succeeds → same as macOS | Same as macOS OFF |
| Windows 10 | `apply_mica` fails → `data-vibrancy-supported` never set → CSS stays opaque regardless of toggle | CSS opaque |
| Linux | No vibrancy call → `data-vibrancy-supported` never set → CSS stays opaque regardless of toggle | CSS opaque |
| `bun run dev` (no Tauri) | No Rust setup runs → `data-vibrancy-supported` never set → CSS stays opaque | CSS opaque |

## Testing

### macOS (primary target)
- Toggle vibrancy on/off in Settings > Appearance — backgrounds switch between transparent (native blur visible) and opaque
- Verify main content panel always stays opaque with its shadow/border
- Verify sidebar text remains readable over vibrancy
- Verify sticky header blur works when scrolling content
- Test light and dark themes with vibrancy on
- Verify window drag region still works in transparent areas

### Windows 11
- Verify Mica effect applies and CSS goes transparent
- Verify toggle on/off works correctly
- Verify light/dark theme switching with vibrancy

### Windows 10 / Linux / `bun run dev`
- Verify vibrancy toggle has no visual effect (CSS stays opaque)
- Verify the toggle is still visible in Settings (not hidden) but simply inert
- Verify no console errors or panics on startup

### Edge cases
- App startup with `subtrkr-vibrancy` localStorage set to `true` on a supported platform — vibrancy should apply immediately without flash of opaque
- App startup with `subtrkr-vibrancy` set to `true` on unsupported platform — should remain opaque, no transparent flash
- Theme switch while vibrancy is active — translucent tokens should update correctly
