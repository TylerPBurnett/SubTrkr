# Timezone-Aware Notifications Implementation

## Overview

SubTrkr now sends notifications at **9 AM local time** for each user, based on their timezone preference. This ensures users receive reminders at a convenient time regardless of their location.

---

## What Changed

### Before (Daily at 8 AM UTC)
- Single cron job ran at 8 AM UTC
- All users worldwide received notifications at the same moment
- Los Angeles users got notifications at 12 AM (midnight)
- Tokyo users got notifications at 5 PM

### After (Hourly, 9 AM Local Time)
- Cron job runs every hour
- Users only receive notifications when their local time is 9 AM
- Los Angeles users get notifications at 9 AM PST
- Tokyo users get notifications at 9 AM JST

---

## Why 9 AM?

Based on industry research of financial apps:

**Apps using 9 AM:**
- Truebill/Rocket Money (subscription manager)
- Mint (bill reminders)
- Apple subscriptions
- Google Calendar (all-day event reminders)

**Reasoning:**
1. **High engagement time** - People check phones during morning routine
2. **Actionable hours** - Users can cancel subscriptions or call support during business hours
3. **Not disruptive** - Unlike midnight or late evening
4. **Context appropriate** - Financial decisions made when alert

**Fixed vs. Customizable:**
Most financial apps (banks, subscription managers) do NOT allow users to customize notification time. We follow this pattern for simplicity. If 5+ users request customization, we can add a time picker in Phase 2.

---

## Technical Implementation

### Database Function: `get_items_due_for_notification()`

**Key Changes:**
1. **Added timezone filtering:**
   ```sql
   AND EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE np.timezone)) = 9
   ```
   This converts current UTC time to user's timezone and checks if it's the 9 AM hour (9:00-9:59).

2. **Joined with `notification_preferences`:**
   ```sql
   INNER JOIN public.notification_preferences np ON i.user_id = np.user_id
   ```
   Previously the function only looked at `items` table. Now it joins with `notification_preferences` to get:
   - `timezone` (for filtering)
   - `default_reminder_days` (fallback when `items.reminder_days` is null)

3. **Returns timezone field:**
   Added `user_timezone` to return type for debugging/logging purposes.

**Per-Item Reminder Days:**
The function uses `COALESCE(i.reminder_days, np.default_reminder_days)`, meaning:
- If a subscription has a custom `reminder_days` value → use it
- Otherwise → fall back to user's `default_reminder_days` preference

This means **per-item reminder customization already works!** (It was part of the original schema but not documented as a feature yet.)

### Cron Schedule

**Old:**
```sql
'0 8 * * *'  -- Daily at 8 AM UTC
```

**New:**
```sql
'0 * * * *'  -- Every hour at minute 0
```

**Job name changed:**
- `daily-notification-check` → `hourly-notification-check`

### Edge Function: `send-notifications` (v5)

**Changes:**
- Updated `DueItem` interface to include `user_timezone: string`
- Updated comment: "No items due" → "No items due for this hour"
- No functional changes needed - timezone filtering happens entirely in the SQL function

**Execution frequency:**
- Before: Once per day (24 hours)
- After: 24 times per day (every hour)
- Each execution is smaller and faster (fewer users per run)

---

## How It Works: Hourly Flow

### Example: 3 Users in Different Timezones

**Current time:** 17:00 UTC (5 PM)

| User | Timezone | Local Time | 9 AM? | Notification Sent? |
|------|----------|------------|-------|-------------------|
| Alice | America/Los_Angeles (PST) | 9:00 AM | ✅ Yes | ✅ Yes |
| Bob | America/New_York (EST) | 12:00 PM | ❌ No (already past 9 AM) | ❌ No |
| Carol | Asia/Tokyo (JST) | 2:00 AM | ❌ No (not 9 AM yet) | ❌ No |

**At 17:00 UTC:**
1. Cron triggers hourly job
2. Edge Function calls `get_items_due_for_notification()`
3. SQL function checks all users:
   - Alice: PST time is 9:00 AM → include her items
   - Bob: EST time is 12:00 PM → skip
   - Carol: JST time is 2:00 AM → skip
4. Only Alice's notifications are sent

**Next hour (18:00 UTC):**
- Alice: 10:00 AM → skip
- Bob: 1:00 PM → skip
- Carol: 3:00 AM → skip
- No notifications sent this hour

**Later (00:00 UTC, next day):**
- Carol: JST time is 9:00 AM → include her items
- Carol receives her notifications

---

## User Experience

### Setting Timezone

**In Settings → Notification Channels:**
1. User selects timezone from dropdown (e.g., "America/Los_Angeles")
2. Saved to `notification_preferences.timezone`
3. Default: "UTC" if not set

**Supported timezones:**
All IANA timezone identifiers (e.g., "America/New_York", "Europe/London", "Asia/Tokyo")

### Setting Reminder Days

**Global default:**
- Settings → Notification Channels → "Default reminder days" (e.g., 3 days)
- Applies to all subscriptions unless overridden

**Per-item override:**
- When editing a subscription → "Reminder days" field (optional)
- Example: Set annual subscriptions to 14 days, monthly to 1 day
- If blank, uses global default

### Example Scenario

**User:** Alice in Los Angeles (PST = UTC-8)
**Preferences:**
- Timezone: "America/Los_Angeles"
- Default reminder days: 3

**Subscription:** Netflix, renews Feb 15

**What happens:**
- Feb 12 at 9:00 AM PST: Notification sent ("Netflix due in 3 days")
- Feb 13 at 9:00 AM PST: No notification (already sent once today)
- Feb 14 at 9:00 AM PST: No notification (only sends once per renewal window)
- Feb 15: Subscription renews

**Deduplication:**
The system ensures only one notification per item per day, even if the cron runs 24 times. This is handled by the bulk deduplication check in the Edge Function.

---

## Testing

### Manual Test (Force Send)

Since you can't wait 24 hours to test, you can manually trigger the Edge Function:

```bash
curl -X POST https://bpgsfyallqqvvtjorybl.supabase.co/functions/v1/send-notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"scheduled": true}'
```

This will process all users where local time is currently 9 AM.

### Create Test Data

To test without waiting for real renewals:

```sql
-- Set your timezone (if not already set)
INSERT INTO notification_preferences (user_id, default_reminder_days, timezone)
VALUES (auth.uid(), 3, 'America/Los_Angeles')
ON CONFLICT (user_id) DO UPDATE SET timezone = 'America/Los_Angeles';

-- Create a test subscription due tomorrow
INSERT INTO items (id, user_id, name, amount, billing_cycle, item_type, next_billing_date, start_date, status, reminder_days)
VALUES (
  'test-' || gen_random_uuid()::text,
  auth.uid(),
  'Test Netflix',
  15.99,
  'monthly',
  'streaming',
  CURRENT_DATE + 1,  -- Due tomorrow
  CURRENT_DATE - 30,
  'active',
  1  -- Notify 1 day before
);
```

Then wait until your local time hits 9:00-9:59 AM and check for notification (or use the test button in the UI).

### Verify Cron Job

```sql
-- Check cron schedule
SELECT jobname, schedule, active, command
FROM cron.job
WHERE jobname = 'hourly-notification-check';

-- Should return: schedule = '0 * * * *', active = true
```

### Check Function Output

```sql
-- See which items would be processed right now
SELECT * FROM get_items_due_for_notification();

-- If empty, no users have local time = 9 AM right now
-- Try again in an hour
```

---

## Performance Impact

### Before vs. After

| Metric | Before (Daily) | After (Hourly) | Impact |
|--------|----------------|----------------|--------|
| Cron executions per day | 1 | 24 | 24x more frequent |
| Users processed per run | All users | ~1/24 of users | Much smaller |
| Total API calls per day | Same | Same | No change |
| Database queries per run | 3 queries | 3 queries | No change |
| Edge Function timeout risk | Higher (all at once) | Lower (distributed) | Better |

**Key insight:** Even though the cron runs 24x more often, each run is ~24x smaller and faster. Total work per day is the same, just distributed evenly.

**Scalability:**
- 100 users → ~4 users processed per hour
- 1,000 users → ~42 users per hour
- 10,000 users → ~417 users per hour (still completes in seconds thanks to v4 optimizations)

No architectural changes needed until 100K+ users.

---

## Future Enhancements

### If Users Request Time Customization

Add `notification_time` column to `notification_preferences`:

```sql
ALTER TABLE notification_preferences
ADD COLUMN notification_time INT DEFAULT 9 CHECK (notification_time BETWEEN 6 AND 12);
```

Then update the SQL function:
```sql
AND EXTRACT(HOUR FROM (CURRENT_TIMESTAMP AT TIME ZONE np.timezone)) = np.notification_time
```

UI: Simple dropdown with options: 6 AM, 7 AM, 8 AM, 9 AM (default), 10 AM, 11 AM, 12 PM

**Decision:** Only implement if 5+ users request it. Keep simple for now.

---

## Troubleshooting

### "I'm not receiving notifications at 9 AM"

**Check 1: Timezone setting**
```sql
SELECT timezone FROM notification_preferences WHERE user_id = auth.uid();
```
If NULL or wrong timezone → update in Settings

**Check 2: Item is due**
```sql
SELECT * FROM get_items_due_for_notification() WHERE user_id = auth.uid();
```
If empty → no items due, or your local time isn't 9 AM hour yet

**Check 3: Channel is enabled**
```sql
SELECT channel, enabled FROM notification_channels WHERE user_id = auth.uid();
```
If enabled = false → toggle on in Settings

**Check 4: Already sent today**
```sql
SELECT * FROM notification_log
WHERE user_id = auth.uid()
  AND sent_at >= CURRENT_DATE
ORDER BY sent_at DESC;
```
If shows "sent" today → working correctly (deduplication prevents spam)

### "Notifications are coming at the wrong time"

**Verify your timezone:**
1. Go to Settings → Notification Channels
2. Check timezone dropdown
3. Make sure it matches your location (e.g., "America/Los_Angeles" not "America/New_York")

**Common mistakes:**
- Selecting UTC when you're in a different timezone
- Daylight saving time changes (IANA timezones handle this automatically)

---

## Migration Details

**Migration name:** `add_timezone_aware_notifications`

**Changes:**
1. Dropped and recreated `get_items_due_for_notification()` function (added `user_timezone` return field and timezone filtering)
2. Updated cron schedule via separate SQL (migrations can't modify `cron` table directly)

**Rollback (if needed):**
```sql
-- Recreate old function
DROP FUNCTION get_items_due_for_notification();
CREATE FUNCTION get_items_due_for_notification() ... -- (use old definition)

-- Revert cron schedule
SELECT cron.unschedule('hourly-notification-check');
SELECT cron.schedule('daily-notification-check', '0 8 * * *', ...);
```

---

## Summary

✅ **Deployed:** Timezone-aware notifications at 9 AM local time
✅ **Cron:** Runs hourly instead of daily
✅ **Function:** Filters by `EXTRACT(HOUR FROM ... AT TIME ZONE timezone) = 9`
✅ **Edge Function:** Updated to v5 (type changes only)
✅ **Testing:** All channels verified working
✅ **Documentation:** Complete

**No breaking changes** - existing users will automatically start receiving notifications at their 9 AM local time based on their timezone preference.
