# Cross-Platform Native Window Vibrancy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add native OS-level window vibrancy (macOS Sidebar material, Windows Mica) so the sidebar and shell area show a frosted blur of the desktop, gated by both platform capability and user preference.

**Architecture:** Rust applies vibrancy in `.setup()` and signals success to the webview via `data-vibrancy-supported` on `<html>`. React syncs the user preference as `data-vibrancy` on `<html>`. CSS uses the compound selector `html[data-vibrancy-supported="true"][data-vibrancy="true"]` to make shell layers transparent only when both conditions are met. Unsupported platforms never get the attribute, so CSS stays opaque.

**Tech Stack:** Tauri 2, `window-vibrancy` 0.6 (already a transitive dep), React 19, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-25-cross-platform-vibrancy-design.md`

---

### Task 1: Add `window-vibrancy` dependency and Tauri config

**Files:**
- Modify: `src-tauri/Cargo.toml:20-36`
- Modify: `src-tauri/tauri.conf.json:12-25`

- [ ] **Step 1: Add `window-vibrancy` to Cargo.toml**

Add under `[dependencies]`, after the existing deps:

```toml
window-vibrancy = "0.6"
```

- [ ] **Step 2: Add `transparent` and `macOSPrivateApi` to tauri.conf.json**

Add `"transparent": true` to the window config, and `"macOSPrivateApi": true` to the `app` object:

```json
"app": {
  "macOSPrivateApi": true,
  "windows": [
    {
      "title": "",
      "width": 1280,
      "height": 800,
      "titleBarStyle": "Overlay",
      "hiddenTitle": true,
      "transparent": true
    }
  ],
  "security": {
    "csp": null
  }
}
```

- [ ] **Step 3: Verify Cargo resolves correctly**

Run: `cd /Users/tyler/Development/SubTrkr/src-tauri && cargo check 2>&1 | tail -20`
Expected: Compiles without errors. `window-vibrancy` 0.6 should resolve without conflict since it's already a transitive dep.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "feat: add window-vibrancy dep and enable transparent window"
```

---

### Task 2: Apply native vibrancy in Rust setup

**Files:**
- Modify: `src-tauri/src/lib.rs:322-345` (the `run()` function)

- [ ] **Step 1: Add vibrancy code inside `.setup()` closure**

In `lib.rs`, inside the `.setup(|app| { ... })` closure, after the deep link handler and before `Ok(())`, add:

```rust
            // Apply native window vibrancy (macOS / Windows)
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

The full `.setup()` block should look like:

```rust
        .setup(|app| {
            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                if let Some(window) = handle.get_webview_window("main") {
                    let _ = window.set_focus();
                }
                let _ = &event;
            });

            // Apply native window vibrancy (macOS / Windows)
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

            Ok(())
        })
```

- [ ] **Step 2: Add `Manager` import if not already present**

The existing code already has `use tauri::Manager;` inside `run()` — verify it's there. `get_webview_window` comes from `Manager`.

- [ ] **Step 3: Verify compilation**

Run: `cd /Users/tyler/Development/SubTrkr/src-tauri && cargo check 2>&1 | tail -20`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat: apply native vibrancy on macOS and Windows in setup"
```

---

### Task 3: Move `data-vibrancy` to `<html>` and remove inline style

**Files:**
- Modify: `src/App.tsx:74` (useVibrancy state), `src/App.tsx:560` (app-layout div)

- [ ] **Step 1: Add useEffect to sync `data-vibrancy` to `<html>`**

After the existing `useVibrancy` state declaration at line 74, add an effect:

```tsx
// Sync vibrancy preference to <html> for CSS selectors that need to reach body
useEffect(() => {
  document.documentElement.setAttribute('data-vibrancy', useVibrancy ? 'true' : 'false');
}, [useVibrancy]);
```

- [ ] **Step 2: Remove `data-vibrancy` and inline `style` from `.app-layout` div**

At line 560, change:

```tsx
<div className="app-layout h-screen flex" style={{ backgroundColor: 'var(--bg-base)' }} data-vibrancy={useVibrancy ? 'true' : 'false'}>
```

To:

```tsx
<div className="app-layout h-screen flex">
```

The `data-vibrancy` attribute is now on `<html>` (via useEffect). The `backgroundColor` fallback moves to the CSS `.app-layout` class (Task 4).

- [ ] **Step 3: Verify the app still renders**

Run: `cd /Users/tyler/Development/SubTrkr && bun run dev`
Expected: App renders. No white/blank background — the CSS `.app-layout` rule needs updating in Task 4, but `.app-shell` still has `background-color: var(--shell-surface)` which covers the viewport.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "refactor: move data-vibrancy to html element, remove inline bg style"
```

---

### Task 4: Rewrite vibrancy CSS with capability gate

**Files:**
- Modify: `src/index.css:366-368` (`.app-layout` class)
- Modify: `src/index.css:846-870` (glassmorphism section)

- [ ] **Step 1: Add fallback background to `.app-layout` class**

At line 366-368, change:

```css
.app-layout {
  padding: 0;
}
```

To:

```css
.app-layout {
  padding: 0;
  background-color: var(--bg-base);
}
```

This replaces the inline style that was removed in Task 3.

- [ ] **Step 2: Rewrite the glassmorphism/vibrancy section**

Replace the entire block at lines 846-870:

```css
/* ============================================
   GLASSMORPHISM & VIBRANCY
   ============================================ */
[data-vibrancy="true"].app-layout {
  background: var(--bg-base);
}

[data-vibrancy="true"] .sidebar {
  background-color: var(--bg-surface-translucent);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
}

[data-vibrancy="true"] .vibrant-header {
  background-color: var(--bg-surface-translucent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 1px solid var(--border-default);
}

/* Base opaque fallbacks */
.vibrant-header {
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
}
```

With this new block (base rules first, vibrancy overrides second, compound capability gate):

```css
/* ============================================
   GLASSMORPHISM & VIBRANCY
   ============================================ */

/* Base opaque styles (always applied) */
.vibrant-header {
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-default);
}

/* Native vibrancy overrides — only when OS vibrancy is active AND user has it enabled.
   On unsupported platforms (Linux, Windows 10, bun run dev), data-vibrancy-supported
   is never set, so these rules never match and backgrounds stay opaque. */
html[data-vibrancy-supported="true"][data-vibrancy="true"] body {
  background: transparent;
  transition: none; /* Prevent 200ms flash when toggling vibrancy */
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

- [ ] **Step 3: Verify in browser (bun run dev)**

Run: `cd /Users/tyler/Development/SubTrkr && bun run dev`
Expected: App looks normal — vibrancy rules don't match because `data-vibrancy-supported` isn't set in browser mode. All backgrounds are opaque.

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat: rewrite vibrancy CSS with platform capability gate"
```

---

### Task 5: Remove duplicate vibrancy toggle from AccountSettings

**Files:**
- Modify: `src/components/AccountSettings.tsx:1-15` (imports, props), `src/components/AccountSettings.tsx:79-103` (appearance section)
- Modify: `src/components/Settings.tsx:10-15` (props interface), `src/components/Settings.tsx:33` (component sig), `src/components/Settings.tsx:182` (AccountSettings usage), `src/components/Settings.tsx:755` (App.tsx pass-through check)

- [ ] **Step 1: Remove vibrancy props from AccountSettings**

In `src/components/AccountSettings.tsx`:

1. Remove `Switch` from the import (line 6):
```tsx
// Remove this line:
import { Switch } from './ui/Switch';
```

2. Remove the props interface and vibrancy props from the component signature (lines 10-15):
```tsx
// Change from:
interface AccountSettingsProps {
  useVibrancy: boolean;
  setUseVibrancy: (val: boolean | ((prev: boolean) => boolean)) => void;
}

export default function AccountSettings({ useVibrancy, setUseVibrancy }: AccountSettingsProps) {
```
```tsx
// Change to:
export default function AccountSettings() {
```

3. Remove the entire Appearance section and its divider (lines 79-103):

Remove from `{/* Divider */}` through the Appearance section closing `</div>` and the next `{/* Divider */}`:

```tsx
        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />

        {/* Appearance Section */}
        <div className="label mb-3">Appearance</div>
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Translucent Backgrounds
              </label>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Enable frosted glass effects on the sidebar and headers
              </p>
            </div>
            <Switch
              checked={useVibrancy}
              onCheckedChange={setUseVibrancy}
              aria-label="Toggle translucent backgrounds"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />
```

Replace with a single divider:

```tsx
        {/* Divider */}
        <div className="my-6" style={{ borderTop: '1px solid var(--border-default)' }} />
```

- [ ] **Step 2: Update Settings.tsx to stop passing vibrancy props to AccountSettings**

In `src/components/Settings.tsx`:

1. Line 182 — remove props from AccountSettings:
```tsx
// Change from:
{activeTab === 'account' ? <AccountSettings useVibrancy={useVibrancy} setUseVibrancy={setUseVibrancy} /> : null}
```
```tsx
// Change to:
{activeTab === 'account' ? <AccountSettings /> : null}
```

- [ ] **Step 3: Verify Settings tabs work**

Run: `cd /Users/tyler/Development/SubTrkr && bun run dev`
Expected: Appearance tab still has the vibrancy toggle. Account tab no longer has it. No TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/AccountSettings.tsx src/components/Settings.tsx
git commit -m "fix: remove duplicate vibrancy toggle from AccountSettings"
```

---

### Task 6: Build and test with Tauri

**Files:** None — this is a verification task.

- [ ] **Step 1: Run TypeScript type check**

Run: `cd /Users/tyler/Development/SubTrkr && bun run typecheck 2>&1 | tail -20` (or `npx tsc --noEmit` if no typecheck script)
Expected: No type errors.

- [ ] **Step 2: Build the Tauri app**

Run: `cd /Users/tyler/Development/SubTrkr && bun run tauri dev`
Expected: App launches with native vibrancy on macOS. The sidebar and shell area should show a frosted blur of the desktop. The main content panel should remain opaque with its card shadow/border.

- [ ] **Step 3: Test vibrancy toggle**

1. Go to Settings > Appearance
2. Toggle "Translucent Backgrounds" OFF — sidebar and shell should become opaque
3. Toggle it back ON — transparency returns
4. Switch between light and dark themes with vibrancy on — both should look correct

- [ ] **Step 4: Test `bun run dev` fallback (no Tauri)**

Run: `cd /Users/tyler/Development/SubTrkr && bun run dev`
Open in browser. Expected: App looks fully opaque. The vibrancy toggle in Settings is visible but has no visual effect (since `data-vibrancy-supported` is never set). No console errors.
