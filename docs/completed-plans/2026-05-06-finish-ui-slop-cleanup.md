# Finish UI Slop Cleanup — Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking. Each task is one commit. Verify visually in dev server between tasks. If a commit looks wrong, `git revert` it before proceeding.

**Goal:** Remove the remaining "AI-generated" visual tells from SubTrkr — rainbow gradients, uppercase tracked-out labels, blur halos, and heavy display weights — and shift typography toward an Apple-native system font stack.

**Architecture:** Pure CSS / styling work. No behavior changes, no new tests. Each task is a single commit on the existing `claude/frosty-golick-1f2caa` branch. Verification is visual via the local Vite preview at port 1420.

**Tech Stack:** Tailwind v4, CSS custom properties, React 19. No new dependencies.

---

## File Map

| File | What changes |
|---|---|
| `src/index.css` | Font stack tokens (`--font-display`, `--font-body`, `--font-mono`); remove `@import` for Archivo |
| `src/components/StatusChangeDialog.tsx` | Strip `gradient` + `glowColor` from per-action config; replace gradient chrome with solid color + accent border; remove uppercase + tracking from `.status-dialog-label` and `.status-dialog-button`; trim header weight 800→700 |
| `src/components/Analytics.tsx` | Remove `textTransform: uppercase` + `letterSpacing: 0.08em` from tooltip headings (lines 295-298, 354-356) and chart axis (845) |
| `src/components/ui/GlowDonutChart.tsx` | Remove uppercase + 0.06em letterspacing from center label (494-495) |
| `src/components/ui/EmptyState.tsx` | Drop `blur-2xl` halo (29-35); replace 135deg gradient icon backplate (39) with brand-light fill; trim `fontWeight: 800` (50) to 700 |
| `src/components/Settings.tsx` | Drop `blur-2xl` ambient glow under tabs (130-138) |
| `src/components/StatusHistoryDialog.tsx` | Replace 135deg gradient icon backplate (160-162) with brand-light fill; trim `fontWeight: 800` (170) to 700 |
| `src/components/item-form/ItemFormPreviewCard.tsx` | Replace conditional `linear-gradient(135deg, ...)` background (30-32) with solid fill |
| `src/components/AuthScreen.tsx` | Drop `letterSpacing: 0.5em` (360); trim `fontWeight: 800` (881); replace `tracking-wider` (747) |
| `src/components/ui/calendar.tsx` | Remove `uppercase tracking-wider` from weekday header (34) |

---

## Task 1: Switch font stack to system fonts

**Why first:** Sets the typography baseline for every other change. If SF Pro renders badly in Tauri WebKit, you want to know now before touching dialog/analytics chrome that depends on the same display font.

**Files:**
- Modify: `src/index.css:1` (drop Archivo from Google Fonts import)
- Modify: `src/index.css:313-315` (font tokens)

- [ ] **Step 1: Update font tokens**

In `src/index.css`, change line 1 from:

```css
@import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap");
```

to:

```css
@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap");
```

In `src/index.css`, change lines 313-315 from:

```css
  --font-display: "Archivo", -apple-system, "Segoe UI", sans-serif;
  --font-body: "Inter", -apple-system, "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
```

to:

```css
  --font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", system-ui, sans-serif;
  --font-body: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", monospace;
```

- [ ] **Step 2: Boot dev server and eyeball dashboard**

```sh
# Server is already running on 1420 — open http://localhost:1420
```

Sign in. Confirm: dashboard heading, metric card labels, sidebar nav text, and body copy all render with SF Pro on macOS. Fonts should look slightly narrower / cleaner than before, especially at large display sizes.

- [ ] **Step 3: Hard-coded `'Archivo'` references**

Some components hard-code the family name in inline `<style>` blocks instead of using `--font-display`. These will fall through to system-ui automatically once Archivo is no longer loaded, but the references should still be cleaned up. They get touched in later tasks (StatusChangeDialog, ItemForm) — not this commit.

- [ ] **Step 4: Decide**

If SF Pro looks right → commit and continue.
If it looks wrong on your machine → `git checkout -- src/index.css` and stop. Re-evaluate the direction.

- [ ] **Step 5: Commit**

```sh
git add src/index.css
git commit -m "style: swap Archivo for system font stack (SF Pro on Apple, Inter fallback)"
```

---

## Task 2: De-rainbow StatusChangeDialog

**Why next:** Single biggest remaining slop pocket. Eight rainbow gradients + 9 uppercase mono spots in one file. After this commit the dialog should feel like a stock iOS sheet.

**Files:**
- Modify: `src/components/StatusChangeDialog.tsx`

- [ ] **Step 1: Strip `gradient` + `glowColor` from per-action config**

Lines 118-191 define `config = { pause: {...}, cancel: {...}, ... }`. Each action has a `gradient` and `glowColor` field. Delete both fields from all 8 action configs. Keep `icon`, `verb`, `title`, `textColor`, and `message`.

- [ ] **Step 2: Update modal shadow (lines 454-458)**

Replace:

```tsx
            boxShadow: `
              0 0 0 1px rgba(0, 0, 0, 0.1),
              0 20px 60px -10px ${currentConfig.glowColor},
              0 40px 100px -20px rgba(0, 0, 0, 0.4)
            `,
```

with:

```tsx
            boxShadow: 'var(--shadow-floating)',
```

- [ ] **Step 3: Replace colored header bar (lines 466-473)**

Delete the entire `{/* Colored header bar */}` div. Just remove it — the header below provides plenty of structure.

- [ ] **Step 4: Replace gradient icon backplate (lines 479-488)**

Replace:

```tsx
                <div
                  style={{
                    background: currentConfig.gradient,
                    boxShadow: `0 8px 24px ${currentConfig.glowColor}`,
                    borderRadius: '14px',
                    padding: '14px',
                  }}
                >
                  <Icon className="w-7 h-7" style={{ color: 'white', strokeWidth: 2.5 }} />
                </div>
```

with:

```tsx
                <div
                  style={{
                    background: `color-mix(in srgb, ${currentConfig.textColor} 14%, transparent)`,
                    boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${currentConfig.textColor} 24%, transparent)`,
                    borderRadius: '14px',
                    padding: '14px',
                    color: currentConfig.textColor,
                  }}
                >
                  <Icon className="w-7 h-7" style={{ strokeWidth: 2 }} />
                </div>
```

- [ ] **Step 5: Replace info banner gradient (lines 580-584)**

Replace:

```tsx
            <div
              className="mb-6 p-5 rounded-2xl status-dialog-field"
              style={{
                background: `linear-gradient(135deg, ${currentConfig.glowColor}, transparent)`,
                border: `1px solid ${currentConfig.textColor}20`,
              }}
            >
```

with:

```tsx
            <div
              className="mb-6 p-5 rounded-2xl status-dialog-field"
              style={{
                background: 'var(--bg-hover)',
                border: '1px solid var(--border-default)',
              }}
            >
```

- [ ] **Step 6: Replace submit button gradient (lines 813-820)**

Replace:

```tsx
                style={{
                  background: currentConfig.gradient,
                  color: 'white',
                  border: 'none',
                  boxShadow: `0 4px 16px ${currentConfig.glowColor}`,
                  opacity: isSubmitting ? 0.7 : 1,
                }}
```

with:

```tsx
                style={{
                  background: currentConfig.textColor,
                  color: 'white',
                  border: 'none',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
```

- [ ] **Step 7: Trim inline `<style>` block**

In the inline `<style>` block (lines ~340-417), make these edits:

Line 340 (in `.status-dialog-modal`): remove `font-family: 'Archivo', ...;` — let it inherit `--font-display`.

Line 344 (in `.status-dialog-header`): remove `font-family: 'Archivo', sans-serif;`. Change `font-weight: 800;` to `font-weight: 700;`.

Lines 394-401 (in `.status-dialog-button`): remove `font-family: 'Archivo', sans-serif;`, `letter-spacing: 0.02em;`, `text-transform: uppercase;`. Change `font-weight: 700` to `font-weight: 600`.

Lines 411-417 (in `.status-dialog-label`): remove `font-family: 'Archivo', sans-serif;`, `text-transform: uppercase;`, `letter-spacing: 0.08em;`. Change `font-size: 0.6875rem;` to `font-size: 0.8125rem;`. Change `font-weight: 600;` to `font-weight: 500;`.

- [ ] **Step 8: Convert hard-coded "OPTIONAL" labels**

Search for `>OPTIONAL<` in the file. There are several `<span>` tags rendering uppercase "OPTIONAL" hints next to labels (line 601 is one). Change each to title case "Optional".

- [ ] **Step 9: Visual verify**

Open the app. From any item, trigger Pause, then Cancel, then (if available) Convert. Confirm:
- No gradient chrome anywhere
- Icon backplate is a soft tinted square, not a saturated gradient
- Button labels are sentence case, not UPPERCASE
- Submit button is the action's solid color (red for cancel, amber for pause, etc.) without a colored shadow halo

- [ ] **Step 10: Commit**

```sh
git add src/components/StatusChangeDialog.tsx
git commit -m "style: de-rainbow status dialog and switch chrome to neutral surfaces"
```

---

## Task 3: Calm Analytics tooltips and chart axes

**Files:**
- Modify: `src/components/Analytics.tsx`
- Modify: `src/components/ui/GlowDonutChart.tsx`

- [ ] **Step 1: Analytics.tsx — projection tooltip header (lines 295-298)**

Replace:

```tsx
        style={{
          color: 'var(--text-secondary)',
          fontFamily: 'Inter, -apple-system, sans-serif',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: '8px',
          textTransform: 'uppercase',
        }}
```

with:

```tsx
        style={{
          color: 'var(--text-secondary)',
          fontSize: '12px',
          fontWeight: 500,
          marginBottom: '8px',
        }}
```

- [ ] **Step 2: Analytics.tsx — category tooltip header (lines 348-358)**

Find the matching block in `CategoryTooltip`. Apply the same edit: drop `fontFamily`, drop `letterSpacing`, drop `textTransform`, change `fontSize: '11px'` to `'12px'`, change `fontWeight: 700` to `500`.

- [ ] **Step 3: Analytics.tsx — chart X-axis (line 845)**

Replace:

```tsx
                  style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
```

with: just remove the `style` prop entirely. Also change `fontWeight={600}` (line 843) to `fontWeight={500}` and `fontFamily="Inter, -apple-system, sans-serif"` to `fontFamily="var(--font-body)"` (or remove since the chart inherits).

- [ ] **Step 4: GlowDonutChart.tsx — center label (lines 489-498)**

Read the file first; find the small label above the center value. Remove `textTransform: 'uppercase'` and `letterSpacing: '0.06em'`. Adjust font-size up by ~2px to compensate for the lower visual weight of sentence case.

- [ ] **Step 5: Visual verify**

Open Analytics view. Hover a chart point — tooltip header should be sentence case, not "JANUARY 2026". Center value of donut chart (Dashboard) should also be calm sentence case.

- [ ] **Step 6: Commit**

```sh
git add src/components/Analytics.tsx src/components/ui/GlowDonutChart.tsx
git commit -m "style: drop uppercase tracked headings from analytics tooltips and charts"
```

---

## Task 4: Remove glow halos

**Files:**
- Modify: `src/components/ui/EmptyState.tsx`
- Modify: `src/components/Settings.tsx`
- Modify: `src/components/StatusHistoryDialog.tsx`
- Modify: `src/components/item-form/ItemFormPreviewCard.tsx`

- [ ] **Step 1: EmptyState — drop blur halo and gradient backplate (lines 26-45)**

Replace the entire icon block:

```tsx
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
```

with:

```tsx
      <div className={`relative ${iconMargin}`}>
        <div
          className={`relative ${iconSize} ${iconRadius} flex items-center justify-center`}
          style={{
            background: 'var(--bg-hover)',
            color: 'var(--text-secondary)',
          }}
        >
          <Icon className={innerIconSize} />
        </div>
      </div>
```

- [ ] **Step 2: EmptyState — trim title weight (line 50)**

Change `fontWeight: compact ? 700 : 800` to `fontWeight: compact ? 600 : 700`.

- [ ] **Step 3: Settings — drop ambient glow (lines 129-138)**

Delete the entire `{/* Ambient glow beneath tabs */}` div. Also remove the now-unused `--settings-tab-ambient-opacity` tokens from index.css if no other consumer remains (grep first).

- [ ] **Step 4: StatusHistoryDialog — neutral icon backplate (lines 158-165)**

Replace:

```tsx
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background:
                  'linear-gradient(135deg, var(--brand-primary-light), rgba(59, 130, 246, 0.12))',
              }}
            >
              <History className="w-7 h-7" style={{ color: 'var(--brand-primary)' }} />
            </div>
```

with:

```tsx
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'var(--bg-hover)',
                color: 'var(--brand-primary)',
              }}
            >
              <History className="w-7 h-7" />
            </div>
```

Also on line 170, change `fontWeight: 800` to `fontWeight: 700`.

- [ ] **Step 5: ItemFormPreviewCard — drop conditional gradient (lines 27-41)**

Replace:

```tsx
      style={{
        background: formData.name.trim()
          ? `linear-gradient(135deg, ${config.glowColor}, transparent)`
          : 'var(--bg-hover)',
        border: `1px solid ${
          formData.name.trim()
            ? itemType === 'bill'
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(34, 197, 94, 0.2)'
            : 'var(--border-default)'
        }`,
        opacity: formData.name.trim() ? 1 : 0.7,
      }}
```

with:

```tsx
      style={{
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-default)',
        opacity: formData.name.trim() ? 1 : 0.7,
      }}
```

- [ ] **Step 6: Visual verify**

- Empty states: any view with no data (analytics with no items, dashboard with no items) — icon is a soft monochrome chip
- Settings: tabs have no glowing halo underneath
- Item history: dialog header icon is a calm tinted square
- ItemForm preview card: no gradient backdrop, just neutral surface

- [ ] **Step 7: Commit**

```sh
git add src/components/ui/EmptyState.tsx src/components/Settings.tsx src/components/StatusHistoryDialog.tsx src/components/item-form/ItemFormPreviewCard.tsx
git commit -m "style: remove glow halos and gradient icon backplates from empty/preview surfaces"
```

---

## Task 5: Final tracking and weight polish

**Files:**
- Modify: `src/components/AuthScreen.tsx`
- Modify: `src/components/ui/calendar.tsx`
- Modify: `src/components/ui/EmptyState.tsx` (one more pass — `class label` if used)

- [ ] **Step 1: AuthScreen — kill 0.5em letterspacing (line 360)**

Find the inline `letterSpacing: '0.5em'`. Remove the entire `style` prop or just the `letterSpacing` entry — likely a divider/decoration that looked like display lettering. Sentence case at normal tracking.

- [ ] **Step 2: AuthScreen — kill `tracking-wider` (line 747)**

In `<div className="relative flex justify-center text-xs font-semibold tracking-wider">` change to `text-xs font-medium`. Drop tracking and uppercase if present.

- [ ] **Step 3: AuthScreen — trim 800 weight (line 881)**

Change `fontWeight: 800` to `fontWeight: 700`. Keep the `letterSpacing: -0.03em` — that's display tightening, not slop.

- [ ] **Step 4: calendar.tsx — sentence-case weekdays (line 34)**

Change `weekday: "w-9 font-medium text-[0.7rem] uppercase tracking-wider opacity-50"` to `weekday: "w-9 font-medium text-[0.75rem] opacity-60"`. (Mon, Tue, Wed look better than MON, TUE, WED at small sizes anyway.)

- [ ] **Step 5: Visual verify**

- Auth screen: no spaced-out display copy, no UPPERCASE divider
- Date pickers (used in StatusChangeDialog and ItemForm): weekday header is "Mon Tue Wed", normal tracking

- [ ] **Step 6: Commit**

```sh
git add src/components/AuthScreen.tsx src/components/ui/calendar.tsx
git commit -m "style: drop final uppercase-tracked labels and 800-weight display copy"
```

---

## Final smoke test

- [ ] **Run `/smoke`**

```sh
# Dev server should still be on 1420
/smoke
```

If smoke passes, the branch is mergeable. If anything looks wrong, `git revert <commit-sha>` the offending task. The commits are independent enough that any one can be removed without breaking others.

- [ ] **Push and merge**

```sh
git push -u origin claude/frosty-golick-1f2caa
# open PR, merge
```

---

## What this plan deliberately doesn't do

- **Spacing audit** (snap arbitrary `rem` values to 4/8/12/16/20/24/32 scale). Touches too many files for a single coherent commit; deserves its own PR if you want it.
- **Inline letterspacing 0.005-0.02em sweep** in SearchFilterToolbar. Sub-0.02em tracking is barely visible and isn't an AI tell — leaving it.
- **Color token simplification.** The 90% neutral / 10% accent rule is enforced by the changes above (dialog, charts, empty states). A broader sweep would touch ItemList row hovers, sidebar nav, and a dozen other places — separate PR if you want.
- **Border-width consistency follow-up.** Already settled in commit `8971201`.
