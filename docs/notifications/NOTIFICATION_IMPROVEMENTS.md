# Notification System Improvements

This document outlines potential enhancements to the SubTrkr notification system, organized by effort level and impact.

---

## ✅ Implemented Features

### 1. Timezone-Aware Delivery (Implemented Feb 2026)

**Status:** ✅ **COMPLETED**

Notifications are now sent at 9 AM user's local time. The system runs hourly and filters users by timezone.

**See:** `../architecture/TIMEZONE_IMPLEMENTATION.md` for full details.

---

### 2. Per-Item Reminder Days (Already Working)

**Status:** ✅ **ALREADY IMPLEMENTED**

The `items.reminder_days` column exists and is fully functional. Users can override the global `default_reminder_days` on a per-subscription basis.

**To expose in UI:**
Add "Reminder days" input field to SubscriptionForm component (optional field, shows "or use default: X days" placeholder).

---

## Quick Wins (Low Effort, High Impact)

### 3. Quiet Hours

**Problem:**
One global `default_reminder_days` setting (e.g., 3 days) for all subscriptions. Users want different lead times:
- Annual $500 subscription → 14 days notice to budget
- Monthly $1 subscription → 1 day notice is fine

**Solution:**
Add optional `reminder_days` column to `items` table. Falls back to `default_reminder_days` if null.

**Implementation:**
1. **Database migration:**
   ```sql
   ALTER TABLE items ADD COLUMN reminder_days INT;
   ```

2. **Update function:**
   ```sql
   -- In get_items_due_for_notification()
   COALESCE(i.reminder_days, np.default_reminder_days) as reminder_days
   ```

3. **UI changes:**
   - Add "Reminder days" input to SubscriptionForm
   - Show override badge in subscription list if custom value set

**Effort:** ~3-4 hours
**Impact:** High - power users will love the flexibility

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ Remind me:                          │
│ [3] days before (or leave blank for│
│ default)                            │
└─────────────────────────────────────┘
```

---

### 3. Quiet Hours

**Problem:**
Notifications can arrive at inconvenient times. Users want to silence notifications during sleep or work hours.

**Solution:**
Use existing `quiet_hours_start` and `quiet_hours_end` columns in `notification_preferences`.

**Implementation:**
1. **UI in NotificationSettings:**
   ```tsx
   <Toggle enabled={quietHoursEnabled} />
   <TimePicker start={quietHoursStart} end={quietHoursEnd} />
   // e.g., "Do not send between 10pm - 7am"
   ```

2. **Edge Function logic:**
   ```typescript
   function isInQuietHours(userPrefs: NotificationPreferences): boolean {
     if (!userPrefs.quiet_hours_start) return false;

     const now = new Date();
     const userNow = convertToTimezone(now, userPrefs.timezone);
     const currentTime = userNow.getHours() * 60 + userNow.getMinutes();

     const start = parseTime(userPrefs.quiet_hours_start); // "22:00" → 1320 mins
     const end = parseTime(userPrefs.quiet_hours_end);     // "07:00" → 420 mins

     // Handle overnight ranges (e.g., 10pm - 7am)
     if (start > end) {
       return currentTime >= start || currentTime < end;
     }
     return currentTime >= start && currentTime < end;
   }

   // In send loop:
   if (isInQuietHours(userPrefs)) {
     await logNotification({ status: "skipped", error_message: "quiet hours" });
     continue;
   }
   ```

**Effort:** ~4-5 hours
**Impact:** Medium - nice quality-of-life feature

---

## Medium Effort

### 4. Daily Digest Mode

**Problem:**
Users with many subscriptions get bombarded with individual messages. 5 subscriptions due this week = 5 separate messages.

**Solution:**
Add a "Daily Digest" preference. Instead of per-item messages, send one consolidated summary.

**Implementation:**
1. **Database:**
   ```sql
   ALTER TABLE notification_preferences ADD COLUMN digest_mode BOOLEAN DEFAULT false;
   ```

2. **Edge Function logic:**
   ```typescript
   if (userPrefs.digest_mode) {
     // Group items by user, send one message
     const summary = formatDigestMessage(itemsByUser.get(userId));
     await dispatchToChannel(channel, secret, metadata, summary);
   } else {
     // Existing per-item logic
     for (const item of items) { ... }
   }
   ```

3. **Message template:**
   ```typescript
   function formatDigestMessage(items: DueItem[]): string {
     const grouped = {
       today: items.filter(i => daysUntil(i) === 0),
       thisWeek: items.filter(i => daysUntil(i) > 0 && daysUntil(i) <= 7),
       later: items.filter(i => daysUntil(i) > 7),
     };

     return `📋 *SubTrkr Daily Summary*\n\n` +
       (grouped.today.length ? `⚠️ *Due Today:*\n${formatList(grouped.today)}\n\n` : '') +
       (grouped.thisWeek.length ? `📅 *This Week:*\n${formatList(grouped.thisWeek)}\n\n` : '') +
       `Total: ${formatCurrency(totalAmount(items))}`;
   }
   ```

**Effort:** ~6-8 hours
**Impact:** High for power users with many subscriptions

**Example Output:**
```
📋 *SubTrkr Daily Summary*

⚠️ *Due Today:*
• Netflix ($15.99)

📅 *This Week:*
• Spotify ($9.99) — in 2 days
• Adobe ($52.99) — in 5 days
• Dropbox ($11.99) — in 7 days

Total: $48.96
```

---

### 5. Notification Preferences Per Channel

**Problem:**
Currently, all channels receive all notification types. Some users want:
- "Send renewals to Telegram, trial expirations to email"
- "Only send high-value items (>$50) to Discord"

**Solution:**
Let users configure which event types each channel receives.

**Implementation:**
1. **UI in NotificationSettings:**
   ```tsx
   <ChannelCard channel="telegram">
     <Checkbox checked={sendRenewals}>Renewal reminders</Checkbox>
     <Checkbox checked={sendTrials}>Trial expirations</Checkbox>
     <Input placeholder="Min amount ($)">50</Input>
   </ChannelCard>
   ```

2. **Database:**
   ```sql
   -- Already exists!
   notification_channels.event_types ARRAY

   -- Add filter criteria
   ALTER TABLE notification_channels ADD COLUMN filters JSONB DEFAULT '{}';
   -- e.g., { "min_amount": 50, "categories": ["streaming", "software"] }
   ```

3. **Edge Function:**
   ```typescript
   // Check event type (already implemented)
   if (!channelConfig.event_types.includes(item.event_type)) continue;

   // Check filters
   const filters = channelConfig.filters || {};
   if (filters.min_amount && item.amount < filters.min_amount) continue;
   if (filters.categories?.length && !filters.categories.includes(item.category)) continue;
   ```

**Effort:** ~5-7 hours
**Impact:** Medium - advanced feature for power users

---

## Bigger Features

### 6. Smart Annual Subscription Alerts

**Problem:**
Annual subscriptions are easy to forget. Users don't think about them until the day of charge. By then it's too late to cancel.

**Solution:**
Different notification cadence for annual/long-cycle subscriptions:
- 30 days before (monthly reminder)
- 14 days before
- 7 days before
- 1 day before
- Day of

**Implementation:**
1. **Update `get_items_due_for_notification()` function:**
   ```sql
   -- Current: single reminder based on reminder_days
   -- New: multiple reminders for annual items

   CASE
     WHEN billing_cycle = 'yearly' THEN
       -- Return if within 30 days and not sent at this milestone
       next_billing_date - NOW() IN (30, 14, 7, 1, 0) days
     ELSE
       -- Normal flow
       next_billing_date - reminder_days <= NOW()
   END
   ```

2. **Enhance deduplication:**
   ```typescript
   // Current: dedupe by user_id, item_id, channel, event_type
   // New: dedupe by milestone too
   const dedupeKey = `${userId}:${itemId}:${channel}:${eventType}:${milestone}`;
   ```

3. **Message templates:**
   ```typescript
   function formatAnnualReminderMessage(item: NotifItem, days: number): string {
     if (days === 30) {
       return `📅 *One Month Notice*\n\n${item.item_name} annual renewal (${amount}) is coming up in 30 days. Time to decide if you still need it!`;
     }
     if (days === 7) {
       return `⚠️ *One Week Left*\n\n${item.item_name} (${amount}) renews in 7 days. Cancel now if you don't want to be charged.`;
     }
     // etc.
   }
   ```

**Effort:** ~8-10 hours
**Impact:** Very high - prevents unwanted annual charges

---

### 7. Cancellation Flow

**Problem:**
When users cancel a subscription, they:
1. Want to track when it actually ends (often not immediate)
2. Want a reminder if it's still active near the end date
3. Forget to mark it as cancelled in the app

**Solution:**
Add "Cancelled" status with optional `cancelled_date` and `cancellation_ends` fields.

**Implementation:**
1. **Database migration:**
   ```sql
   ALTER TABLE items ADD COLUMN cancelled_date DATE;
   ALTER TABLE items ADD COLUMN cancellation_ends DATE;
   -- Update enum
   ALTER TYPE item_status ADD VALUE 'cancelled';
   ```

2. **UI changes:**
   - Add "Mark as Cancelled" button to subscription card
   - Modal: "When does this subscription end?" (auto-suggest next billing date)
   - Show countdown in UI: "14 days left" with warning badge
   - Filter: "Show cancelled" toggle

3. **Notification logic:**
   ```typescript
   // Send final reminder before cancellation ends
   if (item.status === 'cancelled' && item.cancellation_ends) {
     const daysLeft = daysBetween(new Date(), new Date(item.cancellation_ends));
     if (daysLeft === 7 || daysLeft === 1) {
       const message = `⏰ *Subscription Ending*\n\n` +
         `${item.item_name} access ends in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. ` +
         `Make sure to download any data or migrate before then!`;
       await sendNotification(message);
     }
   }
   ```

4. **Auto-archive:**
   ```sql
   -- After cancellation_ends date passes, auto-archive
   UPDATE items
   SET status = 'inactive'
   WHERE status = 'cancelled'
     AND cancellation_ends < CURRENT_DATE;
   ```

**Effort:** ~10-12 hours
**Impact:** High - prevents data loss and helps users manage trial-to-cancel flow

**UI Mockup:**
```
┌─────────────────────────────────────┐
│ Netflix                    ⚠️ 14d   │
│ $15.99/month • Cancelled            │
│                                     │
│ Access ends: Feb 24, 2026           │
│ [Reactivate] [Archive Now]         │
└─────────────────────────────────────┘
```

---

## Future Ideas (Lower Priority)

### 8. Price Change Detection
Monitor for price increases and notify users. Requires web scraping or API integrations.

### 9. Bill Splitting
Share subscription costs with family/friends. Track who owes what.

### 10. Category Budgets
"Alert me if I'm spending >$50/month on streaming services."

### 11. Discount Hunting
Integrate with promo code APIs to suggest cheaper alternatives.

### 12. Smart Recommendations
"You pay for Netflix, Hulu, and HBO Max separately. Disney+ bundle would save you $15/month."

### 13. Receipt Attachments
Let users upload receipts/invoices for record-keeping.

### 14. Export to CSV/PDF
Generate spending reports for taxes or budgeting.

### 15. Recurring Bill Negotiation
Partner with bill negotiation services (Truebill, Rocket Money) for affiliate revenue.

---

## Priority Recommendation

~~If I had to pick **3 to do next**, based on user impact and effort:~~

~~1. **Per-item reminder days** (Quick Win #2) — 3-4 hours, huge flexibility gain~~ ✅ **DONE**
~~2. **Timezone-aware delivery** (Quick Win #1) — 2-3 hours, everyone benefits~~ ✅ **DONE**

**Top 3 to do next** (Updated Feb 2026):

1. **Quiet hours** (Quick Win #3) — 4-5 hours, quality-of-life improvement
2. **Smart annual subscription alerts** (Big Feature #6) — 8-10 hours, prevents costly surprises
3. **Daily digest mode** (Medium Effort #4) — 6-8 hours, high value for power users

These three would make SubTrkr significantly more powerful without overwhelming complexity.

---

## Notes

- All database schema changes above require migrations
- Test thoroughly before deploying notification logic changes (deduplication is critical)
- Consider adding feature flags for gradual rollout
- User testing would be valuable for digest mode and cancellation flow UX

---

**Last Updated:** February 8, 2026
**Current Version:** v1.0 (Telegram, Discord, Slack notifications working)
