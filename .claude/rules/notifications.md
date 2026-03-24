---
paths:
  - "src/services/notification*"
  - "src/components/NotificationSettings.tsx"
---

# Notification System Rules

## Architecture

- Tables: `notification_channels` (with `secret_value`), `notification_log`, `notification_preferences`
- Edge Functions: `send-notifications` v5
- Channels: Telegram (user-owned bots), Discord (webhook), Slack (webhook)
- pg_cron: `hourly-notification-check` runs every hour

## Key Patterns

- **Timezone-aware**: Sends at 9 AM user's local time (uses `EXTRACT(HOUR FROM ... AT TIME ZONE)`)
- **Per-item reminders**: `items.reminder_days` overrides `default_reminder_days`
- **Secrets**: Stored directly in `notification_channels.secret_value` (RLS protected, no Vault)
- **Optimizations**: Parallel dispatch (20 concurrent), bulk prefetch, bulk deduplication

## Telegram

- Users provide their own bot token and chat ID
- Auto-detect chat ID via webhook
- See: `docs/architecture/TELEGRAM_ARCHITECTURE.md`
