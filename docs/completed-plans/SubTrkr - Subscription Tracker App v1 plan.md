# SubTrkr - Subscription Tracker App
## Problem Statement
Build a local-first desktop app to track recurring subscriptions with spending analytics, category organization, and renewal reminders. Future-ready for optional E2EE cloud sync.
## Tech Stack
* **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
* **Backend**: Tauri 2.0 + Rust
* **Database**: SQLite via `tauri-plugin-sql`
* **Notifications**: `tauri-plugin-notification` for renewal reminders
* **Package Manager**: Bun
## Project Structure
```warp-runnable-command
SubTrkr/
├── src/                    # React frontend
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── SubscriptionList/
│   │   ├── SubscriptionForm/
│   │   ├── Analytics/
│   │   └── Settings/
│   ├── hooks/
│   ├── services/
│   │   └── database.ts     # SQLite wrapper
│   ├── types/
│   └── App.tsx
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs
│   │   └── commands.rs     # Custom Tauri commands
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```
## Database Schema
```SQL
-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Subscriptions table
CREATE TABLE subscriptions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_cycle TEXT NOT NULL,  -- 'weekly', 'monthly', 'quarterly', 'yearly'
  category_id TEXT REFERENCES categories(id),
  next_billing_date TEXT NOT NULL,
  start_date TEXT NOT NULL,
  notes TEXT,
  url TEXT,
  is_active INTEGER DEFAULT 1,
  reminder_days INTEGER DEFAULT 3,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
-- Payment history (for analytics)
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT REFERENCES subscriptions(id),
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```
## Core Features (v1)
### 1. Dashboard
* Total monthly/yearly spending at a glance
* Upcoming renewals (next 7 days)
* Spending breakdown by category (donut chart)
* Quick-add subscription button
### 2. Subscription Management
* Add/edit/delete subscriptions
* Fields: name, amount, billing cycle, category, next billing date, reminder preference
* Mark as active/paused
* Bulk actions (pause, delete)
### 3. Category Organization
* Default categories: Streaming, Software, Gaming, News, Fitness, Other
* Custom categories with color picker
* Filter subscriptions by category
### 4. Spending Analytics
* Monthly spending trends (line chart)
* Year-over-year comparison
* Category breakdown
* Most expensive subscriptions
### 5. Renewal Reminders
* System notifications X days before renewal
* Background check using Tauri's notification plugin
* Configurable reminder timing (1, 3, 7 days)
## UI/UX Design Direction
Following the frontend-design principles: a **refined minimalist** aesthetic with:
* Light, airy color palette with vibrant category accents
* Generous whitespace, rounded corners (2xl)
* Subtle shadows and glassmorphism for depth
* Smooth micro-animations (300ms transitions)
* Typography: distinctive display font (e.g., Cabinet Grotesk) + clean body (e.g., Plus Jakarta Sans)
* Dark mode support
## Implementation Phases
### Phase 1: Foundation (Day 1-2)
1. Initialize Tauri + React + TypeScript project with Bun
2. Configure Tailwind CSS with custom design tokens
3. Set up SQLite plugin and create database schema
4. Build database service layer (CRUD operations)
### Phase 2: Core UI (Day 3-4)
1. Dashboard layout with spending overview cards
2. Subscription list with filtering/sorting
3. Add/Edit subscription modal form
4. Category management
### Phase 3: Analytics & Polish (Day 5-6)
1. Spending analytics charts (using Recharts or Chart.js)
2. Notification system for renewal reminders
3. Settings panel (currency, default reminder timing)
4. Dark mode toggle
### Phase 4: Refinement (Day 7)
1. Edge case handling and error states
2. Empty states with helpful onboarding
3. Keyboard shortcuts
4. Performance optimization
## Future Enhancements (v2+)
* **E2EE Sync**: Optional cloud sync with end-to-end encryption
* **WebAuthn/Passkey**: Passwordless authentication for sync
* **Import/Export**: CSV import, data export
* **Receipt Tracking**: Attach payment receipts
* **Budget Alerts**: Notify when spending exceeds threshold
## Commands to Initialize
```warp-runnable-command
# Create Tauri + React + TypeScript project
bunx create-tauri-app SubTrkr --template react-ts --manager bun
# Add Tauri plugins
cd SubTrkr/src-tauri
cargo add tauri-plugin-sql --features sqlite
cargo add tauri-plugin-notification
# Add frontend dependencies
cd ..
bun add @tauri-apps/plugin-sql @tauri-apps/plugin-notification
bun add -D tailwindcss postcss autoprefixer
bun add lucide-react recharts uuid
bun add -D @types/uuid
```
