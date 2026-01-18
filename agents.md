# SubTrkr - Codebase Documentation

> **Purpose**: This document provides comprehensive context for AI agents and developers working on SubTrkr. It covers architecture, data flow, key patterns, and implementation details.

---

## Overview

**SubTrkr** is a local-first desktop application for tracking recurring **subscriptions** and **bills**. Built with modern web technologies wrapped in a native shell, it prioritizes privacy by storing all data locally.

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

### Key Directories

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
│   │       ├── ConfirmDialog.tsx # Confirmation modal
│   │       └── EmptyState.tsx    # Empty state placeholder
│   ├── services/
│   │   ├── database.ts           # All database operations
│   │   └── notifications.ts      # Renewal reminder notifications
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

The SQLite database (`subtrkr.db`) contains three tables. **Migration 2** renamed `subscriptions` → `items` and added type fields.

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

#### `items` (formerly `subscriptions`)
Unified table for both subscriptions and bills.

```sql
CREATE TABLE items (
    id TEXT PRIMARY KEY,              -- Format: 'item-{uuid}'
    name TEXT NOT NULL,               -- Service/bill name
    amount REAL NOT NULL,             -- Cost per billing cycle
    currency TEXT DEFAULT 'USD',      -- ISO currency code
    billing_cycle TEXT NOT NULL,      -- 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    category_id TEXT REFERENCES categories(id),
    next_billing_date TEXT NOT NULL,  -- ISO date string
    start_date TEXT NOT NULL,         -- When tracking began
    notes TEXT,                       -- User notes
    url TEXT,                         -- Service website
    is_active INTEGER DEFAULT 1,      -- 1 = active, 0 = paused
    reminder_days INTEGER DEFAULT 3,  -- Days before billing to remind
    item_type TEXT DEFAULT 'subscription',  -- 'subscription' | 'bill'
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

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
  is_active: number;       // SQLite boolean
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
  reminder_days: string;
  item_type: ItemType;
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
| `getCategories(type?)` | Fetch categories, optionally filtered by type |
| `createCategory(name, color, type, icon?)` | Create new category with type |
| `updateCategory(id, name, color, icon?)` | Update existing category |
| `deleteCategory(id)` | Delete category (sets items to null) |
| `getItems(type?)` | Fetch all items, optionally filtered by type |
| `getActiveItems(type?)` | Filter to only active items |
| `getItemById(id)` | Fetch single item with category |
| `createItem(data)` | Create new item (bill or subscription) |
| `updateItem(id, data)` | Partial update of item |
| `deleteItem(id)` | Delete item (cascades to payments) |
| `toggleItemActive(id)` | Toggle is_active between 0/1 |

### Analytics Functions

```typescript
// Calculate total monthly cost (normalizes all billing cycles)
calculateMonthlySpending(items: ItemWithCategory[]): number

// Calculate total yearly cost
calculateYearlySpending(items: ItemWithCategory[]): number

// Group spending by category for charts
getSpendingByCategory(items: ItemWithCategory[]): SpendingByCategory[]

// Get items due within N days
getUpcomingRenewals(items: ItemWithCategory[], days = 7): ItemWithCategory[]

// Calculate next billing date based on cycle
advanceNextBillingDate(item: Item): string
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

The `FilterTab` type controls which items appear in all widgets.

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

Features:
- Auto-filters items by `item_type`
- Dynamic labels ("Add Bill" vs "Add Subscription")
- Search filtering by name
- Category dropdown filter (shows only matching type categories)
- Show/hide inactive toggle
- Card-based grid layout
- Context menu (edit, pause/resume, delete)
- Delete confirmation dialog

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

Features:
- Filters category dropdown by `itemType`
- Dynamic labels ("Bill" vs "Subscription" in title)
- Validation with error messages
- Shake animation on validation failure
- Pre-fills data when editing (preserves original item_type)

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
- Inline edit mode
- Delete functionality

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

**Migration 2 Details** (adds bills support):
1. Renames `subscriptions` table to `items`
2. Adds `item_type TEXT DEFAULT 'subscription'` to items
3. Adds `category_type TEXT DEFAULT 'subscription'` to categories
4. Recreates `payments` table with `item_id` foreign key
5. Inserts default bill categories (Utilities, Housing, Insurance, Phone & Internet, Transportation)

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
- [ ] **Notifications**: Renewal reminders (tauri-plugin-notification is configured, service exists)
- [ ] **Payment History**: UI for viewing/recording payments
- [ ] **Data Export**: Export to CSV/JSON
- [ ] **Cloud Sync**: Optional E2EE sync (requires auth system)
- [ ] **Recurring Payment Auto-Advance**: Auto-update next_billing_date after it passes
- [ ] **Bill-specific fields**: Account numbers, payment methods, auto-pay status

### Technical Debt
- [ ] Add proper error boundaries
- [ ] Implement loading skeletons for all async states
- [ ] Add unit tests for database service
- [x] ~~Persist dark mode preference to localStorage~~ (implemented)
- [ ] Add keyboard navigation support

### Recent Changes (v1.1 - Bills Support)
- Renamed `subscriptions` table to `items` with `item_type` field
- Added `category_type` to categories for type-scoped categorization
- Created unified `ItemList` and `ItemForm` components
- Added Bills navigation item in sidebar
- Dashboard now has All/Bills/Subscriptions filter tabs
- Analytics now has All/Bills/Subscriptions filter tabs
- Settings split into Subscription Categories and Bill Categories sections
- Updated notifications service to use `ItemWithCategory`

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
