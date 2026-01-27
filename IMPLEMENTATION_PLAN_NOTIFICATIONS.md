# Multi-Channel External Notifications Implementation Plan

## Executive Summary

Implement cloud-based, multi-channel notifications (Telegram, Discord, Slack) that send reminders even when the desktop app is closed. This solves the current limitation where notifications only work while the app is running.

**Architecture:** Supabase Edge Functions + pg_cron (daily scheduled job) + pluggable provider pattern

**User Configuration:** Settings UI for channel credentials, stored encrypted in Supabase

**Backward Compatible:** Desktop notifications remain as fallback

---

## Implementation Phases

### Phase 1: Database Schema (30 min)

Create migration: `/supabase/migrations/20260124000000_add_notification_channels.sql`

**Tables:**
1. `user_notification_settings` - Per-user channel config (credentials encrypted)
2. `notification_audit_log` - Deduplication and debugging (unique per user+item+channel+date)

**Key Features:**
- pgcrypto encryption for sensitive credentials (bot tokens, webhook URLs)
- RLS policies (users see only their own data, service role can insert logs)
- Encryption helper functions: `encrypt_credential()`, `decrypt_credential()`

---

### Phase 2: Supabase Edge Functions (2-3 hours)

**Structure:**
```
/supabase/functions/
├── send-notifications/
│   ├── index.ts                    # Main handler, cron entry point
│   ├── providers/
│   │   ├── base.ts                 # Abstract provider interface
│   │   ├── telegram.ts             # Telegram Bot API (fetch-based)
│   │   ├── discord.ts              # Discord webhooks
│   │   └── slack.ts                # Slack incoming webhooks
│   └── types.ts                    # TypeScript interfaces
└── test-notification/
    └── index.ts                    # Test endpoint for UI validation
```

**Key Design:**
- **Unified handler** processes all channels (vs. per-channel functions)
- **Native fetch()** - No npm dependencies needed
- **Provider pattern** - Easy to add new channels
- **Deduplication** - Check audit log before sending
- **Graceful failure** - One channel failure doesn't block others

**Message Flow:**
```
pg_cron (9 AM daily)
  ↓
Edge Function: send-notifications
  ↓
Query active items due within reminder window
  ↓
For each item + enabled channel:
  - Check audit log (sent today?)
  - Decrypt credentials
  - Send via provider
  - Log result
```

---

### Phase 3: Scheduled Job (15 min)

Run in Supabase SQL Editor:

```sql
SELECT cron.schedule(
    'send-daily-notifications',
    '0 9 * * *',  -- 9 AM UTC daily
    $$
    SELECT net.http_post(
        url:='https://[PROJECT-ID].supabase.co/functions/v1/send-notifications',
        headers:='{"Authorization": "Bearer [SERVICE_ROLE_KEY]"}'::jsonb,
        body:='{}'::jsonb
    );
    $$
);
```

**Future Enhancement:** Hourly cron with timezone-aware filtering for per-user send times

---

### Phase 4: Frontend Settings UI (2 hours)

**New Component:** `/src/components/NotificationSettings.tsx`

**Features:**
- Enable/disable toggles for each channel
- Credential input fields (password-masked)
- "Test Connection" button per channel (calls test-notification Edge Function)
- Success/failure indicators
- Telegram setup help accordion (explains BotFather flow)
- Notification time picker + timezone selector

**Integration:**
- Add to existing `/src/components/Settings.tsx` after Bill Categories section

**Database Service Additions:** `/src/services/database.ts`
- `getNotificationSettings()` - Fetch user settings
- `saveNotificationSettings()` - Upsert with encryption
- `testNotificationChannel()` - Call test Edge Function

---

### Phase 5: Backward Compatibility (30 min)

**Modify:** `/src/services/notifications.ts`

**Logic:**
- Check if user has external notifications enabled
- If NO external notifications → Continue desktop notifications (current behavior)
- If YES external notifications → Desktop notifications optional (user can disable in OS)
- Keep localStorage deduplication for desktop (independent from audit log)

**No Breaking Changes:** Existing users unaffected unless they opt into external channels

---

## Critical Files to Create/Modify

### New Files (Create)
1. `/supabase/migrations/20260124000000_add_notification_channels.sql` - Schema
2. `/supabase/functions/send-notifications/index.ts` - Main handler
3. `/supabase/functions/send-notifications/providers/base.ts` - Interface
4. `/supabase/functions/send-notifications/providers/telegram.ts` - Telegram
5. `/supabase/functions/send-notifications/providers/discord.ts` - Discord
6. `/supabase/functions/send-notifications/providers/slack.ts` - Slack
7. `/supabase/functions/send-notifications/types.ts` - Types
8. `/supabase/functions/test-notification/index.ts` - Test endpoint
9. `/src/components/NotificationSettings.tsx` - Settings UI

### Existing Files (Modify)
10. `/src/services/database.ts` - Add notification CRUD functions
11. `/src/services/notifications.ts` - Add external notification awareness
12. `/src/components/Settings.tsx` - Import and render NotificationSettings
13. `/src/types/index.ts` - Add NotificationSettings type

---

## User Setup Flow (Telegram Example)

1. User opens Settings → Notifications
2. Enables "Telegram" toggle
3. Clicks help icon → Sees instructions:
   - Message @BotFather → `/newbot` → Get token
   - Start chat with bot
   - Visit `api.telegram.org/bot[TOKEN]/getUpdates` → Get chat ID
4. Pastes bot token + chat ID into fields
5. Clicks "Test Connection"
6. Receives test message on Telegram
7. Clicks "Save Settings"
8. Next day at 9 AM: Automatic reminders via Telegram

---

## Security Measures

- **Encryption at rest:** pgcrypto with Supabase Vault key
- **RLS policies:** User isolation (can't see others' credentials)
- **Service role only:** Edge Functions decrypt with service key
- **HTTPS only:** All webhook/API calls encrypted in transit
- **URL validation:** Check Discord/Slack URL patterns before saving
- **No npm packages:** Native fetch reduces supply chain risk

---

## Deployment Checklist

```bash
# 1. Apply database migration
npx supabase db push

# 2. Deploy Edge Functions
npx supabase functions deploy send-notifications
npx supabase functions deploy test-notification

# 3. Set encryption key secret
npx supabase secrets set ENCRYPTION_KEY=$(openssl rand -base64 32)

# 4. Schedule cron job (run SQL manually in Supabase dashboard)
# Copy cron SQL from Phase 3

# 5. Test end-to-end
# Create test item due tomorrow, configure Telegram, verify notification
```

---

## Testing Strategy

**Unit Tests:**
- Provider credential validation
- Message formatting (markdown escaping)
- Error handling

**Integration Tests:**
1. Telegram: Create bot, send test, verify received
2. Discord: Create webhook, send test, verify embed
3. Slack: Create webhook, send test, verify blocks
4. Scheduled job: Set time to +1 min, wait, verify sent
5. Deduplication: Run job twice, verify only one notification
6. Multi-channel: Enable Telegram + Discord, verify both received
7. Failure handling: Invalid token, verify logged as failed

**End-to-End Scenario:**
- User creates subscription "Netflix" due in 1 day with reminder_days=1
- User enables Telegram + Discord
- Wait for scheduled job (or trigger manually)
- Verify notifications on both channels
- Check audit log shows 2 "sent" entries
- Re-run job, verify no duplicate notifications

---

## Monitoring & Observability

**Key Metrics:**
- Notification success rate by channel (query audit log)
- User adoption (count enabled channels)
- Edge Function invocation count
- Cron job execution logs

**Useful SQL Queries:**

```sql
-- Success rate (last 7 days)
SELECT channel,
       COUNT(*) as total,
       SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) as successful
FROM notification_audit_log
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY channel;

-- Recent failures
SELECT user_id, channel, error_message, sent_at
FROM notification_audit_log
WHERE status = 'failed'
ORDER BY sent_at DESC
LIMIT 10;
```

---

## Future Enhancements

**Phase 2+ (Not in Initial Scope):**
- SMS notifications via Twilio
- Email notifications
- Retry logic for failed sends (exponential backoff)
- Per-item channel preferences (send Netflix reminders only to Telegram)
- Notification history viewer in UI
- Rich notifications with action buttons ("Mark Paid", "Snooze")
- Multiple notification times (7 days, 3 days, 1 day, day-of)
- User timezone-aware scheduling (vs. fixed 9 AM UTC)

---

## Technical Details

### Provider Implementations

**Telegram:**
- API: `https://api.telegram.org/bot{TOKEN}/sendMessage`
- Format: MarkdownV2 (requires character escaping)
- Auth: Bot token in URL
- Rate limit: 30 msgs/second per bot

**Discord:**
- API: Webhook URL (from channel settings)
- Format: JSON embeds (title, description, fields, color)
- Auth: Embedded in webhook URL
- Rate limit: 5 requests/2 seconds per webhook

**Slack:**
- API: Incoming webhook URL
- Format: Block Kit (header, section, fields)
- Auth: Embedded in webhook URL
- Rate limit: Not strictly enforced

**All use native fetch() - No packages needed!**

---

## Rollback Plan

If issues arise:

```sql
-- Disable cron job
SELECT cron.unschedule('send-daily-notifications');

-- Drop tables (DESTRUCTIVE)
DROP TABLE notification_audit_log;
DROP TABLE user_notification_settings;
```

```bash
# Delete Edge Functions
npx supabase functions delete send-notifications
npx supabase functions delete test-notification
```

Desktop notifications continue working (unaffected).

---

## Verification Steps

After implementation, verify:

1. ✅ Database tables created with RLS enabled
2. ✅ Edge Functions deployed and accessible
3. ✅ Cron job scheduled (check `cron.job` table)
4. ✅ Settings UI renders without errors
5. ✅ Test Connection works for each channel
6. ✅ Credentials encrypted in database (inspect table, see base64)
7. ✅ Manual Edge Function invocation sends notifications
8. ✅ Scheduled cron triggers function (check logs next day)
9. ✅ Audit log records sent notifications
10. ✅ Deduplication prevents duplicate sends

---

## Dependencies

**No new npm packages required!**

- Edge Functions use Deno runtime with native fetch()
- Frontend uses existing `@supabase/supabase-js`
- Database uses built-in pgcrypto extension

**Environment Variables:**
- `ENCRYPTION_KEY` - Supabase secret (generate with openssl)
- `SUPABASE_URL` - Auto-provided by Edge Functions
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Edge Functions

---

## Current System Review

**Existing Notification System (`src/services/notifications.ts`):**
- Desktop-only (macOS, Windows, Linux via Tauri)
- Requires app running
- localStorage deduplication
- Triggered by: App load, real-time Supabase updates, debounced reloads
- Works with `reminder_days` field (0, 1, 3, 7)
- Uses `shouldRemindToday()` from `src/utils/dates.ts`

**This Plan:**
- **Adds** external channels (Telegram, Discord, Slack)
- **Keeps** desktop notifications as fallback
- **Enables** notifications when app closed (via pg_cron)
- **Maintains** backward compatibility
- **Enhances** with test UI and audit logging

---

## Implementation Order

Follow this sequence for smooth implementation:

1. **Phase 1:** Database Schema (foundation for everything)
2. **Phase 2:** Edge Functions (core notification logic)
3. **Phase 3:** Scheduled Job (automation)
4. **Phase 4:** Frontend Settings UI (user configuration)
5. **Phase 5:** Backward Compatibility (desktop notifications integration)

---

## Notes

- All sensitive credentials are encrypted using pgcrypto
- Edge Functions run in Deno runtime with TypeScript support
- RLS policies ensure users can only access their own notification settings
- Audit log provides deduplication and debugging capabilities
- Test endpoints allow users to verify their configuration before going live
