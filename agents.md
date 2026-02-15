# SubTrkr - Codebase Documentation

> **Purpose**: This document provides comprehensive context for AI agents and developers working on SubTrkr. It covers architecture, data flow, key patterns, and implementation details.

---

## Overview

**SubTrkr** is a **cloud-native desktop application** for tracking recurring **subscriptions** and **bills**. Built with modern web technologies wrapped in a native Tauri shell, it uses Supabase for cloud storage, authentication, and real-time synchronization across devices.

### Key Concept: Unified Items Model

SubTrkr uses a **unified data model** where both subscriptions and bills are stored in a single `items` table with an `item_type` field. This allows:

- Shared UI components (`ItemList`, `ItemForm`) with type-specific filtering
- Combined analytics with type filtering (All / Bills / Subscriptions)
- Categories scoped by type (`category_type` field)
- Simpler database queries and maintenance

### Tech Stack

| Layer              | Technology            | Purpose                                         |
| ------------------ | --------------------- | ----------------------------------------------- |
| **Native Shell**   | Tauri 2.0 (Rust)      | Desktop app packaging, native APIs              |
| **Frontend**       | React 19 + TypeScript | UI components and state management              |
| **Styling**        | Tailwind CSS 4        | Utility-first styling with custom design tokens |
| **Database**       | PostgreSQL (Supabase) | Cloud-native storage with RLS                   |
| **Authentication** | Supabase Auth         | Email/password + OTP (magic link)               |
| **Real-time**      | Supabase Realtime     | Live data sync across devices                   |
| **Charts**         | Recharts              | Data visualization                              |
| **Icons**          | Lucide React          | Consistent iconography                          |
| **Build**          | Vite + Bun            | Fast development and bundling                   |

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
│  │                        │                              │   │
│  │              ┌─────────▼─────────┐                   │   │
│  │              │   Auth Service    │                   │   │
│  │              │   (auth.ts)       │                   │   │
│  │              └─────────┬─────────┘                   │   │
│  │                        │                              │   │
│  │              ┌─────────▼─────────┐                   │   │
│  │              │  Supabase Client  │                   │   │
│  │              │  (supabase.ts)    │                   │   │
│  │              └─────────┬─────────┘                   │   │
│  └────────────────────────┼─────────────────────────────┘   │
│                           │                                  │
│                           ▼                                  │
│              ┌────────────────────────┐                      │
│              │    Supabase Cloud      │                      │
│              │  - PostgreSQL Database │                      │
│              │  - Row Level Security  │                      │
│              │  - Real-time Sync      │                      │
│              │  - Authentication      │                      │
│              └────────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Cloud-Native Design Principles

- **Cloud-only**: No offline mode - requires internet connection
- **Multi-device sync**: Real-time updates via Supabase Realtime subscriptions
- **User isolation**: Row-level security ensures users only see their own data
- **Session persistence**: Auth sessions stored in localStorage
- **Automatic re-authentication**: Token refresh handled by Supabase client

### Key Directories

```
SubTrkr/
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── AuthScreen.tsx        # Login/signup with email & OTP
│   │   ├── Dashboard.tsx         # Overview with stats, charts, type tabs
│   │   ├── ItemList.tsx          # Filterable item grid (bills OR subscriptions)
│   │   ├── ItemForm.tsx          # Add/edit modal (type-aware)
│   │   ├── Analytics.tsx         # Spending trends with type filter
│   │   ├── Settings.tsx          # Split category management + account info
│   │   └── ui/                   # Reusable UI primitives
│   │       ├── ConfirmDialog.tsx # Confirmation modal
│   │       └── EmptyState.tsx    # Empty state placeholder
│   ├── services/
│   │   ├── supabase.ts           # Supabase client singleton
│   │   ├── auth.ts               # Authentication operations
│   │   ├── database.ts           # All database CRUD operations
│   │   ├── seedCategories.ts     # Default category seeding
│   │   └── notifications.ts      # Renewal reminder notifications
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   ├── App.tsx                   # Auth state, real-time sync, routing
│   └── index.css                 # Tailwind config & custom styles
│
├── src-tauri/                    # Rust backend (minimal)
│   ├── src/
│   │   └── lib.rs                # Tauri setup (no SQL migrations)
│   ├── capabilities/
│   │   └── default.json          # Permission configuration
│   ├── Cargo.toml                # Rust dependencies
│   └── tauri.conf.json           # Tauri configuration
│
├── .env                          # Supabase credentials (not committed)
└── package.json                  # Frontend dependencies
```

---

## Data Model

### Database Schema

The PostgreSQL database is hosted on Supabase and contains three tables with Row-Level Security (RLS) policies.

#### `categories`

Organizes items into groups with visual styling. **Scoped by type** via `category_type`.

```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY DEFAULT ('cat-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,              -- Hex color (e.g., '#ef4444')
  icon TEXT,                        -- Reserved for future icon support
  category_type TEXT NOT NULL CHECK (category_type IN ('subscription', 'bill')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_categories_user_id ON categories(user_id);

-- RLS Policy
CREATE POLICY "Users manage own categories" ON categories
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Default Subscription Categories** (seeded client-side on first login):

- Streaming (#ef4444), Software (#3b82f6), Gaming (#8b5cf6)
- News (#f59e0b), Fitness (#10b981), Music (#ec4899)
- Cloud Storage (#06b6d4), Other (#6b7280)

**Default Bill Categories** (seeded client-side on first login):

- Utilities (#f97316), Housing (#84cc16), Insurance (#0ea5e9)
- Phone & Internet (#8b5cf6), Transportation (#f59e0b)

#### `items`

Unified table for both subscriptions and bills.

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY DEFAULT ('item-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- Service/bill name
  amount NUMERIC NOT NULL,          -- Cost per billing cycle
  currency TEXT DEFAULT 'USD',      -- ISO currency code
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  item_type TEXT NOT NULL CHECK (item_type IN ('subscription', 'bill')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  next_billing_date DATE NOT NULL,  -- DATE type (not TEXT)
  start_date DATE NOT NULL,         -- When tracking began
  notes TEXT,                       -- User notes
  url TEXT,                         -- Service website
  is_active BOOLEAN DEFAULT true,   -- PostgreSQL native boolean
  reminder_days INTEGER DEFAULT 3,  -- Days before billing to remind
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_next_billing ON items(user_id, next_billing_date);

-- RLS Policy
CREATE POLICY "Users manage own items" ON items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-update trigger
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

#### `payments`

Payment history for tracking.

```sql
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_at DATE NOT NULL,            -- When payment occurred
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_item_id ON payments(item_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- RLS Policy
CREATE POLICY "Users manage own payments" ON payments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### TypeScript Types (`src/types/index.ts`)

```typescript
type BillingCycle = "weekly" | "monthly" | "quarterly" | "yearly";
type ItemType = "subscription" | "bill";

interface Category {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  category_type: ItemType; // Scopes category to bill or subscription
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
  is_active: boolean; // PostgreSQL native boolean (not 0/1)
  reminder_days: number;
  item_type: ItemType; // 'subscription' | 'bill'
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
  amount: string; // String for form input
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

## Service Layer

### Supabase Client (`src/services/supabase.ts`)

Initializes the Supabase client as a singleton.

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage, // Persist auth session
  },
});
```

**Environment Variables** (`.env`):

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Auth Service (`src/services/auth.ts`)

Handles all authentication operations.

```typescript
import { supabase } from "./supabase";

// Sign up with email/password
export async function signUp(email: string, password: string): Promise<void>;

// Sign in with email/password
export async function signIn(email: string, password: string): Promise<void>;

// Send OTP code via email (magic link alternative)
export async function signInWithOtp(email: string): Promise<void>;

// Verify OTP code
export async function verifyOtp(email: string, token: string): Promise<void>;

// Sign out
export async function signOut(): Promise<void>;

// Get current session
export async function getSession(): Promise<Session | null>;

// Get current user
export async function getUser(): Promise<User | null>;

// Listen to auth state changes
export function onAuthStateChange(
  callback: (session: Session | null) => void,
): Unsubscribe;
```

### Database Service (`src/services/database.ts`)

The database service is the **single source of truth** for all data operations. It uses Supabase client to query PostgreSQL.

#### Key Differences from SQLite Version

1. **No connection management** - Supabase client handles connections
2. **User ID required** - All queries include `user_id` filter (RLS backup)
3. **Boolean values** - `is_active` uses `true/false` instead of `1/0`
4. **Server-side IDs** - PostgreSQL generates IDs with prefixes (`cat-{uuid}`, `item-{uuid}`)
5. **Relational queries** - Uses PostgREST syntax: `.select('*, category:categories(*)')`

#### Helper Function

```typescript
async function getUserId(): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}
```

#### CRUD Operations

| Function                                   | Purpose                                       |
| ------------------------------------------ | --------------------------------------------- |
| `getCategories(type?)`                     | Fetch categories, optionally filtered by type |
| `createCategory(name, color, type, icon?)` | Create new category with type                 |
| `updateCategory(id, name, color, icon?)`   | Update existing category                      |
| `deleteCategory(id)`                       | Delete category (sets items to null)          |
| `getItems(type?)`                          | Fetch all items with joined categories        |
| `getActiveItems(type?)`                    | Filter to only active items                   |
| `getItemById(id)`                          | Fetch single item with category               |
| `createItem(data)`                         | Create new item (bill or subscription)        |
| `updateItem(id, data)`                     | Partial update of item                        |
| `deleteItem(id)`                           | Delete item (cascades to payments)            |
| `toggleItemActive(id)`                     | Toggle is_active boolean                      |

#### Example Query Pattern

```typescript
export async function getItems(type?: ItemType): Promise<ItemWithCategory[]> {
  const userId = await getUserId();

  let query = supabase
    .from("items")
    .select("*, category:categories(*)") // Relational join
    .eq("user_id", userId)
    .order("next_billing_date", { ascending: true });

  if (type) {
    query = query.eq("item_type", type);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    ...row,
    category: row.category || undefined,
  }));
}
```

#### Analytics Functions

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
  case "weekly":
    return (amount * 52) / 12;
  case "monthly":
    return amount;
  case "quarterly":
    return amount / 3;
  case "yearly":
    return amount / 12;
}
```

### Category Seeding (`src/services/seedCategories.ts`)

Seeds default categories on first login (client-side).

```typescript
export async function seedDefaultCategoriesIfNeeded(): Promise<void> {
  // Check if user already has categories
  const { count, error } = await supabase
    .from("categories")
    .select("*", { count: "exact", head: true });

  if (error) throw error;
  if (count && count > 0) return; // Already has categories

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Seed 13 default categories
  const allCategories = [
    ...DEFAULT_SUBSCRIPTION_CATEGORIES,
    ...DEFAULT_BILL_CATEGORIES,
  ].map((cat) => ({ ...cat, user_id: user.id }));

  const { error: insertError } = await supabase
    .from("categories")
    .insert(allCategories);
  if (insertError) throw insertError;
}
```

**Important**: Uses `useRef` flag in `App.tsx` to prevent race conditions from multiple calls.

---

## Component Architecture

### App Shell (`App.tsx`)

The main app component manages:

- **Auth state**: Session and loading state
- **View state**: Current active view (dashboard, bills, subscriptions, analytics, settings)
- **Data state**: Items and categories arrays
- **UI state**: Form visibility, editing state, form item type
- **Theme state**: Light/dark mode toggle
- **Network state**: Online/offline detection
- **Real-time sync**: Supabase Realtime subscriptions

```typescript
type View = 'dashboard' | 'bills' | 'subscriptions' | 'analytics' | 'settings';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [view, setView] = useState<View>('dashboard');
  const [items, setItems] = useState<ItemWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const hasSeededCategories = useRef(false);  // Prevents race condition

  // Auth state management
  useEffect(() => {
    getSession().then(session => {
      setSession(session);
      setAuthLoading(false);
    });

    return onAuthStateChange(session => setSession(session));
  }, []);

  // Seed categories on first login (once per app session)
  useEffect(() => {
    if (session && !hasSeededCategories.current) {
      hasSeededCategories.current = true;
      seedDefaultCategoriesIfNeeded().then(() => loadData());
    }
  }, [session]);

  // Real-time subscriptions
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, loadData]);

  // Network monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Render logic
  if (authLoading) return <div>Loading...</div>;
  if (!session) return <AuthScreen />;
  if (!isOnline) return <OfflineScreen />;

  return <MainApp />;
}
```

### AuthScreen (`AuthScreen.tsx`)

Handles user authentication with two modes:

1. **Email/Password Mode**
   - Sign up (requires email confirmation)
   - Sign in
   - Toggle between modes

2. **OTP Mode**
   - Request 6-digit code via email
   - Enter code to verify
   - Simpler flow (no password needed)

```typescript
interface AuthScreenProps {}

function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup" | "otp">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  // Handle form submissions...
}
```

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
  itemType: ItemType; // 'bill' | 'subscription'
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
  item: ItemWithCategory | null; // null = create mode
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

**Three main sections**:

1. **Subscription Categories**
   - Shows only categories where `category_type = 'subscription'`
   - Add creates category with `category_type = 'subscription'`

2. **Bill Categories**
   - Shows only categories where `category_type = 'bill'`
   - Add creates category with `category_type = 'bill'`

3. **Account**
   - Displays user email
   - Sign out button

All category sections have:

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
  --color-surface-50: #fafafa; /* Light bg */
  --color-surface-900: #171717; /* Dark bg */

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

**Simplified for cloud-native** - No SQL migrations or database plugin.

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Permissions (`capabilities/default.json`)

Minimal permissions (SQL removed):

```json
{
  "permissions": ["core:default", "opener:default", "notification:default"]
}
```

---

## Key Patterns

### 1. Real-Time Data Sync

Supabase Realtime subscriptions keep data in sync across devices:

```typescript
const channel = supabase
  .channel("db-changes")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "items",
    },
    () => loadData(),
  )
  .subscribe();
```

### 2. Row-Level Security (RLS)

All tables enforce user isolation at the database level:

```sql
CREATE POLICY "Users manage own items" ON items
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### 3. Optimistic UI Updates

Data is reloaded after every mutation to ensure UI consistency:

```typescript
const handleCreateItem = async (data: ItemFormData) => {
  await createItem(data);
  await loadData(); // Refresh everything
  setShowForm(false);
};
```

### 4. Theme Management

Theme stored in state and localStorage, applied to `document.documentElement`:

```typescript
const [theme, setTheme] = useState<"light" | "dark">(() => {
  return (localStorage.getItem("theme") as "light" | "dark") || "light";
});

useEffect(() => {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("theme", theme);
}, [theme]);
```

### 5. Type-Aware Component Pattern

Components accept `itemType` prop and filter data accordingly:

```typescript
// In ItemList
const filteredItems = useMemo(
  () => items.filter((item) => item.item_type === itemType),
  [items, itemType],
);

const relevantCategories = useMemo(
  () => categories.filter((c) => c.category_type === itemType),
  [categories, itemType],
);
```

### 6. Currency Formatting

Consistent currency display using `Intl.NumberFormat`:

```typescript
function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}
```

---

## Development

### Setup

1. **Clone and install**:

```bash
git clone <repo-url>
cd SubTrkr
bun install
```

2. **Configure Supabase**:
   - Create project at https://supabase.com
   - Run SQL migration from `agents.md` (see Supabase Setup section)
   - Create `.env` file:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Run app**:

```bash
bun tauri dev
```

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

### Supabase Setup

Run this SQL in Supabase Dashboard → SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY DEFAULT ('cat-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  category_type TEXT NOT NULL CHECK (category_type IN ('subscription', 'bill')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items table
CREATE TABLE items (
  id TEXT PRIMARY KEY DEFAULT ('item-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  item_type TEXT NOT NULL CHECK (item_type IN ('subscription', 'bill')),
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  next_billing_date DATE NOT NULL,
  start_date DATE NOT NULL,
  notes TEXT,
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  reminder_days INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Payments table
CREATE TABLE payments (
  id TEXT PRIMARY KEY DEFAULT ('pay-' || gen_random_uuid()::text),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  paid_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_next_billing ON items(user_id, next_billing_date);
CREATE INDEX idx_payments_item_id ON payments(item_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);

-- Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only access their own data)
CREATE POLICY "Users manage own categories" ON categories FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own items" ON items FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users manage own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE items;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;

-- Auto-update updated_at on items
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Adding a New Feature Checklist

1. **Types**: Add interfaces to `src/types/index.ts`
2. **Database**: Add schema changes in Supabase Dashboard SQL Editor
3. **Service**: Add CRUD functions to `database.ts`
4. **Component**: Create/update React components
5. **State**: Wire into `App.tsx` if needed
6. **RLS**: Add Row-Level Security policies in Supabase
7. **Real-time**: Subscribe to table changes if needed

---

## Testing Checklist

### Authentication & Session

- [ ] Sign up with email/password (requires email confirmation)
- [ ] Sign in with email/password
- [ ] Sign in with email code (OTP)
- [ ] Session persists after app restart
- [ ] Sign out works correctly
- [ ] Multiple accounts on same device

### Data Operations

- [ ] Create subscription/bill
- [ ] Edit subscription/bill
- [ ] Delete subscription/bill
- [ ] Toggle active/inactive
- [ ] Category assignment
- [ ] Data persists in Supabase

### Categories

- [ ] View subscription categories
- [ ] View bill categories
- [ ] Create new category
- [ ] Edit category (name, color)
- [ ] Delete category (items preserved)
- [ ] Default categories seed on first login
- [ ] No duplicate categories on re-login

### Real-Time Sync

- [ ] Open app in browser + desktop
- [ ] Create item in browser → appears in desktop
- [ ] Create item in desktop → appears in browser
- [ ] Edit in one → updates in other
- [ ] Delete in one → removes from other

### Dashboard & Analytics

- [ ] Monthly/yearly totals calculate correctly
- [ ] Filter tabs work (All / Bills / Subscriptions)
- [ ] Upcoming renewals show correct items
- [ ] Category breakdown chart accurate
- [ ] Top items list correct

### Offline Behavior

- [ ] Disconnect internet → offline screen appears
- [ ] Reconnect → app resumes normal operation

### Row-Level Security

- [ ] User A cannot see User B's data (test with 2 accounts)
- [ ] Direct database queries filtered by user_id

---

## Known Issues & Fixes

### Issue: Duplicate Categories on Login

**Cause**: Race condition in category seeding - `useEffect` with `[session]` dependency fired multiple times
**Fix**: Added `useRef` flag (`hasSeededCategories`) to ensure seeding runs only once per app session
**Location**: `App.tsx:95-106`

### Issue: Email Confirmation Redirects to Browser

**Cause**: Supabase email links open in browser, not Tauri app
**Workaround**: After clicking email confirmation link, return to desktop app and sign in with password
**Alternative**: Use OTP (email code) flow instead, or disable email confirmation in Supabase for development

---

## Production & Release

**Documentation**: See `docs/` for production workflows:
- [Production Release Workflow](docs/PRODUCTION_RELEASE_WORKFLOW.md) - Full release process and setup
- [Release Captain Checklist](docs/RELEASE_CAPTAIN_CHECKLIST.md) - Per-release execution checklist
- [Updater Testing Guide](docs/UPDATER_TESTING_GUIDE.md) - Test auto-updater before production

**Quick Reference**: Tag → CI builds → Users auto-update
```bash
# Bump version in package.json, tauri.conf.json, Cargo.toml, then:
git tag v1.0.11 && git push origin v1.0.11
```

## Future Roadmap

### High Priority

- [ ] **Production Build Testing**: Test built app on macOS/Windows/Linux
- [ ] **Email Redirect Handling**: Configure Supabase to redirect back to Tauri app after email confirmation
- [ ] **Notifications**: Renewal reminders (tauri-plugin-notification is configured)
- [ ] **Payment History UI**: Interface for viewing/recording payments
- [ ] **Auto-Advance Next Billing Date**: Background job to update past-due dates

### Medium Priority

- [ ] **Data Export**: Export to CSV/JSON
- [ ] **Bill-specific Fields**: Account numbers, payment methods, auto-pay status
- [ ] **Currency Support**: Multi-currency with exchange rates
- [ ] **Receipt Upload**: Store receipts in Supabase Storage
- [ ] **Budgeting**: Set spending limits per category

### Low Priority

- [ ] **Mobile App**: React Native version with shared Supabase backend
- [ ] **Shared Subscriptions**: Split costs with other users
- [ ] **Payment Method Tracking**: Credit cards, bank accounts
- [ ] **Reports**: PDF/HTML export of spending reports

### Technical Debt

- [ ] Add proper error boundaries
- [ ] Implement loading skeletons for all async states
- [ ] Add unit tests for database service
- [ ] Add E2E tests with Playwright
- [ ] Add keyboard navigation support
- [ ] Optimize bundle size
- [ ] Add Sentry error tracking

---

## Recent Changes

### Cloud-Native Migration (January 2025)

- Migrated from local SQLite to cloud Supabase PostgreSQL
- Added authentication with email/password + OTP
- Implemented Row-Level Security (RLS) policies
- Added real-time sync across devices
- Changed `is_active` from INTEGER (0/1) to BOOLEAN (true/false)
- Moved ID generation from client-side (uuid) to server-side (gen_random_uuid)
- Moved category seeding from Rust migrations to client-side service
- Added offline detection and auth screen
- Removed Tauri SQL plugin and all Rust database code
- Updated Settings to show account info and sign out button

### Bills Support (v1.1)

- Renamed `subscriptions` table to `items` with `item_type` field
- Added `category_type` to categories for type-scoped categorization
- Created unified `ItemList` and `ItemForm` components
- Added Bills navigation item in sidebar
- Dashboard now has All/Bills/Subscriptions filter tabs
- Analytics now has All/Bills/Subscriptions filter tabs
- Settings split into Subscription Categories and Bill Categories sections

---

## Troubleshooting

### "Failed to load resource" or "hostname could not be found"

**Cause**: `.env` file has placeholder credentials
**Fix**: Update `.env` with actual Supabase URL and anon key from your project

### Database tables don't exist

**Cause**: SQL migration not run in Supabase
**Fix**: Run the SQL migration in Supabase Dashboard → SQL Editor (see Supabase Setup section)

### Real-time sync not working

**Cause**: Realtime not enabled for tables
**Fix**: Run `ALTER PUBLICATION supabase_realtime ADD TABLE <table_name>;` for each table

### Session not persisting

**Cause**: localStorage not working or Supabase config issue
**Fix**: Check browser DevTools → Application → Local Storage for supabase keys

### Duplicate categories on every login

**Cause**: Old version without `useRef` fix
**Fix**: Update to latest code with `hasSeededCategories` ref in `App.tsx`
**Cleanup**: Run cleanup SQL in Supabase to remove duplicates (see session notes)

---

## Contact

This app was built collaboratively with AI assistance. Various AI agents were used, CC, Warp.dev, and Codex to name a few.For questions about the implementation, refer to this document or the inline code comments.
