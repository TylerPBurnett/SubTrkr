use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                CREATE TABLE IF NOT EXISTS categories (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    color TEXT NOT NULL,
                    icon TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS subscriptions (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT DEFAULT 'USD',
                    billing_cycle TEXT NOT NULL,
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

                CREATE TABLE IF NOT EXISTS payments (
                    id TEXT PRIMARY KEY,
                    subscription_id TEXT REFERENCES subscriptions(id) ON DELETE CASCADE,
                    amount REAL NOT NULL,
                    paid_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );

                -- Insert default categories
                INSERT OR IGNORE INTO categories (id, name, color, icon) VALUES
                    ('cat-streaming', 'Streaming', '#ef4444', 'tv'),
                    ('cat-software', 'Software', '#3b82f6', 'code'),
                    ('cat-gaming', 'Gaming', '#8b5cf6', 'gamepad-2'),
                    ('cat-news', 'News', '#f59e0b', 'newspaper'),
                    ('cat-fitness', 'Fitness', '#10b981', 'dumbbell'),
                    ('cat-music', 'Music', '#ec4899', 'music'),
                    ('cat-cloud', 'Cloud Storage', '#06b6d4', 'cloud'),
                    ('cat-other', 'Other', '#6b7280', 'box');
            "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "rename_subscriptions_to_items_add_types",
            sql: r#"
                -- Rename subscriptions table to items
                ALTER TABLE subscriptions RENAME TO items;

                -- Add item_type column (bill or subscription)
                ALTER TABLE items ADD COLUMN item_type TEXT DEFAULT 'subscription';

                -- Add category_type column to categories
                ALTER TABLE categories ADD COLUMN category_type TEXT DEFAULT 'subscription';

                -- Update existing categories to be subscription type
                UPDATE categories SET category_type = 'subscription' WHERE category_type IS NULL;

                -- Rename column in payments table (SQLite workaround: create new table)
                CREATE TABLE payments_new (
                    id TEXT PRIMARY KEY,
                    item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
                    amount REAL NOT NULL,
                    paid_at TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                );
                INSERT INTO payments_new (id, item_id, amount, paid_at, created_at)
                    SELECT id, subscription_id, amount, paid_at, created_at FROM payments;
                DROP TABLE payments;
                ALTER TABLE payments_new RENAME TO payments;

                -- Insert default bill categories
                INSERT OR IGNORE INTO categories (id, name, color, icon, category_type) VALUES
                    ('cat-utilities', 'Utilities', '#f97316', 'zap', 'bill'),
                    ('cat-housing', 'Housing', '#84cc16', 'home', 'bill'),
                    ('cat-insurance', 'Insurance', '#0ea5e9', 'shield', 'bill'),
                    ('cat-phone', 'Phone & Internet', '#8b5cf6', 'smartphone', 'bill'),
                    ('cat-transport', 'Transportation', '#f59e0b', 'car', 'bill');
            "#,
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
