# Notification System Setup Guide

This guide walks through the final setup steps to enable Telegram, Discord, and Slack notifications for your users.

---

## What's Already Done ✅

- Database tables with RLS policies
- Edge Functions deployed:
  - `send-notifications` — main scheduled function + test mode
  - `save-channel-secret` — secure Vault write proxy
  - ~~`telegram-webhook`~~ — **Not needed** (users own their bots)
- Complete UI in Settings with connect/test/toggle

---

## What Users Will Do

Your users configure everything in-app:

### **Telegram** (User-Owned Bot)
1. Settings → Notification Channels → Telegram → Connect
2. Follow two-step wizard:
   - **Step 1:** Create bot via @BotFather, paste bot token
   - **Step 2:** Message their bot with `/start`, get chat ID, paste it
3. Click "Connect" — done!

### **Discord**
1. Create webhook in Discord server settings
2. Settings → Notification Channels → Discord → Connect
3. Paste webhook URL → Save
4. Click "Test" to verify

### **Slack**
1. Create Incoming Webhook app in Slack workspace
2. Settings → Notification Channels → Slack → Connect
3. Paste webhook URL → Save
4. Click "Test" to verify

---

## What YOU Need to Setup (One-Time)

Only one thing remains: **Enable automated daily notifications via pg_cron**.

### Enable pg_cron for Automated Notifications

This schedules the Edge Function to run daily at 8:00 AM UTC.

#### Via Supabase Dashboard (SQL Editor)

1. Go to https://supabase.com/dashboard/project/<your-project-ref>/sql
2. Click **"New Query"**
3. Paste this SQL:

```sql
-- Store project URL in Vault (for cron job to call Edge Function)
SELECT vault.create_secret('<https://YOUR-PROJECT.supabase.co>', 'project_url');

-- Store anon key in Vault (for cron job authorization)
SELECT vault.create_secret('<YOUR_ANON_KEY>', 'anon_key');

-- Schedule daily notification check at 8:00 AM UTC
SELECT cron.schedule(
  'daily-notification-check',
  '0 8 * * *',  -- Every day at 8:00 AM UTC
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'anon_key')
    ),
    body := jsonb_build_object('scheduled', true, 'time', now()),
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);
```

4. Click **"Run"**

#### Verify cron job is scheduled:

```sql
SELECT * FROM cron.job WHERE jobname = 'daily-notification-check';
```

You should see one row with `active = true`.

---

## Testing

### Test Discord/Slack:
1. In SubTrkr Settings → Notification Channels
2. Configure the channel (paste webhook URL)
3. Click **"Test"** button
4. You should receive a message instantly

### Test Telegram:
1. Configure Telegram (bot token + chat ID)
2. Keep the channel enabled (toggling off clears reminders)
3. Click **"Test"** — you should get a message from your bot

### Test Scheduled Notifications (optional):
Manually trigger the Edge Function to simulate a scheduled run:

```bash
curl -X POST \
  https://YOUR-PROJECT.supabase.co/functions/v1/send-notifications \
  -H "Authorization: Bearer <YOUR_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"scheduled":true}'
```

Check the notification log in SubTrkr Settings to see results.

---

## How It Works

### User-Owned Bots (Telegram)
- Each user creates their own bot via @BotFather
- They paste the bot token (stored securely in Vault)
- They message their bot to get their chat ID (stored in metadata)
- Notifications go directly from Edge Function → Telegram API → User's bot → User's chat
- **Privacy:** You never see their bot token or messages

### Webhooks (Discord/Slack)
- Users create webhooks in their servers/workspaces
- They paste the webhook URL (stored securely in Vault)
- Notifications POST to the webhook URL
- **Privacy:** You never see the webhook content

### Scheduled Notifications
- pg_cron runs daily at 8:00 AM UTC
- Queries `get_items_due_for_notification()` for all users
- Sends to enabled channels for each user
- Respects user's timezone preference
- Deduplicates (won't send twice in one day)
- Logs all delivery attempts

---

## Troubleshooting

### Discord/Slack webhook not working:
- Verify the URL is correct (HTTPS, correct domain)
- Check Edge Function logs: Supabase Dashboard → Edge Functions → send-notifications → Logs
- Try the webhook directly with curl:
  ```bash
  curl -X POST https://discord.com/api/webhooks/... \
    -H "Content-Type: application/json" \
    -d '{"content":"test"}'
  ```

### Telegram not working:
- Verify bot token is correct (test with `https://api.telegram.org/bot<TOKEN>/getMe`)
- Verify chat ID is correct (numeric, no spaces)
- Check Edge Function logs: send-notifications → Logs
- Make sure user sent `/start` to their bot first

### Scheduled notifications not sending:
- Check if cron job is active: `SELECT * FROM cron.job;`
- Check pg_cron logs: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`
- Ensure Vault secrets (`project_url`, `anon_key`) are created
- Verify items exist with `next_billing_date` within reminder_days

### Notifications going to wrong timezone:
- Users can set their timezone in Settings → Notification Preferences → Timezone
- The Edge Function respects the user's timezone for delivery timing

---

## Optional Enhancements

### Adjust cron schedule:
Change `'0 8 * * *'` to your preferred time:
- `'0 */6 * * *'` = Every 6 hours
- `'0 9 * * *'` = 9:00 AM UTC
- `'0 0 * * *'` = Midnight UTC

### Add more channels:
The architecture supports adding more channels easily. Just:
1. Add a new dispatcher function (e.g., `channels/pushover.ts`)
2. Add the channel to the `notification_channel` enum in the migration
3. Add UI for that channel in `NotificationSettings.tsx`

---

## Architecture Benefits

✅ **Privacy-First:** Users own their bots/webhooks, you never see their data
✅ **Simple Setup:** In-app configuration, no API keys to manage
✅ **Secure:** Tokens/webhooks stored in Vault with encryption
✅ **Reliable:** Server-side delivery works even when app is closed
✅ **Scalable:** Each user's bot is independent, no single point of failure
✅ **Transparent:** Full delivery log visible in Settings

---

## Summary

**You only need to:**
1. Run the SQL above to enable pg_cron (5 minutes)

**Your users can:**
1. Open Settings → Notification Channels
2. Click "Connect" on any channel
3. Follow the wizard (paste bot token/webhook URL)
4. Click "Test" to verify
5. Done! Automated reminders work even when app is closed

All without leaving SubTrkr. Simple, secure, and privacy-respecting.
