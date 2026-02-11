# Plan: Replace Search/Filter with shadcn/ui Components

## Summary

Install shadcn/ui into the project, bridge its theming to the existing CSS custom properties, and extract the inline search/filter UI from `ItemList.tsx` into a composable `SearchFilterToolbar` component built with shadcn primitives. Style with tweakcn to match the "Financial Precision meets Soft Brutalism" design language.

---

## Phase 1: shadcn/ui Setup

### 1.1 Add path aliases

**`tsconfig.json`** -- add `baseUrl` and `paths` to `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

**`vite.config.ts`** -- add `resolve.alias`:
```ts
import path from "path";
// inside defineConfig:
resolve: { alias: { "@": path.resolve(__dirname, "./src") } }
```

Install `@types/node` as a devDep for the `path` import.

### 1.2 Run `npx shadcn@latest init`

- Style: **new-york**
- Base color: **neutral**
- CSS variables: **yes**
- RSC: **no** (Tauri app, not Next.js)

This creates `components.json` and `src/lib/utils.ts` (the `cn` helper), and installs `clsx` + `tailwind-merge`.

### 1.3 Install `tw-animate-css`

Add `@import "tw-animate-css";` to the top of `src/index.css` (before `@import "tailwindcss"`). Check for class name collisions with existing custom animations (`.animate-in`, `.zoom-in-95`); rename any conflicts.

### 1.4 Bridge CSS variables

Add shadcn-expected variables alongside existing tokens in **both** `:root` and `[data-theme="dark"]` blocks in `src/index.css`. Key mappings:

| shadcn var | Light value (from existing token) | Dark value |
|---|---|---|
| `--background` | `#f5f5f5` (--bg-base) | `#0a0a0a` |
| `--foreground` | `#171717` (--text-primary) | `#fafafa` |
| `--card` / `--card-foreground` | `#ffffff` / `#171717` | `#1c1c1c` / `#fafafa` |
| `--popover` / `--popover-foreground` | `#ffffff` / `#171717` | `#171717` / `#fafafa` |
| `--primary` / `--primary-foreground` | `#22c55e` / `#ffffff` | `#22c55e` / `#171717` |
| `--secondary` / `--secondary-foreground` | `#f5f5f5` / `#525252` | `#262626` / `#a3a3a3` |
| `--muted` / `--muted-foreground` | `#f5f5f5` / `#a3a3a3` | `#262626` / `#525252` |
| `--accent` / `--accent-foreground` | `#f0fdf4` / `#166534` | `rgba(34,197,94,0.15)` / `#4ade80` |
| `--destructive` | `#ef4444` | `#f87171` |
| `--border` / `--input` | `#e5e5e5` | `#2e2e2e` |
| `--ring` | `#22c55e` | `#22c55e` |
| `--radius` | `0.75rem` | `0.75rem` |

Also add `.dark` as a duplicate selector alongside `[data-theme="dark"]` so shadcn's dark mode utilities work.

### 1.5 Extend `@theme inline` block

Change `@theme` to `@theme inline` and add `--color-*` mappings so Tailwind v4 utility classes like `bg-primary`, `text-muted-foreground` resolve to the CSS variables.

---

## Phase 2: Install shadcn Components

```
npx shadcn@latest add input button popover select checkbox badge separator
```

| Component | Purpose |
|---|---|
| **Input** | Search text field |
| **Button** | Filter toggle, clear filters, future action buttons |
| **Popover** | Filter dropdown (replaces manual `filtersOpen` state + fixed overlay) |
| **Select** | Category filter (replaces native `<select>`) |
| **Checkbox** | Status toggles (show paused / show cancelled) |
| **Badge** | Active filter count on the filter button |
| **Separator** | Divider between filter sections |

**Not installing Command (cmdk)** -- overkill for simple substring search. Can add later if fuzzy search / keyboard shortcuts are wanted.

---

## Phase 3: tweakcn Styling

1. Visit [tweakcn.com/editor/theme](https://tweakcn.com) and configure primary to `#22c55e`, radius to `0.75rem`, match neutral palette
2. Export CSS and merge into `src/index.css` variable blocks
3. Customize installed shadcn component files to match design language:
   - **Input**: 2px border, lift-on-focus effect, green focus shadow
   - **Button**: hover lift (`translateY(-1px)`), active press, brand shadow on primary variant
   - **Popover**: match existing `.dropdown` slide animation, `--shadow-elevated`
   - **Checkbox**: green checked state, 2px border
   - **Select**: match `.input` styling, mono font for trigger text

---

## Phase 4: Create `SearchFilterToolbar` Component

**New file: `src/components/SearchFilterToolbar.tsx`**

Architecture:
```
<SearchFilterToolbar>
  <SearchInput />           -- shadcn Input + Search icon
  <FilterPopover>           -- shadcn Popover wrapping Button trigger
    <CategorySelect />      -- shadcn Select
    <Separator />
    <StatusCheckboxes />    -- shadcn Checkbox x2
    <Separator />
    <ClearFiltersButton />  -- shadcn Button (ghost)
  </FilterPopover>
  {children}                -- slot for future toolbar items
</SearchFilterToolbar>
```

**Props interface:**
```ts
interface SearchFilterToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  showPaused: boolean;
  onShowPausedChange: (show: boolean) => void;
  showCancelled: boolean;
  onShowCancelledChange: (show: boolean) => void;
  activeFilterCount: number;
  onClearFilters: () => void;
  children?: React.ReactNode;  // future toolbar additions
}
```

Key design decisions:
- **State stays in `ItemList.tsx`** -- toolbar is pure presentation + callbacks
- **`filtersOpen` and `searchFocused` state eliminated** -- Popover manages open/close internally, Input handles focus styling via Tailwind
- **`children` prop** enables adding sort buttons, view toggles, export buttons later without modifying the component

---

## Phase 5: Refactor `ItemList.tsx`

1. Replace lines 140-287 (the entire search/filter block) with `<SearchFilterToolbar ... />`
2. Remove `filtersOpen` and `searchFocused` state declarations (lines 62-63)
3. Move `Search` and `Filter` icon imports to `SearchFilterToolbar.tsx`
4. Keep all filter state (`searchQuery`, `selectedCategory`, `showPaused`, `showCancelled`) and `useMemo` filter pipeline in ItemList unchanged

**Net result:** ItemList drops ~150 lines of inline UI, gains a single `<SearchFilterToolbar />` call.

---

## Files Modified

| File | Change |
|---|---|
| `tsconfig.json` | Add `baseUrl` + `paths` |
| `vite.config.ts` | Add `resolve.alias` |
| `package.json` | New deps (shadcn, radix, clsx, tailwind-merge, tw-animate-css, @types/node) |
| `src/index.css` | Add shadcn CSS vars, `@theme inline` color mappings, tw-animate-css import |
| `src/lib/utils.ts` | **New** -- `cn()` helper (created by shadcn init) |
| `components.json` | **New** -- shadcn config (created by shadcn init) |
| `src/components/ui/input.tsx` | **New** -- shadcn, styled for design system |
| `src/components/ui/button.tsx` | **New** -- shadcn, styled for design system |
| `src/components/ui/popover.tsx` | **New** -- shadcn, styled for design system |
| `src/components/ui/select.tsx` | **New** -- shadcn, styled for design system |
| `src/components/ui/checkbox.tsx` | **New** -- shadcn, styled for design system |
| `src/components/ui/badge.tsx` | **New** -- shadcn |
| `src/components/ui/separator.tsx` | **New** -- shadcn |
| `src/components/SearchFilterToolbar.tsx` | **New** -- composable toolbar component |
| `src/components/ItemList.tsx` | Replace inline search/filter with `<SearchFilterToolbar />`, remove 2 state vars |

---

## Verification

1. Run `npm run dev` and confirm the app builds without errors
2. Open Subscriptions view -- search by typing, verify real-time filtering
3. Open filter popover -- select a category, toggle status checkboxes
4. Verify active filter badge count updates correctly
5. Click "Clear all filters" -- verify reset
6. Popover closes on outside click and Escape key
7. Toggle dark/light theme -- verify all colors, shadows, borders look correct
8. Open Bills view -- verify identical behavior
9. Verify empty states display when no items match filters
10. Check keyboard navigation in the Select dropdown
