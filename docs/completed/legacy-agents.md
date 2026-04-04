# SubTrkr - Comprehensive Agent Documentation

> DEPRECATED: This file reflects a legacy local SQLite architecture and is no longer the source of truth. Use `/Users/tyler/Development/SubTrkr/agents.md` for current cloud-native (Supabase) architecture and workflows.

> **Purpose**: This document provides complete context for AI agents and developers working on SubTrkr. It covers the app's architecture, billing date logic, key patterns, and recent improvements to inform future iterations.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Data Model](#data-model)
4. [Billing Date Logic (Critical)](#billing-date-logic-critical)
5. [Database Service](#database-service)
6. [Component Architecture](#component-architecture)
7. [Key Patterns](#key-patterns)
8. [Styling System](#styling-system)
9. [Development](#development)
10. [Recent Changes (v1.1)](#recent-changes-v11)
11. [Future Roadmap](#future-roadmap)

---

## Overview

**SubTrkr** is a local-first desktop application for tracking recurring **subscriptions** and **bills**. Built with Tauri 2.0 (Rust backend) and React 19 (TypeScript frontend), it prioritizes privacy by storing all data locally in SQLite.

### Key Concept: Unified Items Model
As of v1.1, SubTrkr uses a **unified data model** where both subscriptions and bills are stored in a single `items` table with an `item_type` field. This allows:
- Shared UI components (`ItemList`, `ItemForm`) with type-specific filtering
- Combined analytics with type filtering (All / Bills / Subscriptions)
- Categories scoped by type (`category_type` field)
- Simpler database queries and maintenance

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
| **Date Handling** | date-fns | Reliable, timezone-safe date operations |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Tauri Application                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 React Frontend                       │   │
│  │  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌────────┐ │   │
│  │  │Dashboard│  │ItemList│  │Analytics│  │Settings│ │   │
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

### Directory Structure

```
SubTrkr/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── Dashboard.tsx         # Overview with stats, charts, type tabs
│   │   ├── ItemList.tsx          # Filterable item grid (bills OR subscriptions)
│   │   ├── ItemForm.tsx          # Add/edit modal (type-aware)
│   │   ├── Analytics.tsx         # Spending trends with type filter
│   │   ├── Settings.tsx          # Split category management by type
│   │   └── ui/                   # Reusable UI primitives
│   │       ├── ConfirmDialog.tsx # Confirmation modal with variants
│   │       ├── EmptyState.tsx    # Empty state placeholder with action button
│   │       └── Skeleton.tsx      # Loading skeleton components
│   ├── services/
│   │   ├── database.ts           # All database operations
│   │   └── notifications.ts      # Renewal reminder notifications
│   ├── utils/
│   │   └── dates.ts              # Centralized date utilities (date-fns)
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
├── docs/
│   └── agents.md                 # This file
│
└── package.json                  # Frontend dependencies
```

---

## Data Model

### Database Schema

The SQLite database (`subtrkr.db`) contains three tables.

#### `categories`
Organizes items into groups with visual styling. **Scoped by type** via `category_type`.

```sql
CREATE TABLE categories (
    id TEXT PRIMARY KEY,              -- Format: 'cat-{uuid}' or 'cat-{name}' for defaults
    name TEXT NOT NULL,               -- Display name
    color TEXT NOT NULL,              -- Hex color (e.g., '#ef4444')
    icon TEXT,                        -- Reserved for future icon support
    category_type TEXT DEFAULT 'subscription',  -- 'subscription' | 'bill'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Default Subscription Categories** (seeded Migration 1):
- Streaming (#ef4444), Software (#3b82f6), Gaming (#8b5cf6)
- News (#f59e0b), Fitness (#10b981), Music (#ec4899)
- Cloud Storage (#06b6d4), Other (#6b7280)

**Default Bill Categories** (seeded Migration 2):
- Utilities (#f59e0b), Housing (#8b5cf6), Insurance (#3b82f6)
- Phone & Internet (#06b6d4), Transportation (#10b981)

#### `items` (Bills & Subscriptions)
Unified table for both subscriptions and bills.

```sql
CREATE TABLE items (
    id TEXT PRIMARY KEY,              -- Format: 'item-{uuid}'
    name TEXT NOT NULL,               -- Service/bill name
    amount REAL NOT NULL,             -- Cost per billing cycle
    currency TEXT DEFAULT 'USD',      -- ISO currency code
    billing_cycle TEXT NOT NULL,      -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    category_id TEXT REFERENCES categories(id),
    next_billing_date TEXT NOT NULL,  -- ISO date string (YYYY-MM-DD)
    start_date TEXT NOT NULL,         -- When tracking began (anchor point)
    notes TEXT,                       -- User notes
    url TEXT,                         -- Service website
    is_active INTEGER DEFAULT 1,      -- 1 = active, 0 = paused
    reminder_days INTEGER DEFAULT 3,  -- Days before billing to remind
    item_type TEXT DEFAULT 'subscription',  -- 'subscription' | 'bill'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

**Critical Fields for Billing Logic**:
- `start_date` — **Anchor point**, never changes the billing calculation logic
- `next_billing_date` — **Derived** from start_date and billing_cycle
- `billing_cycle` — Determines how to advance dates

#### `payments`
Payment history for tracking (not yet fully implemented in UI).

```sql
CREATE TABLE payments (
    id TEXT PRIMARY KEY,              -- Format: 'pay-{uuid}'
    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    paid_at TEXT NOT NULL,            -- When payment occurred
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### TypeScript Types (`src/types/index.ts`)

```typescript
type BillingCycle = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type ItemType = 'subscription' | 'bill';

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  category_type: ItemType;  // Scopes category to bill or subscription
  created_at: string;
}

interface Item {
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
  is_active: number;       // SQLite uses 0/1 for boolean
  reminder_days: number;
  item_type: ItemType;     // 'subscription' | 'bill'
  created_at: string;
  updated_at: string;
}

// Extended for UI with joined category data
interface ItemWithCategory extends Item {
  category?: Category;
}

// Form data (subset for create/update)
interface ItemFormData {
  name: string;
  amount: string;  // String for form input
  currency: string;
  billing_cycle: BillingCycle;
  category_id: string;
  next_billing_date: string;
  start_date: string;
  notes: string;
  url: string;
  reminder_days: number;
  item_type: ItemType;
}
```

---

## Billing Date Logic (Critical)

> **This is the most complex part of the app.** Changes here have cascading effects. Document carefully.

### The Problem Being Solved

When users edit a subscription/bill, they need to be able to:
1. Change the `billing_cycle` (e.g., monthly → yearly)
2. Correct the `start_date` if they entered it wrong
3. Resume a paused item with the correct next billing date

Each action has different semantics for how `next_billing_date` should be recalculated.

### Key Functions (`src/utils/dates.ts`)

#### `getNextFutureBillingDate(anchorDateStr, cycle)`

**Purpose**: Calculates the next future occurrence of a billing cycle from an anchor date.

```typescript
export function getNextFutureBillingDate(anchorDateStr: string, cycle: BillingCycle): string {
  const anchor = parseLocalDate(anchorDateStr);
  const today = getToday();
  
  let nextDate = anchor;
  
  // Advance until we're strictly in the future
  while (nextDate <= today) {
    nextDate = addBillingCycle(nextDate, cycle);
  }
  
  return formatISODate(nextDate);
}
```

**Algorithm**:
1. Parse the anchor date (e.g., start_date or a past next_billing_date)
2. Get today's date at start of day (no timezone issues)
3. Add the billing cycle repeatedly until the date is after today
4. Return as ISO string (YYYY-MM-DD)

**Examples**:
- Anchor: Jan 1, 2026 | Cycle: monthly | Today: Jan 19 → **Feb 1, 2026**
- Anchor: Jan 1, 2024 | Cycle: yearly | Today: Jan 19, 2026 → **Jan 1, 2027**
- Anchor: Feb 15, 2026 | Cycle: monthly | Today: Jan 19 → **Feb 15, 2026** (already future)

**When to use**:
- Creating a new item (anchor = start_date)
- Changing billing_cycle (anchor = today)
- Changing start_date (anchor = new start_date)
- Resuming a paused item (anchor = past next_billing_date)

#### `calculateNextBillingDate(dateStr, cycle)`

**Purpose**: Advances a date by exactly one billing cycle.

```typescript
export function calculateNextBillingDate(dateStr: string, cycle: BillingCycle): string {
  const date = parseLocalDate(dateStr);
  const nextDate = addBillingCycle(date, cycle);
  return formatISODate(nextDate);
}
```

**Use case**: Already-calculated next_billing_date advancing to the next occurrence (e.g., at app startup via `advancePastDueItems()`).

### Billing Date Recalculation Logic (`src/components/ItemForm.tsx`)

The `handleChange` function intelligently recalculates `next_billing_date` when scheduling fields change:

```typescript
const handleChange = (e) => {
  const { name, value } = e.target;
  const processedValue = name === 'reminder_days' ? Number(value) : value;
  
  setFormData(prev => {
    const updated = { ...prev, [name]: processedValue };
    
    // Recalculate next_billing_date when scheduling fields change
    if (name === 'start_date') {
      // User is correcting when they started → recalculate from new start_date
      updated.next_billing_date = getNextFutureBillingDate(
        updated.start_date,
        updated.billing_cycle
      );
    } else if (name === 'billing_cycle') {
      // User is switching plans → new cycle starts from today
      updated.next_billing_date = getNextFutureBillingDate(
        today,  // Anchor from today, not start_date
        updated.billing_cycle as BillingCycle
      );
    }
    
    return updated;
  });
};
```

**Semantics**:
- **`start_date` changes** → "I entered the wrong start date" → Recalculate from the new start_date
- **`billing_cycle` changes** → "I'm switching subscription plans" → Recalculate from today
- **Other fields change** → Don't touch next_billing_date (user may have manually set it)

**Real-world example**:
```
Scenario: User subscribed to "Netflix" on Jan 1, 2026 (monthly)
Current state: next_billing_date = Feb 1, 2026

User action: Changes billing_cycle to "yearly"
Logic: getNextFutureBillingDate(today, 'yearly')
       → today is Jan 19, 2026
       → next yearly occurrence from today = Jan 19, 2027
Result: next_billing_date is updated to Jan 19, 2027
```

### Paused Item Handling (`src/services/database.ts`)

When resuming a paused item, recalculate `next_billing_date` if it's in the past:

```typescript
export async function toggleItemActive(id: string): Promise<void> {
  const database = await getDatabase();
  
  // Get current item state
  const [item] = await database.select<Item[]>(
    'SELECT * FROM items WHERE id = $1',
    [id]
  );
  if (!item) return;
  
  const now = new Date().toISOString();
  const isResuming = item.is_active === 0;
  
  if (isResuming) {
    // When resuming, recalculate next_billing_date if it's in the past
    const newNextDate = getNextFutureBillingDate(item.next_billing_date, item.billing_cycle);
    await database.execute(
      'UPDATE items SET is_active = 1, next_billing_date = $1, updated_at = $2 WHERE id = $3',
      [newNextDate, now, id]
    );
  } else {
    // When pausing, just flip the flag
    await database.execute(
      'UPDATE items SET is_active = 0, updated_at = $1 WHERE id = $2',
      [now, id]
    );
  }
}
```

**Edge case example**:
```
Scenario: User paused "Netflix" on Jan 1, 2026 (next_billing_date = Feb 1)
Time passes: Today is March 15, 2026
User action: Click resume/unpause
Logic: getNextFutureBillingDate('2026-02-01', 'monthly')
       → Advances: Feb 1 → Mar 1 → Apr 1 (first future date after today)
Result: next_billing_date updated to Apr 1, 2026 automatically
```

### Timezone Safety

The app uses **local dates only** to avoid timezone pitfalls:

```typescript
export function parseLocalDate(dateStr: string): Date {
  // Handle ISO strings with time component
  if (dateStr.includes('T')) {
    dateStr = dateStr.split('T')[0];
  }
  
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);  // Explicit local date constructor
}

export function formatISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');  // date-fns handles local time
}
```

**Never use** `new Date('2026-02-18')` — it treats the string as UTC and may shift the date by a day.

---

## Database Service (`src/services/database.ts`)

The database service is the **single source of truth** for all data operations. It uses `@tauri-apps/plugin-sql` to communicate with SQLite.

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

### Category CRUD

| Function | Purpose |
|----------|---------|
| `getCategories(type?)` | Fetch categories, optionally filtered by type |
| `createCategory(name, color, categoryType, icon?)` | Create new category with type |
| `updateCategory(id, name, color, icon?)` | Update existing category |
| `deleteCategory(id)` | Delete category (sets items to null) |

### Item CRUD

| Function | Purpose |
|----------|---------|
| `getItems(type?)` | Fetch all items, optionally filtered by type |
| `getActiveItems(type?)` | Filter to only active items |
| `getItemById(id)` | Fetch single item with category |
| `createItem(data)` | Create new item (bill or subscription) |
| `updateItem(id, data)` | Partial update of item |
| `deleteItem(id)` | Delete item (cascades to payments) |
| `toggleItemActive(id)` | Toggle is_active between 0/1 (handles date recalc) |

### Analytics Functions

```typescript
// Calculate total monthly cost (normalizes all billing cycles to monthly equivalent)
calculateMonthlySpending(items: ItemWithCategory[], type?: ItemType): number

// Calculate total yearly cost
calculateYearlySpending(items: ItemWithCategory[], type?: ItemType): number

// Group spending by category for charts
getSpendingByCategory(items: ItemWithCategory[], type?: ItemType): SpendingByCategory[]

// Get items due within N days
getUpcomingItems(items: ItemWithCategory[], days: number, type?: ItemType): ItemWithCategory[]

// Advance past-due items to their next billing date (called on app load)
advancePastDueItems(): Promise<number>
```

**Billing Cycle Normalization** (for analytics):
```typescript
switch (billing_cycle) {
  case 'weekly':    return amount * 52 / 12;    // 52 weeks/year ÷ 12 months
  case 'monthly':   return amount;
  case 'quarterly': return amount / 3;          // 4 quarters/year → ÷ 3 = monthly
  case 'yearly':    return amount / 12;
}
```

---

## Component Architecture

### App Shell (`App.tsx`)

The main app component manages:
- **View state**: Current active view (dashboard, bills, subscriptions, analytics, settings)
- **Data state**: Items and categories arrays
- **UI state**: Form visibility, editing state, form item type
- **Theme state**: Light/dark mode toggle
- **Data loading**: Centralized `loadData()` function refreshes all data

```typescript
type View = 'dashboard' | 'bills' | 'subscriptions' | 'analytics' | 'settings';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithCategory | null>(null);
  const [formItemType, setFormItemType] = useState<ItemType>('subscription');
  
  const loadData = useCallback(async () => {
    const [loadedItems, cats] = await Promise.all([
      getItems(),
      getCategories()
    ]);
    setItems(loadedItems);
    setCategories(cats);
  }, []);
}
```

**Navigation Structure**:
- Dashboard (tabs: All / Bills / Subscriptions)
- Bills → `ItemList` with `itemType="bill"`
- Subscriptions → `ItemList` with `itemType="subscription"`
- Analytics (tabs: All / Bills / Subscriptions)
- Settings (split category sections)

### Dashboard (`Dashboard.tsx`)

Shows at-a-glance metrics with **type filter tabs** (All / Bills / Subscriptions):
- Monthly/yearly spending totals (filtered by type)
- Active item count (filtered by type)
- Upcoming renewals (7 days, filtered by type)
- Spending by category pie chart (filtered by type)

### ItemList (`ItemList.tsx`)

Generic list component that displays either bills or subscriptions based on `itemType` prop.

```typescript
interface ItemListProps {
  items: ItemWithCategory[];
  categories: Category[];
  itemType: ItemType;  // 'bill' | 'subscription'
  onEdit: (item: ItemWithCategory) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleActive: (id: string) => Promise<void>;
  onAddNew: () => void;
}
```

**Features**:
- Auto-filters items by `item_type`
- Dynamic labels ("Add Bill" vs "Add Subscription")
- Search filtering by name
- Category dropdown filter (shows only matching type categories)
- Show/hide inactive toggle
- Card-based grid layout
- Context menu (edit, pause/resume, delete)
- Delete confirmation dialog
- Empty states with action buttons

### ItemForm (`ItemForm.tsx`)

Modal form for creating/editing items with type-aware behavior.

```typescript
interface ItemFormProps {
  item: ItemWithCategory | null;  // null = create mode
  categories: Category[];
  itemType: ItemType;
  onSave: (data: ItemFormData) => Promise<void>;
  onClose: () => void;
}
```

**Features**:
- Filters category dropdown by `itemType`
- Dynamic labels ("Bill" vs "Subscription" in title)
- **Smart date recalculation** when billing_cycle or start_date changes
- Validation with error messages
- Shake animation on validation failure
- Pre-fills data when editing (preserves original item_type)
- Form error summary display

### Analytics (`Analytics.tsx`)

Displays spending insights with **type filter tabs** (All / Bills / Subscriptions):
- Monthly spending trend (line chart)
- Category breakdown (horizontal bar chart)
- Top 5 most expensive items (label adapts to filter)

### Settings (`Settings.tsx`)

**Split category management** by type:

1. **Subscription Categories** section
   - Shows only categories where `category_type = 'subscription'`
   - Add creates category with `category_type = 'subscription'`

2. **Bill Categories** section
   - Shows only categories where `category_type = 'bill'`
   - Add creates category with `category_type = 'bill'`

Both sections have:
- Color picker with 18 color options
- Inline edit mode with Enter key support
- Delete functionality (default categories protected)
- Create loading spinner

### UI Primitives (`src/components/ui/`)

#### ConfirmDialog.tsx
Reusable confirmation modal with variants (danger/warning/info).

```typescript
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}
```

#### EmptyState.tsx
Placeholder for empty views with icon, title, description, and optional action button.

#### Skeleton.tsx
Loading skeleton components: `Skeleton`, `SkeletonCard`, `SkeletonSubscriptionCard`, `SkeletonChartCard`, `SkeletonListItem`.

---

## Key Patterns

### 1. Optimistic UI Updates

Data is reloaded after every mutation to ensure UI consistency:

```typescript
const handleCreateItem = async (data: ItemFormData) => {
  await createItem(data);
  await loadData();  // Refresh everything
  setShowForm(false);
};
```

### 2. Theme Management

Theme stored in state and localStorage, applied to `document.documentElement`:

```typescript
const [theme, setTheme] = useState<'light' | 'dark'>(() => {
  return localStorage.getItem('theme') as 'light' | 'dark' || 'light';
});

useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('theme', theme);
}, [theme]);
```

### 3. Form State Management

Forms use controlled components with a single `formData` object:

```typescript
const [formData, setFormData] = useState<ItemFormData>({...});

const handleChange = (e) => {
  setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
};
```

### 4. Type-Aware Component Pattern

Components accept `itemType` prop and filter data accordingly:

```typescript
// In ItemList
const filteredItems = useMemo(() => 
  items.filter(item => item.item_type === itemType),
  [items, itemType]
);

const relevantCategories = useMemo(() =>
  categories.filter(c => c.category_type === itemType),
  [categories, itemType]
);
```

### 5. Currency Formatting

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
- `animate-pulse` - Loading skeleton

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
            sql: "...",  // Creates tables + seeds default subscription categories
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_bills_support",
            sql: "...",  // Renames subscriptions→items, adds item_type/category_type, seeds bill categories
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

**Critical**: Without `sql:allow-execute`, INSERT/UPDATE/DELETE operations fail silently.

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

## Recent Changes (v1.1)

### Smart Billing Date Recalculation

**Problem**: When editing a subscription's billing cycle, the `next_billing_date` wasn't being recalculated, leaving it stale or incorrect.

**Solution**: Added intelligent date recalculation logic with context-aware semantics.

**New function**: `getNextFutureBillingDate(anchorDate, cycle)` in `dates.ts`
- Advances from any anchor date until result is strictly after today
- Handles past start dates, cycle changes, and resumed items

**Changes**:
- `ItemForm.tsx` — `handleChange` now recalculates dates when:
  - `start_date` changes (user correcting when they subscribed)
  - `billing_cycle` changes (user switching plans)
- `database.ts` — `toggleItemActive()` recalculates `next_billing_date` when resuming
- `database.ts` — `advancePastDueItems()` refactored to use new utility

**Semantics**:
| Action | Anchor | Reason |
|--------|--------|--------|
| Create item | `start_date` | New subscription date |
| Edit `start_date` | New `start_date` | User correcting history |
| Edit `billing_cycle` | Today | User switching plans (reset clock) |
| Resume item | Past `next_billing_date` | Advance past dates to future |

---

## Future Roadmap

### Planned Features
- [ ] **Notifications**: Renewal reminders via system notifications (service is configured)
- [ ] **Payment History**: UI for viewing/recording payments
- [ ] **Data Export**: Export to CSV/JSON for backup
- [ ] **Cloud Sync**: Optional E2EE sync (requires auth system)
- [ ] **Recurring Payment Auto-Advance**: Auto-update next_billing_date after it passes
- [ ] **Bill-specific fields**: Account numbers, payment methods, auto-pay status
- [ ] **Budget Alerts**: Notify when spending exceeds threshold

### Known Caveats & Edge Cases

**Manual override gets clobbered**:
- If a user manually edits `next_billing_date`, then changes `billing_cycle` or `start_date`, the manual edit is overwritten.
- **Mitigation**: Could add a `nextDateManuallyEdited` flag to skip auto-recalc.

**End-of-month drift**:
- date-fns handles months intelligently: Jan 31 + 1 month = Feb 28, then Mar 28 (not Mar 31).
- **Status**: Acceptable behavior; users can manually adjust if needed.

**Past `next_billing_date` during session**:
- If a user sets `next_billing_date` to the past manually, it stays that way until app restart.
- **Status**: Minor; `advancePastDueItems()` fixes it on next launch.

### Technical Debt
- [ ] Add proper error boundaries
- [ ] Implement loading skeletons for all async states
- [ ] Add unit tests for date utilities
- [ ] Add unit tests for database service
- [ ] Persist dark mode preference to localStorage (done)
- [ ] Add keyboard navigation support
- [ ] Optimize re-renders with React.memo

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

### Port 1420 already in use
**Cause**: Previous dev server still running
**Fix**: `lsof -ti:1420 | xargs kill -9`

### Form inputs not updating
**Cause**: Possibly conflicting event handlers or state not syncing
**Fix**: Check browser DevTools console for errors, verify `handleChange` is wired correctly

---

## Important Notes for Future Development

### Billing Date Logic is Critical Path
Any changes to:
- `getNextFutureBillingDate()`
- `handleChange()` in ItemForm
- `toggleItemActive()` in database.ts

...should be treated as high-risk. Write tests. Verify edge cases.

### Type-Scoped Categories
Categories are now scoped to `item_type`. This means:
- A "Streaming" category for subscriptions is separate from bills
- The UI filters categories by type to avoid confusion
- Don't break this assumption

### Local Date Only
Always use `parseLocalDate()` and `formatISODate()`. Never trust ISO strings with time components or `new Date(dateStr)`.

### Tauri Permissions
Permissions must match what the code actually uses. If adding new features (e.g., clipboard, file system), update `capabilities/default.json`.

---

## Contact

This app was built collaboratively with AI assistance. For questions about the implementation, refer to this document or the inline code comments.

**Co-Authored-By**: Warp <agent@warp.dev>

Last Updated: January 19, 2026
