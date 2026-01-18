# SubTrkr - Codebase Documentation

> **Purpose**: This document provides comprehensive context for AI agents and developers working on SubTrkr. It covers architecture, data flow, key patterns, and implementation details.

---

## Overview

**SubTrkr** is a local-first desktop application for tracking recurring subscriptions. Built with modern web technologies wrapped in a native shell, it prioritizes privacy by storing all data locally.

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Native Shell** | Tauri 2.0 (Rust) | Desktop app packaging, native APIs |
| **Frontend** | React 19 + TypeScript | UI components and state management |
| **Styling** | Tailwind CSS 4 | Utility-first styling with custom design tokens |
| **Database** | SQLite (via tauri-plugin-sql) | Local persistent storage |
| **Charts** | Recharts | Data visualization |
| **Icons** | Lucide React | Consistent iconography |
| **Build** | Vite + Bun | Fast development and bundling |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri Application                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 React Frontend                       │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │   │
│  │  │Dashboard│  │SubList  │  │Analytics│  │Settings│ │   │
│  │  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │   │
│  │       │            │            │            │       │   │
│  │       └────────────┴────────────┴────────────┘       │   │
│  │                        │                              │   │
│  │              ┌─────────▼─────────┐                   │   │
│  │              │  Database Service │                   │   │
│  │              │  (database.ts)    │                   │   │
│  │              └─────────┬─────────┘                   │   │
│  └────────────────────────┼─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │           Tauri Plugin SQL (Rust ↔ JS Bridge)         │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                  │
│  ┌────────────────────────▼─────────────────────────────┐   │
│  │                  SQLite Database                      │   │
│  │                  (subtrkr.db)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories

```
SubTrkr/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── Dashboard.tsx         # Overview with stats & charts
│   │   ├── SubscriptionList.tsx  # Filterable subscription grid
│   │   ├── SubscriptionForm.tsx  # Add/edit modal
│   │   ├── Analytics.tsx         # Spending trends & insights
│   │   ├── Settings.tsx          # Category management
│   │   └── ui/                   # Reusable UI primitives
│   │       ├── ConfirmDialog.tsx # Confirmation modal
│   │       └── EmptyState.tsx    # Empty state placeholder
│   ├── services/
│   │   └── database.ts           # All database operations
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── App.tsx                   # Main app shell & routing
│   └── index.css                 # Tailwind config & custom styles
│
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   └── lib.rs                # Tauri setup & SQL migrations
│   ├── capabilities/
│   │   └── default.json          # Permission configuration
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
└── package.json                  # Frontend dependencies
```

---

## Data Model

### Database Schema

The SQLite database (`subtrkr.db`) contains three tables:

#### `categories`
Organizes subscriptions into groups with visual styling.

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,           -- Format: 'cat-{uuid}' or 'cat-{name}' for defaults
    name TEXT NOT NULL,            -- Display name
    color TEXT NOT NULL,           -- Hex color (e.g., '#ef4444')
    icon TEXT,                     -- Reserved for future icon support
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Categories** (seeded on first run):
- Streaming (#ef4444), Software (#3b82f6), Gaming (#8b5cf6)
- News (#f59e0b), Fitness (#10b981), Music (#ec4899)
- Cloud Storage (#06b6d4), Other (#6b7280)

#### `subscriptions`
Core subscription data with billing information.

```sql
CREATE TABLE subscriptions (
    id TEXT PRIMARY KEY,           -- Format: 'sub-{uuid}'
    name TEXT NOT NULL,            -- Service name (e.g., 'Netflix')
    amount REAL NOT NULL,          -- Cost per billing cycle
    currency TEXT DEFAULT 'USD',   -- ISO currency code
    billing_cycle TEXT NOT NULL,   -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    category_id TEXT REFERENCES categories(id),
    next_billing_date TEXT NOT NULL,  -- ISO date string
    start_date TEXT NOT NULL,         -- When subscription began
    notes TEXT,                    -- User notes
    url TEXT,                      -- Service website
    is_active INTEGER DEFAULT 1,   -- 1 = active, 0 = paused
    reminder_days INTEGER DEFAULT 3,  -- Days before billing to remind
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

#### `payments`
Payment history for tracking (not yet fully implemented in UI).

```sql
CREATE TABLE payments (
    id TEXT PRIMARY KEY,           -- Format: 'pay-{uuid}'
    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    paid_at TEXT NOT NULL,         -- When payment occurred
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Types (`src/types/index.ts`)

```typescript
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string | null;
  next_billing_date: string;
  start_date: string;
  notes: string | null;
  url: string | null;
  is_active: number;  // SQLite boolean
  reminder_days: number;
  created_at: string;
  updated_at: string;
}

// Extended for UI with joined category data
interface SubscriptionWithCategory extends Subscription {
  category?: Category;
}
```

---

## Database Service (`src/services/database.ts`)

The database service is the **single source of truth** for all data operations. It uses the `@tauri-apps/plugin-sql` package to communicate with SQLite.

### Connection Pattern

```typescript
let db: Database | null = null;

export async function getDatabase(): Promise<Database> {
  if (!db) {
    db = await Database.load('sqlite:subtrkr.db');
  }
  return db;
}
```

- **Singleton pattern**: Database connection is reused across calls
- **Lazy initialization**: Connection opened on first use

### CRUD Operations

| Function | Purpose |
|----------|---------|
| `getCategories()` | Fetch all categories, sorted by name |
| `createCategory(name, color, icon?)` | Create new category |
| `updateCategory(id, name, color, icon?)` | Update existing category |
| `deleteCategory(id)` | Delete category (sets subscriptions to null) |
| `getSubscriptions()` | Fetch all subscriptions with joined categories |
| `getActiveSubscriptions()` | Filter to only active subscriptions |
| `getSubscriptionById(id)` | Fetch single subscription with category |
| `createSubscription(data)` | Create new subscription |
| `updateSubscription(id, data)` | Partial update of subscription |
| `deleteSubscription(id)` | Delete subscription (cascades to payments) |
| `toggleSubscriptionActive(id)` | Toggle is_active between 0/1 |

### Analytics Functions

```typescript
// Calculate total monthly cost (normalizes all billing cycles)
calculateMonthlySpending(subscriptions): number

// Calculate total yearly cost
calculateYearlySpending(subscriptions): number

// Group spending by category for charts
getSpendingByCategory(subscriptions): SpendingByCategory[]

// Get subscriptions due within N days
getUpcomingRenewals(subscriptions, days = 7): SubscriptionWithCategory[]

// Calculate next billing date based on cycle
advanceNextBillingDate(subscription): string
```

**Billing Cycle Normalization**:
```typescript
// Monthly equivalent calculation
switch (billing_cycle) {
  case 'weekly':    return amount * 52 / 12;
  case 'monthly':   return amount;
  case 'quarterly': return amount / 3;
  case 'yearly':    return amount / 12;
}
```

---

## Component Architecture

### App Shell (`App.tsx`)

The main app component manages:
- **View state**: Current active view (dashboard, subscriptions, analytics, settings)
- **Data state**: Subscriptions and categories arrays
- **UI state**: Form visibility, editing state, dark mode
- **Data loading**: Centralized `loadData()` function refreshes all data

```typescript
function App() {
  const [view, setView] = useState<View>('dashboard');
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionWithCategory | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  const loadData = useCallback(async () => {
    const [subs, cats] = await Promise.all([
      getSubscriptions(),
      getCategories()
    ]);
    setSubscriptions(subs);
    setCategories(cats);
  }, []);
}
```

### Dashboard (`Dashboard.tsx`)

Shows at-a-glance metrics:
- Monthly/yearly spending totals
- Active subscription count
- Upcoming renewals (7 days)
- Spending by category pie chart

Uses `useMemo` for expensive calculations and `useEffect` for async data loading.

### SubscriptionList (`SubscriptionList.tsx`)

Features:
- Search filtering by name
- Category dropdown filter
- Show/hide inactive toggle
- Card-based grid layout
- Context menu (edit, pause/resume, delete)
- Delete confirmation dialog

### SubscriptionForm (`SubscriptionForm.tsx`)

Modal form for creating/editing subscriptions:
- Validation with error messages
- Shake animation on validation failure
- Supports all subscription fields
- Pre-fills data when editing

### Analytics (`Analytics.tsx`)

Displays:
- Monthly spending trend (line chart)
- Category breakdown (horizontal bar chart)
- Top 5 most expensive subscriptions

### Settings (`Settings.tsx`)

Category management:
- Create new categories with color picker
- Edit existing category names/colors
- Delete custom categories (defaults protected)
- Inline editing UX

---

## Styling System

### Tailwind CSS 4 Configuration (`index.css`)

Custom design tokens defined in `@theme`:

```css
@theme {
  /* Brand colors (green palette) */
  --color-brand-500: #22c55e;
  
  /* Surface colors */
  --color-surface-50: #fafafa;   /* Light bg */
  --color-surface-900: #171717;  /* Dark bg */
  
  /* Typography */
  --font-display: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  
  /* Shadows */
  --shadow-card: 0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.06);
}
```

### Component Classes

```css
/* Card component */
.card {
  @apply bg-white rounded-2xl p-6;
  box-shadow: var(--shadow-card);
}

.dark .card {
  @apply bg-surface-800 border border-neutral-700/50;
}
```

### Animations

- `animate-shake` - Form validation error feedback
- `animate-in` / `fade-in` - Modal entrance
- `zoom-in-95` - Dialog scale animation

---

## Tauri Configuration

### Rust Setup (`src-tauri/src/lib.rs`)

Initializes Tauri with plugins and runs database migrations:

```rust
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: "...",  // Creates tables + seeds default categories
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:subtrkr.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Permissions (`capabilities/default.json`)

Required permissions for the app to function:

```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "notification:default"
  ]
}
```

**Important**: Without `sql:allow-execute`, INSERT/UPDATE/DELETE operations fail silently.

---

## Key Patterns

### 1. Optimistic UI Updates

Data is reloaded after every mutation to ensure UI consistency:

```typescript
const handleCreateSubscription = async (data) => {
  await createSubscription(data);
  await loadData();  // Refresh everything
  setShowForm(false);
};
```

### 2. Dark Mode

Toggle via state, applied to `document.documentElement`:

```typescript
useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
}, [darkMode]);
```

### 3. Form State Management

Forms use controlled components with a single `formData` object:

```typescript
const [formData, setFormData] = useState<SubscriptionFormData>({...});

const handleChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
};
```

### 4. Currency Formatting

Consistent currency display using `Intl.NumberFormat`:

```typescript
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
```

---

## Development

### Commands

```bash
# Install dependencies
bun install

# Start development (frontend + Tauri)
bun tauri dev

# Build for production
bun tauri build

# Run frontend only (Vite)
bun run dev

# Type check
bunx tsc --noEmit
```

### Adding a New Feature Checklist

1. **Types**: Add interfaces to `src/types/index.ts`
2. **Database**: Add schema changes as new migration in `lib.rs`
3. **Service**: Add CRUD functions to `database.ts`
4. **Component**: Create/update React components
5. **State**: Wire into `App.tsx` if needed
6. **Permissions**: Update `capabilities/default.json` if new Tauri APIs used

---

## Future Roadmap

### Planned Features
- [ ] **Notifications**: Renewal reminders (tauri-plugin-notification is configured)
- [ ] **Payment History**: UI for viewing/recording payments
- [ ] **Data Export**: Export to CSV/JSON
- [ ] **Cloud Sync**: Optional E2EE sync (requires auth system)
- [ ] **Recurring Payment Auto-Advance**: Auto-update next_billing_date after it passes

### Technical Debt
- [ ] Add proper error boundaries
- [ ] Implement loading skeletons for all async states
- [ ] Add unit tests for database service
- [ ] Persist dark mode preference to localStorage
- [ ] Add keyboard navigation support

---

## Troubleshooting

### "sql.execute not allowed"
**Cause**: Missing SQL permissions in `capabilities/default.json`
**Fix**: Ensure all required permissions are listed (see Permissions section)

### Database not loading
**Cause**: Database connection failed or migrations didn't run
**Fix**: Check Rust console output, delete `subtrkr.db` to reset

### Categories not appearing
**Cause**: Default categories only seed once
**Fix**: Check if `categories` table has data, re-run migrations if empty

---

## Contact

This app was built collaboratively with AI assistance. For questions about the implementation, refer to this document or the inline code comments.

**Co-Authored-By**: Warp <agent@warp.dev>
