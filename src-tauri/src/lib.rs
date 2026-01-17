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
