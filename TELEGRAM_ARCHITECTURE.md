# Telegram Notification Architecture

## Overview
SubTrkr sends subscription/bill reminders via Telegram using **user-owned bots**. Each user creates their own Telegram bot, which ensures privacy and gives users full control.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER SETUP (One-time)                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                  1. User opens NotificationSettings.tsx
                                    │
                  2. Creates bot via @BotFather on Telegram
                                    │
                  3. Pastes bot token → "Verify Bot"
                     ├─ Calls Telegram API: getMe
                     └─ Validates token, gets bot name
                                    │
                  4. Sends /start to their bot in Telegram
                                    │
                  5. Clicks "I sent /start"
                     ├─ Calls Telegram API: getUpdates
                     └─ Auto-detects chat_id
                                    │
                  6. Saves to database:
                     ├─ notification_channels.secret_value = bot_token
                     └─ notification_channels.metadata.chat_id = chat_id
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      NOTIFICATION DELIVERY                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────────────────────┐
│  pg_cron         │         │  User triggers test notification │
│  (Scheduled)     │         │  from UI                         │
└────────┬─────────┘         └─────────┬────────────────────────┘
         │                              │
         │  Daily at 8am UTC            │  Manual test
         │                              │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │  send-notifications          │
         │  Edge Function (Deno)        │
         └──────────┬───────────────────┘
                    │
      ┌─────────────┴─────────────┐
      │                           │
      ▼                           ▼
  SCHEDULED MODE             TEST MODE
      │                           │
      │ 1. Call DB function:      │ 1. Get user from JWT
      │    get_items_due_for_     │
      │    notification()         │ 2. Fetch their telegram
      │                           │    channel config from DB
      │ 2. Returns items due      │
      │    in next N days         │ 3. Read secret_value
      │                           │    (bot token) and
      │ 3. Group by user_id       │    metadata.chat_id
      │                           │
      │ 4. Prefetch all channels  │ 4. Format test message
      │    for all users (1 query)│    via templates.ts
      │                           │
      │ 5. Bulk deduplication     │ 5. Call dispatchToChannel()
      │    check (1 query + Set)  │
      │                           │
      │ 6. Build dispatch tasks   │
      │    for parallel execution │
      │                           │
      │ 7. Execute tasks with     │
      │    concurrency limit (20) │
      │                           │
      └─────────────┬─────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  dispatchToChannel()         │
         │  (channels/telegram.ts)      │
         └──────────┬───────────────────┘
                    │
                    │ POST https://api.telegram.org/bot{token}/sendMessage
                    │ Body: { chat_id, text, parse_mode: "Markdown" }
                    │
                    ▼
         ┌──────────────────────────────┐
         │  Telegram API                │
         │  delivers message to user    │
         └──────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────────────┐
         │  notification_log            │
         │  (DB table)                  │
         │  Records: sent/failed/error  │
         └──────────────────────────────┘
```

---

## Key Components

### 1. **Client (React)**
**File:** `src/components/NotificationSettings.tsx`
- UI for connecting Telegram bot
- Two-step wizard:
  - Step 1: Verify bot token via `getMe`
  - Step 2: Auto-detect chat ID via `getUpdates`
- Saves directly to database (no Edge Function for setup)

**File:** `src/services/notificationChannels.ts`
- `upsertNotificationChannel()` — writes bot token to `secret_value`

### 2. **Database**
**Table:** `notification_channels`
```sql
- user_id (UUID)
- channel (enum: 'telegram' | 'discord' | 'slack')
- enabled (boolean)
- secret_value (TEXT) — stores bot token
- metadata (JSONB) — stores { chat_id, bot_name }
- event_types (ARRAY) — ['renewal_reminder', 'trial_expiration']
```

**Table:** `notification_preferences`
```sql
- default_reminder_days (int) — days before due date
- timezone (text)
```

**Table:** `notification_log`
```sql
- user_id, channel, event_type, item_id
- status (sent/failed/skipped)
- error_message, sent_at
```

**Function:** `get_items_due_for_notification()`
- Returns all items where `next_billing_date - NOW() <= reminder_days`
- Also handles trial expirations

### 3. **Edge Functions (Deno)**

**Function:** `send-notifications` (v4 - Optimized)
- **Scheduled mode:** Called by pg_cron daily at 8am UTC
- **Test mode:** Called from UI when user clicks "Test" button
- Reads `secret_value` directly from `notification_channels` (no Vault)
- **Optimizations:**
  - Prefetch all channels (1 query vs N queries)
  - Bulk deduplication (1 query + Set vs N queries)
  - Parallel dispatch (20 concurrent vs sequential)
- Dispatches to channel-specific handlers

**Files:**
- `supabase/functions/send-notifications/index.ts` — main orchestrator
- `supabase/functions/send-notifications/channels/telegram.ts` — Telegram API
- `supabase/functions/send-notifications/channels/discord.ts` — Discord webhooks
- `supabase/functions/send-notifications/channels/slack.ts` — Slack webhooks
- `supabase/functions/send-notifications/utils/templates.ts` — **Message formatting**

### 4. **Telegram API**
**Endpoints used:**
- `POST /bot{token}/getMe` — Verify bot token (setup)
- `GET /bot{token}/getUpdates` — Get recent messages, find chat ID (setup)
- `POST /bot{token}/sendMessage` — Send notification (delivery)

---

## Data Flow: Scheduled Notification (Optimized v4)

1. **pg_cron** triggers at 8am UTC
2. Calls `send-notifications` Edge Function via HTTP POST
3. Edge Function queries `get_items_due_for_notification()`
4. **Optimization: Prefetch all channels** in one query (eliminates N+1)
5. **Optimization: Bulk deduplication** - single query + Set lookup (eliminates per-message queries)
6. Build dispatch tasks for all notifications
7. **Optimization: Parallel dispatch** with 20 concurrent limit (20x faster than sequential)
8. Each task:
   - Format message via `templates.ts`
   - POST to Telegram API
   - Log result to `notification_log`

---

## Security

- **RLS (Row Level Security):** Users can only read/write their own `notification_channels` rows
- **Bot tokens stored in plaintext** in `secret_value` column (protected by RLS)
- **Edge Function uses `service_role` key** to bypass RLS when reading all users' channels for scheduled delivery
- **No shared secrets:** Each user owns their bot token

---

## Deduplication (Optimized)

To prevent spam, the system uses bulk deduplication:
1. **Single query** fetches all notifications sent today for all users
2. Build in-memory **Set** with keys: `${user_id}:${item_id}:${channel}:${event_type}`
3. **O(1) lookup** before sending each message
4. If found in Set → skip
5. If not found → send and log

**Performance:** Reduced from N DB queries to 1 query + N Set lookups

---

## Message Formatting

**File:** `supabase/functions/send-notifications/utils/templates.ts`

### Current Templates:

**Renewal Reminder:**
```
⚠️ *Upcoming Payment*: Netflix ($15.99) is due in 3 days
```

**Trial Expiration:**
```
⏰ *Trial Expiring*: Spotify trial expires in 2 days. Full price: $9.99/monthly
```

**Test Message:**
```
✅ *SubTrkr Test Notification*

Your telegram notifications are working! You'll receive reminders here for upcoming payments and expiring trials.
```

### Formatting:
- Uses **Markdown** (`parse_mode: "Markdown"`)
- Supports: `*bold*`, `_italic_`, `` `code` ``, `[links](url)`
- Unicode emojis rendered natively

---

## pg_cron Setup

**Cron job:** `daily-notification-check`
- **Schedule:** `0 8 * * *` (8am UTC daily)
- **Action:** HTTP POST to `send-notifications` Edge Function
- **Secrets stored in Vault:**
  - `project_url` — Supabase project URL
  - `anon_key` — Public anon key (for auth)

---

## Performance & Scalability

**Current optimizations (v4):**
- ✅ Parallel dispatch with concurrency limiting (20 concurrent)
- ✅ Bulk database queries (prefetch channels, deduplication)
- ✅ O(1) deduplication with Set lookup
- ✅ Ready for 50K-100K users without architectural changes

**Benchmarks:**
| User Count | Notifications | Execution Time | DB Queries |
|------------|--------------|----------------|------------|
| 100 | 500 | ~6 seconds | 3 queries |
| 1,000 | 5,000 | ~1 minute | 3 queries |
| 10,000 | 50,000 | ~10 minutes | 3 queries |

**When to add more optimizations:**
- 100K+ users: Implement batch processing dispatcher
- 500K+ users: Consider message queue (BullMQ, Inngest)

---

## Future Improvements

1. **Quiet hours** — respect `notification_preferences.quiet_hours_start/end`
2. **Timezone-aware scheduling** — use `notification_preferences.timezone`
3. **Rich messages** — Telegram supports buttons, images, etc.
4. **Per-item reminder overrides** — custom `reminder_days` per subscription
5. **Batch notifications** — daily digest instead of per-item messages
6. **Batch dispatcher** — split into 1000-user batches for massive scale
