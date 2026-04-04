# Settings UX Restructuring Plan

## Overview

Restructure the settings page from a flat 7-card scroll into a **tabbed navigation layout** with 3 logical groups, reusing the existing Analytics-style segmented tab pattern. This reduces cognitive load, improves discoverability, and stays true to the existing design system.

---

## Architecture

### Tab Structure

| Tab | Icon | Contents |
|-----|------|----------|
| **Categories** | `Tag` | Unified category manager with subscription/bill type toggle |
| **Notifications** | `Bell` | Channels + Preferences in one view, History as collapsible |
| **Account** | `User` | Email, sign out, and About info combined |

### New Component Structure

```
Settings.tsx (refactored)
├── Tab bar (segmented control — Analytics pattern)
├── <CategorySettings />    — new extracted component
├── <NotificationSettings /> — existing, restructured internally
└── <AccountSettings />      — new extracted component
```

---

## Step-by-Step Implementation

### Step 1: Create the tab infrastructure in `Settings.tsx`

**What changes:**
- Add `activeTab` state: `'categories' | 'notifications' | 'account'`
- Replace `<div className="max-w-2xl space-y-8">` wrapper with a new layout:
  - Page header (matching other views: `text-3xl`, `fontWeight: 800`, `letterSpacing: '-0.02em'`)
  - Segmented tab bar below the header
  - Tab content area rendering the active tab's component

**Tab bar pattern** (copied from Analytics.tsx):
```tsx
<div className="inline-flex rounded-xl p-1 gap-1"
  style={{ backgroundColor: 'var(--bg-hover)' }}>
  {tabs.map(tab => (
    <button
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={{
        backgroundColor: activeTab === tab.key ? 'var(--bg-surface)' : 'transparent',
        color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
        boxShadow: activeTab === tab.key ? 'var(--shadow-card)' : 'none',
      }}>
      {tab.icon}
      {tab.label}
    </button>
  ))}
</div>
```

**Page header** (matching Dashboard/Analytics pattern):
```tsx
<h2 className="text-3xl" style={{
  color: 'var(--text-primary)',
  fontWeight: 800,
  letterSpacing: '-0.02em'
}}>Settings</h2>
<p className="mt-2 text-base" style={{
  color: 'var(--text-secondary)',
  fontWeight: 500,
  letterSpacing: '-0.01em'
}}>Manage your categories, notifications, and account</p>
```

**Content wrapper** stays `max-w-2xl` with `space-y-8` for internal spacing, wrapped in an `animate-in` class for tab transitions.

---

### Step 2: Create `CategorySettings.tsx` — unified category management

**What changes:**
- Extract category logic from `Settings.tsx` into a new `CategorySettings.tsx` component
- **Merge** the two duplicate category sections into ONE card with a **type filter toggle**
- The filter toggle uses the existing `.filter-tab` / `.filter-tab-active` CSS classes (same as Dashboard)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ 🏷 Categories                          [Add] │
│ Organize your subscriptions and bills        │
│                                              │
│ [All] [Subscriptions] [Bills]   ← filter    │
│                                              │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│ │ Chip │ │ Chip │ │ Chip │ │ Chip │  ...    │
│ └──────┘ └──────┘ └──────┘ └──────┘        │
│                                              │
│ (inline create/edit forms appear here)       │
└─────────────────────────────────────────────┘
```

**Props:** Same as current — `categories`, `onCategoriesChange`

**Key details:**
- Filter tabs: `All`, `Subscriptions`, `Bills` using `.filter-tab` / `.filter-tab-active`
- "Add" button creates a category of the currently active filter type (defaults to subscription if "All" is selected)
- Category chips remain identical (same hover, edit/delete behavior)
- Color picker remains identical
- Inline create/edit forms remain identical
- The `colorOptions` array moves into this component
- Empty state: "No categories yet. Add one above." (same text)

**State:**
- `filterType`: `'all' | 'subscription' | 'bill'` (default: `'all'`)
- All existing state (`editingCategory`, `newCategory`, `showNewForm`, `isCreating`) moves here

---

### Step 3: Restructure `NotificationSettings.tsx` — consolidate into fewer cards

**What changes:**
- Merge "Notification Channels" and "Notification Preferences" into a **single card** with two visual sub-sections separated by a styled divider
- Keep "Notification History" as a separate collapsible card below

**Layout:**
```
┌──────────────────────────────────────────────┐
│ 🔔 Notifications                              │
│ Manage channels and reminder preferences      │
│                                               │
│ CHANNELS                        ← label class │
│ ┌ Desktop ─────────── Built-in ─────────────┐│
│ ┌ Telegram ──────── Connected ── [⊘] [🧪] [✕]│
│ ┌ Discord ──────────────────── [Connect] ───┐│
│ ┌ Slack ────────────────────── [Connect] ───┐│
│ ┌ WhatsApp ─────────── Coming Soon ─────────┐│
│                                               │
│ ─────────────── divider ─────────────────── │
│                                               │
│ PREFERENCES                     ← label class │
│ Default Reminder Days  [3]                    │
│ Timezone               [America/New_York ▾]   │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📋 Notification History              [▾/▴]   │
│ (collapsible — same as current)              │
└──────────────────────────────────────────────┘
```

**Key details:**
- Single card wrapping channels + preferences
- Sub-section labels use the existing `.label` class (uppercase, small, tracked)
- Divider: `<div style={{ borderTop: '1px solid var(--border-default)' }} className="my-6" />`
- All channel rows, setup flows, and preference inputs remain functionally identical
- Notification History stays as a separate collapsible card (no change to its behavior)
- The two section icons (Bell + Clock) are replaced by a single Bell icon for the merged card

---

### Step 4: Create `AccountSettings.tsx` — consolidated account view

**What changes:**
- Extract Account and About sections from `Settings.tsx` into `AccountSettings.tsx`
- Merge them into a **single card** with two sub-sections

**Layout:**
```
┌──────────────────────────────────────────────┐
│ 👤 Account                                    │
│ Manage your account and app info              │
│                                               │
│ PROFILE                         ← label class │
│ Email    user@example.com                     │
│                                               │
│ ─────────────── divider ─────────────────── │
│                                               │
│ ABOUT                           ← label class │
│ SubTrkr v1.0.0                                │
│ A cloud-native subscription and bills tracker │
│ built with Tauri, React, and Supabase.        │
│                                               │
│ Your data is securely stored in the cloud     │
│ and synced across all your devices.           │
│                                               │
│ ─────────────── divider ─────────────────── │
│                                               │
│ [🚪 Sign Out]                    ← accent-red │
└──────────────────────────────────────────────┘
```

**Props:** None (fetches user email internally via `supabase.auth.getUser()`)

**Key details:**
- Sub-section labels use `.label` class
- Email display is read-only (same `input` styled div)
- Sign Out button at the bottom, separated by a divider, using `accent-red` color
- About text uses `text-secondary` and `text-muted` (same as current)
- Version shown in mono font: `font-mono text-sm`

---

### Step 5: Wire it all together and add transitions

**In `Settings.tsx`:**
- Import all three sub-components
- Render only the active tab's component
- Wrap tab content in `<div className="animate-in">` for fade-in on tab switch
- `NotificationSettings` stays lazy-loaded with Suspense
- `CategorySettings` and `AccountSettings` can be eagerly loaded (they're small)

**Final `Settings.tsx` structure:**
```tsx
export default function Settings({ categories, onCategoriesChange }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'categories' | 'notifications' | 'account'>('categories');

  const tabs = [
    { key: 'categories', label: 'Categories', icon: <Tag /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell /> },
    { key: 'account', label: 'Account', icon: <User /> },
  ];

  return (
    <div className="max-w-2xl">
      {/* Page header */}
      {/* Tab bar */}
      {/* Tab content with animate-in */}
      {activeTab === 'categories' && <CategorySettings ... />}
      {activeTab === 'notifications' && <Suspense ...><NotificationSettings /></Suspense>}
      {activeTab === 'account' && <AccountSettings />}
    </div>
  );
}
```

---

## Files Modified

| File | Action |
|------|--------|
| `src/components/Settings.tsx` | **Major refactor** — tab infrastructure, slimmed down to orchestrator |
| `src/components/CategorySettings.tsx` | **New file** — extracted + unified category management |
| `src/components/NotificationSettings.tsx` | **Restructured** — merge channels + preferences into one card |
| `src/components/AccountSettings.tsx` | **New file** — extracted + merged account + about |

## Files NOT Modified

| File | Reason |
|------|--------|
| `src/App.tsx` | Settings view routing unchanged |
| `src/index.css` | All needed classes already exist (`.filter-tab`, `.label`, `.card`, `.animate-in`, etc.) |
| `src/types/index.ts` | No type changes needed |
| `src/services/*` | No service changes needed |

---

## Design System Compliance Checklist

- [x] Tab bar: Analytics-style segmented control (`var(--bg-hover)` container, `var(--bg-surface)` active, `var(--shadow-card)` active shadow)
- [x] Page header: Same pattern as Dashboard/Analytics (`text-3xl`, `fontWeight: 800`, `letterSpacing: '-0.02em'`)
- [x] Filter tabs: Dashboard-style `.filter-tab` / `.filter-tab-active` for category type toggle
- [x] Cards: Standard `.card` class with consistent padding
- [x] Section icons: `w-10 h-10 rounded-xl` with `var(--bg-hover)` background
- [x] Sub-section labels: `.label` class (uppercase, small, tracked)
- [x] Dividers: `1px solid var(--border-default)`
- [x] Form inputs: `.input` class with `var(--brand-primary)` focus ring
- [x] Color picker: `w-6 h-6 rounded-full` with ring-2 ring-offset-2
- [x] Transitions: `animate-in` class for tab content transitions
- [x] Typography: Inter for UI, JetBrains Mono for data values
- [x] Hover states: Inline style updates via onMouseEnter/onMouseLeave
- [x] Spacing: `space-y-8` between cards, `space-y-4` within sections
- [x] Max-width: `max-w-2xl` container constraint
