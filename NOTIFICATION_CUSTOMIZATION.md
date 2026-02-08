# Notification Message Customization Guide

## Where to Edit Messages

The notification templates are in the **`send-notifications` Edge Function**. Since we deployed it directly via the API, the source isn't in your local files. To customize messages, you need to redeploy the Edge Function with your changes.

---

## Current Message Templates

### 1. Renewal Reminder
**Function:** `formatRenewalMessage(item)`

```typescript
export function formatRenewalMessage(item: NotifItem): string {
  const amount = formatCurrency(item.amount, item.currency);
  const days = daysBetween(new Date(), new Date(item.next_billing_date));

  if (days === 0) return `⚠️ *Upcoming Payment*: ${item.item_name} (${amount}) is due today!`;
  if (days === 1) return `📅 *Upcoming Payment*: ${item.item_name} (${amount}) is due tomorrow`;
  return `📅 *Upcoming Payment*: ${item.item_name} (${amount}) is due in ${days} days`;
}
```

**Available data in `item`:**
- `item_name` — e.g. "Netflix"
- `amount` — e.g. 15.99
- `currency` — e.g. "USD"
- `billing_cycle` — e.g. "monthly"
- `next_billing_date` — ISO date string
- `trial_end_date` — ISO date string or null

**Current output examples:**
```
⚠️ *Upcoming Payment*: Netflix ($15.99) is due today!
📅 *Upcoming Payment*: Spotify ($9.99) is due tomorrow
📅 *Upcoming Payment*: Adobe ($52.99) is due in 3 days
```

---

### 2. Trial Expiration
**Function:** `formatTrialMessage(item)`

```typescript
export function formatTrialMessage(item: NotifItem): string {
  const amount = formatCurrency(item.amount, item.currency);
  const endDate = item.trial_end_date ?? item.next_billing_date;
  const days = daysBetween(new Date(), new Date(endDate));

  if (days === 0)
    return `⏰ *Trial Expiring*: ${item.item_name} trial expires today! Convert to paid (${amount}/${item.billing_cycle}) or cancel.`;
  if (days === 1)
    return `⏰ *Trial Expiring*: ${item.item_name} trial expires tomorrow. Full price: ${amount}/${item.billing_cycle}`;
  return `⏰ *Trial Expiring*: ${item.item_name} trial expires in ${days} days. Full price: ${amount}/${item.billing_cycle}`;
}
```

**Current output examples:**
```
⏰ *Trial Expiring*: Hulu trial expires today! Convert to paid ($7.99/monthly) or cancel.
⏰ *Trial Expiring*: Disney+ trial expires tomorrow. Full price: $10.99/monthly
⏰ *Trial Expiring*: Apple Music trial expires in 5 days. Full price: $10.99/monthly
```

---

### 3. Test Message
**Function:** `formatTestMessage(channel)`

```typescript
export function formatTestMessage(channel: string): string {
  return `✅ *SubTrkr Test Notification*\n\nYour ${channel} notifications are working! You'll receive reminders here for upcoming payments and expiring trials.`;
}
```

**Current output:**
```
✅ *SubTrkr Test Notification*

Your telegram notifications are working! You'll receive reminders here for upcoming payments and expiring trials.
```

---

## Markdown Formatting (Telegram)

Telegram supports **Markdown** for text formatting:

| Syntax | Result |
|--------|--------|
| `*bold text*` | **bold text** |
| `_italic text_` | *italic text* |
| `` `code` `` | `code` |
| `[link text](https://example.com)` | clickable link |
| `\n` | Line break |

**Note:** Special characters like `*`, `_`, `` ` ``, `[` need escaping with `\` if you want them literal.

---

## Customization Examples

### Add More Details
```typescript
export function formatRenewalMessage(item: NotifItem): string {
  const amount = formatCurrency(item.amount, item.currency);
  const days = daysBetween(new Date(), new Date(item.next_billing_date));
  const date = new Date(item.next_billing_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });

  if (days === 0) {
    return `🔔 *Payment Due Today*\n\n` +
           `Service: ${item.item_name}\n` +
           `Amount: ${amount}\n` +
           `Cycle: ${item.billing_cycle}\n\n` +
           `⚠️ This charge will process today!`;
  }

  return `📅 *Upcoming Payment*\n\n` +
         `${item.item_name} — ${amount}/${item.billing_cycle}\n` +
         `Due: ${date} (in ${days} days)`;
}
```

**Output:**
```
📅 *Upcoming Payment*

Netflix — $15.99/monthly
Due: Feb 12 (in 3 days)
```

### Add Action Links
```typescript
export function formatTrialMessage(item: NotifItem): string {
  const amount = formatCurrency(item.amount, item.currency);
  const days = daysBetween(new Date(), new Date(item.trial_end_date ?? item.next_billing_date));

  return `⏰ *Trial Ending Soon*\n\n` +
         `${item.item_name} trial expires in ${days} ${days === 1 ? 'day' : 'days'}\n` +
         `Full price: ${amount}/${item.billing_cycle}\n\n` +
         `[Cancel Subscription](https://subtrkr.app) | [Keep Trial](https://subtrkr.app)`;
}
```

### Change Tone/Style
```typescript
// Friendly/casual
if (days === 0) return `Hey! 👋 Your ${item.item_name} payment (${amount}) is happening today`;

// Urgent/serious
if (days === 0) return `⚠️ ACTION REQUIRED: ${item.item_name} will charge ${amount} TODAY`;

// Minimal/clean
if (days === 0) return `${item.item_name}: ${amount} due today`;
```

---

## How to Deploy Your Changes

Since the Edge Function source isn't local, you have two options:

### Option 1: Ask me to update the templates
Tell me what you want changed (e.g., "add the billing cycle to renewal messages") and I'll redeploy the function with your customizations.

### Option 2: Create local Edge Function source (recommended for future edits)

1. Create the file structure:
```bash
mkdir -p supabase/functions/send-notifications/channels
mkdir -p supabase/functions/send-notifications/utils
```

2. I'll create the files with the current code + your customizations

3. Deploy via:
```bash
npx supabase functions deploy send-notifications --project-ref bpgsfyallqqvvtjorybl
```

This gives you full control to edit `templates.ts` locally and redeploy anytime.

---

## Message Length Limits

- **Telegram:** 4096 characters max per message
- **Discord:** 2000 characters max
- **Slack:** 40,000 characters max (but keep it reasonable)

---

## Testing Your Changes

After redeploying with new templates:

1. Go to Settings → Notification Channels
2. Find your connected Telegram channel
3. Click the **Test** (🧪) button
4. Check Telegram for the new message format

Or test live:
1. Create a test subscription with `next_billing_date = tomorrow`
2. Set `reminder_days = 1` in notification preferences
3. Wait for the cron job or manually trigger via:
   ```bash
   curl -X POST https://bpgsfyallqqvvtjorybl.supabase.co/functions/v1/send-notifications \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```

---

## Want to customize now?

Just tell me what changes you'd like and I'll update the templates and redeploy the Edge Function for you!
