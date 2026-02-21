# SubTrkr - Agent Context

> Concise reference for AI agents. Detailed docs live in `docs/` — see [docs/README.md](docs/README.md) for the full index.

---

## What Is SubTrkr?

A **cloud-native desktop app** for tracking recurring **subscriptions** and **bills**. Built with Tauri 2 + React 19, backed by Supabase for auth, database, real-time sync, and notifications.

**Core concept**: Unified `items` table where both subscriptions and bills coexist, distinguished by `item_type`. Categories are also scoped by type via `category_type`.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Desktop Shell | Tauri 2 (Rust) | Native packaging, deep links, updater, notifications |
| Frontend | React 19 + TypeScript 5.8 | Hooks-based, lazy-loaded routes |
| Styling | Tailwind CSS 4 + Framer Motion | CSS custom properties theming, animations |
| UI Primitives | Radix UI + Lucide Icons | Accessible components |
| Charts | Recharts 3 | Spending analytics |
| Database | PostgreSQL (Supabase) | RLS, real-time subscriptions |
| Auth | Supabase Auth | Email/password, OTP, Google OAuth, GitHub OAuth |
| Date Handling | date-fns | Timezone-safe date utilities |
| Build | Vite 7 + Bun | Code-split vendor chunks |

---

## Directory Structure

```
SubTrkr/
├── src/
│   ├── components/
│   │   ├── AuthScreen.tsx            # Login/signup (email, OTP, OAuth)
│   │   ├── Dashboard.tsx             # Overview: stats, charts, type tabs
│   │   ├── ItemList.tsx              # Filterable item grid (bills OR subs)
│   │   ├── ItemForm.tsx              # Add/edit modal with service autocomplete
│   │   ├── Analytics.tsx             # Spending trends (lazy-loaded)
│   │   ├── Settings.tsx              # Tab container (lazy-loaded)
│   │   ├── CategorySettings.tsx      # Category CRUD with color picker
│   │   ├── NotificationSettings.tsx  # Notification channel config
│   │   ├── AccountSettings.tsx       # Password change, email verification, updates
│   │   ├── SearchFilterToolbar.tsx   # Status/category/search filtering
│   │   ├── StatusChangeDialog.tsx    # Pause/cancel/resume/reactivate modal
│   │   ├── EmailVerificationBanner.tsx
│   │   ├── SetNewPassword.tsx        # Deep-link password reset
│   │   ├── TitleBar.tsx              # Custom title bar with nav
│   │   ├── ErrorBoundary.tsx
│   │   ├── LazyComponentFallback.tsx
│   │   └── ui/                       # Reusable primitives (Button, Dialog, etc.)
│   ├── services/
│   │   ├── supabase.ts               # Client singleton
│   │   ├── auth.ts                   # All auth operations
│   │   ├── database.ts               # All CRUD + analytics + status management
│   │   ├── seedCategories.ts         # Default category seeding on first login
│   │   ├── notifications.ts          # Native desktop notification logic
│   │   ├── notificationChannels.ts   # Telegram/Discord/Slack channels
│   │   └── updater.ts               # Tauri auto-updater
│   ├── hooks/
│   │   ├── useLocalStorage.ts        # Persist state to localStorage
│   │   ├── useDebounce.ts            # Debounce value changes
│   │   └── useItemFilters.ts         # Complex item filtering logic
│   ├── utils/
│   │   └── dates.ts                  # Timezone-safe date helpers
│   ├── data/
│   │   └── knownServices.ts          # 130+ services with logos/pricing
│   ├── config/
│   │   └── logoApi.ts                # logo.dev integration
│   ├── types/
│   │   └── index.ts                  # All TypeScript interfaces
│   ├── App.tsx                       # Shell: auth, realtime, routing, maintenance
│   └── index.css                     # Tailwind config + custom CSS vars
├── src-tauri/
│   ├── src/lib.rs                    # Plugin init (notification, deep-link, updater)
│   ├── tauri.conf.json               # Window config, deep-link schema, updater
│   └── capabilities/default.json     # Permission manifests
├── supabase/
│   └── migrations/                   # SQL schema migrations
├── docs/                             # All detailed documentation (see below)
└── .github/workflows/release.yml     # CI/CD: tag → build → signed artifacts
```

---

## Data Model

### Core Types (`src/types/index.ts`)

```typescript
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type ItemType = 'subscription' | 'bill';
type ItemStatus = 'active' | 'paused' | 'cancelled' | 'archived' | 'trial';
```

### Tables

| Table | Purpose | Key Fields |
|---|---|---|
| `items` | Subscriptions & bills | `item_type`, `status`, `amount`, `billing_cycle`, `next_billing_date`, `paused_at/until`, `cancelled_at`, `trial_end_date`, `logo_url` |
| `categories` | Type-scoped grouping | `category_type` ('subscription' \| 'bill'), `color`, `icon` |
| `payments` | Payment history | `item_id`, `amount`, `paid_at` |
| `item_status_history` | Status audit trail | `item_id`, `status`, `reason`, `notes`, `changed_at` |

All tables use RLS (`auth.uid() = user_id`). IDs are prefixed UUIDs (`cat-`, `item-`, `pay-`).

> Full schema SQL: `supabase/migrations/`

### Status Lifecycle

```
trial → active / paused / cancelled
active ↔ paused ↔ cancelled → archived
cancelled / archived → active (reactivate)
```

Status changes go through `executeStatusChange()` in `database.ts`, which writes to `item_status_history` for audit.

---

## Key Patterns

**Real-time sync**: `App.tsx` subscribes to Supabase channels on `items`, `categories`, `payments` tables. Any remote change triggers `loadData()` with 100ms debounce.

**Auto-maintenance on launch**: `App.tsx` runs background jobs — archive old cancellations, resume paused items past their `paused_until` date, advance past-due billing dates, handle expired trials, send notification reminders.

**Type-aware components**: Components accept `itemType` prop and filter both items and categories by type. `ItemList`, `ItemForm`, `Dashboard`, `Analytics`, `Settings` all follow this pattern.

**Service autocomplete**: `ItemForm` searches `knownServices.ts` (130+ entries) to suggest names, logos, pricing, and categories when adding items.

**Theme system**: CSS custom properties in `index.css`, toggled via `dark` class on `documentElement`. Persisted in localStorage.

**Auth flow**: Supports email/password, OTP, Google OAuth, and GitHub OAuth. OAuth uses deep links (`subtrkr://auth-callback`) to capture redirects back into the Tauri app.

**Code splitting**: `Analytics` and `Settings` are lazy-loaded via `React.lazy()` + `Suspense`.

---

## Service Layer Quick Reference

### `database.ts` — Main Functions

| Function | Purpose |
|---|---|
| `getItems(type?)` | Fetch items with joined categories |
| `getActiveItems(type?)` | Active items only |
| `createItem(data)` / `updateItem(id, data)` / `deleteItem(id)` | CRUD |
| `executeStatusChange(id, data)` | Status transitions with audit trail |
| `getStatusHistory(itemId)` | Audit log |
| `getCategories(type?)` / `createCategory()` / `updateCategory()` / `deleteCategory()` | Category CRUD |
| `calculateMonthlySpending(items)` | Normalize all cycles → monthly |
| `calculateYearlySpending(items)` | Normalize all cycles → yearly |
| `calculateMonthlySavings(items)` | Savings from cancelled items |
| `getSpendingByCategory(items)` | Category breakdown |
| `getUpcomingItems(items, days)` | Renewals due within N days |
| `archivePastCancellations()` | Auto-archive old cancelled items |
| `resumePausedItems()` | Auto-resume when paused_until reached |
| `advancePastDueItems()` | Move past-due to next billing cycle |
| `handleExpiredTrials()` | Log expired trials (no auto-conversion) |

### Billing Cycle Normalization

```
weekly  → (amount × 52) / 12
monthly → amount
quarterly → amount / 3
yearly  → amount / 12
```

---

## Development

```bash
bun install              # Install dependencies
bun tauri dev            # Dev mode (frontend + Tauri)
bun run dev              # Frontend only (Vite)
bun tauri build          # Production build
bunx tsc --noEmit        # Type check
```

**Environment**: `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

**Release**: Tag-based CI. Bump versions in `package.json`, `tauri.conf.json`, `Cargo.toml`, then `git tag v1.x.x && git push origin v1.x.x`.

> Full release process: [docs/PRODUCTION_RELEASE_WORKFLOW.md](docs/PRODUCTION_RELEASE_WORKFLOW.md)

---

## Documentation Index

Detailed documentation lives in `docs/`. See [docs/README.md](docs/README.md) for the full navigable index.

### Architecture
- [Authentication](docs/architecture/AUTHENTICATION.md) — Auth flows, OAuth, RLS, session management
- [Telegram Architecture](docs/architecture/TELEGRAM_ARCHITECTURE.md) — User-owned bot integration
- [Timezone Implementation](docs/architecture/TIMEZONE_IMPLEMENTATION.md) — 9 AM local time scheduling
- [Trial Automation](docs/architecture/TRIAL_AUTOMATION_CHANGES.md) — Trial status transitions

### Notifications
- [Setup](docs/notifications/NOTIFICATION_SETUP.md) — Initial configuration
- [Customization](docs/notifications/NOTIFICATION_CUSTOMIZATION.md) — Advanced config
- [Complete Overview](docs/notifications/NOTIFICATIONS_COMPLETE.md) — Full system architecture
- [Improvements](docs/notifications/NOTIFICATION_IMPROVEMENTS.md) — Optimization history

### UI/UX
- [Design System](docs/reference/DESIGN_SYSTEM.md) — Typography, colors, animations
- [Theming](docs/THEMING.md) — CSS custom properties, dark/light, custom themes
- [Icon Setup](docs/ICON_SETUP.md) — Multi-platform icon generation

### Guides
- [Adding Services](docs/guides/adding-services.md) — Add to knownServices.ts
- [Testing](docs/TESTING_GUIDE.md) — Manual test scenarios
- [Updater Testing](docs/UPDATER_TESTING_GUIDE.md) — Test auto-updater

### Release
- [Production Workflow](docs/PRODUCTION_RELEASE_WORKFLOW.md) — Full release runbook
- [Captain Checklist](docs/RELEASE_CAPTAIN_CHECKLIST.md) — Per-release checklist

### Plans
- [Current Plan](docs/plans/plan.md) — Main project plan
- [Next Up](docs/plans/next.md) — Upcoming features
