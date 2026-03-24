# SubTrkr - Agent Context

> Detailed docs in `docs/` — see [docs/README.md](docs/README.md) for the full index.
> Supabase safety rules are in `.claude/rules/supabase-safety.md`.
> Theming rules are in `.claude/rules/theming.md`.

---

## What Is SubTrkr?

A **cloud-native desktop app** for tracking recurring **subscriptions** and **bills**. Built with Tauri 2 + React 19, backed by Supabase for auth, database, real-time sync, and notifications.

**Core concept**: Unified `items` table where both subscriptions and bills coexist, distinguished by `item_type`. Categories are also scoped by type via `category_type`.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Tauri 2 (Rust) |
| Frontend | React 19 + TypeScript 5.8 |
| Styling | Tailwind CSS 4 + Framer Motion |
| UI Primitives | Radix UI + Lucide Icons |
| Charts | Recharts 3 |
| Database | PostgreSQL (Supabase) with RLS |
| Auth | Supabase Auth (email, OTP, Google, GitHub OAuth) |
| Build | Vite 7 + Bun |

---

## Directory Structure

```
src/
├── components/          # UI — AuthScreen, Dashboard, ItemList, ItemForm, Analytics, Settings, etc.
│   └── ui/              # Reusable primitives (Button, Dialog, DropdownMenu, etc.)
├── services/            # Supabase client, auth, database CRUD, notifications, updater
├── hooks/               # useLocalStorage, useDebounce, useItemFilters
├── utils/dates.ts       # Timezone-safe date helpers (date-fns)
├── data/knownServices.ts # 130+ services with logos/pricing
├── types/index.ts       # All TypeScript interfaces
├── App.tsx              # Shell: auth, realtime, routing, maintenance
└── index.css            # Tailwind config + CSS custom properties
src-tauri/               # Rust: plugin init, tauri.conf.json, capabilities
supabase/migrations/     # Legacy local snapshot only — NOT authoritative
```

---

## Data Model

```typescript
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type ItemType = 'subscription' | 'bill';
type ItemStatus = 'active' | 'paused' | 'cancelled' | 'archived' | 'trial';
```

**Tables**: `items`, `categories` (type-scoped), `payments`, `item_status_history` (audit trail).
All use RLS (`auth.uid() = user_id`). IDs are prefixed UUIDs (`cat-`, `item-`, `pay-`).

**Status lifecycle**: `trial → active ↔ paused ↔ cancelled → archived`. Reactivate from cancelled/archived. All transitions go through `executeStatusChange()` in `database.ts`.

---

## Key Patterns

- **Real-time sync**: `App.tsx` subscribes to Supabase channels on `items`, `categories`, `payments`. Remote changes trigger `loadData()` with 100ms debounce.
- **Auto-maintenance on launch**: archive old cancellations, resume paused items, advance past-due billing, handle expired trials, send reminders.
- **Type-aware components**: Components accept `itemType` prop and filter items + categories by type.
- **Service autocomplete**: `ItemForm` searches `knownServices.ts` for names, logos, pricing.
- **Theme system**: CSS custom properties in `index.css`, toggled via `dark` class. Persisted in localStorage.
- **Auth**: Email/password, OTP, Google/GitHub OAuth. Deep links (`subtrkr://auth-callback`) for OAuth redirect.
- **Code splitting**: `Analytics` and `Settings` are `React.lazy()` + `Suspense`.

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

**Release**: Tag-based CI. Bump versions in `package.json`, `tauri.conf.json`, `Cargo.toml`, then tag and push. See [docs/PRODUCTION_RELEASE_WORKFLOW.md](docs/PRODUCTION_RELEASE_WORKFLOW.md).

## Watch Out For

- **Supabase migrations**: Never run `supabase db push` or migration commands from this repo. See `.claude/rules/supabase-safety.md`.
- **Strict TypeScript**: No unused imports or variables.
- **Package manager**: Always use `bun`, never `npm`/`yarn`/`pnpm`.
- `database.ts:750` has a pre-existing unused var `now` (TS6133) — ignore it.
