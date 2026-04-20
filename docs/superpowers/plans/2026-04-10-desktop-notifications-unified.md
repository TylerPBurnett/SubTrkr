# Desktop Notifications Unified Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Supabase cron + `send-notifications` edge function the single source of truth for reminder scheduling, and turn the Tauri desktop notification path into a dumb pull-based drain of a server-side outbox — eliminating the startup-only client scheduling bug, the fragile `localStorage` dedup, and the duplicated scheduling logic between client and server.

**Architecture:**
- Add `'desktop'` to the `notification_channel` enum. Every user gets a `notification_channels` row of channel `desktop` (enabled by default), seeded via a trigger + backfill.
- Extend `notification_log` with `title`, `body`, `delivered_at` columns. For desktop rows, `send-notifications` writes `status='pending'` with a pre-rendered title/body instead of making an HTTP call.
- Client subscribes to realtime inserts on `notification_log` filtered to `channel=desktop, status=pending, user_id=self`, drains any existing pending rows on sign-in, calls an atomic `claim_desktop_delivery(log_id)` RPC, and fires `@tauri-apps/plugin-notification` only on successful claim.
- Legacy client-side reminder scheduling (`checkAndNotifyUpcomingRenewals`, `checkAndNotifyExpiringTrials`, `subtrkr-reminder-history` localStorage) is deleted.

**Tech Stack:** Supabase Postgres + pg_cron, Supabase Edge Functions (Deno), Supabase Realtime, Tauri 2 (`@tauri-apps/plugin-notification`), React 19 + TypeScript, `bun test` with `node:test`.

---

## File Structure

**Create:**
- `supabase/migrations/20260410_01_add_desktop_enum.sql` — adds `'desktop'` to the `notification_channel` enum (must be its own transaction; Postgres does not allow referencing a newly added enum value in the same transaction that added it)
- `supabase/migrations/20260410_02_unified_desktop_notifications.sql` — column additions, desktop channel backfill + trigger, `claim_desktop_delivery` RPC, realtime publication
- `src/services/desktopNotifications.ts` — pure and IO helpers for the drain/claim/deliver flow
- `src/services/desktopNotifications.test.ts` — unit tests for pure helpers using `node:test`
- `src/app/hooks/useDesktopNotifications.ts` — React hook managing realtime subscription and initial drain

**Modify:**
- `src/types/index.ts` — extend `NotificationChannelType`, `NotificationLogStatus`, `NotificationLogEntry`
- `supabase/functions/send-notifications/index.ts` — desktop branch in dispatch, updated dedup filter, desktop payload formatter (note: this file does not currently exist locally; it must be created from the deployed source before editing — see Task 2)
- `supabase/functions/send-notifications/utils/templates.ts` — add `formatDesktopPayload`
- `src/app/hooks/useAppDataSync.ts` — drop `runNotificationChecks` and the legacy `notifications` imports
- `src/App.tsx` — add `useDesktopNotifications(session)` call

**Delete:**
- `src/services/notifications.ts` — legacy scheduling/delivery module (replaced by `desktopNotifications.ts`)

---

## Task 1: Database migration — enum, columns, trigger, RPC, publication, RLS

**Files:**
- Create: `supabase/migrations/20260410_01_add_desktop_enum.sql`
- Create: `supabase/migrations/20260410_02_unified_desktop_notifications.sql`

**Why two files:** Postgres rejects references to a newly-added enum value inside the same transaction that added it (`unsafe use of new value of enum type`). Supabase runs each migration file as a single transaction, so the enum addition must be isolated from the backfill/trigger/RPC that use the new value.

- [ ] **Step 1a: Write the enum migration**

Create `supabase/migrations/20260410_01_add_desktop_enum.sql` with this exact content:

```sql
-- Add 'desktop' to notification_channel enum.
-- Must be in its own migration: Postgres does not allow referencing a newly
-- added enum value in the same transaction that added it.
ALTER TYPE public.notification_channel ADD VALUE IF NOT EXISTS 'desktop';
```

- [ ] **Step 1b: Write the main outbox migration**

Create `supabase/migrations/20260410_02_unified_desktop_notifications.sql` with this exact content:

```sql
-- Unified desktop notifications: outbox model in notification_log
-- See docs/superpowers/plans/2026-04-10-desktop-notifications-unified.md

-- 1. Extend notification_log with title/body/delivered_at for desktop outbox
ALTER TABLE public.notification_log
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. Backfill: every user with notification_preferences gets a desktop channel
INSERT INTO public.notification_channels (user_id, channel, enabled, event_types)
SELECT np.user_id,
       'desktop'::public.notification_channel,
       true,
       ARRAY['renewal_reminder', 'trial_expiration']::public.notification_event_type[]
FROM public.notification_preferences np
WHERE NOT EXISTS (
  SELECT 1 FROM public.notification_channels nc
  WHERE nc.user_id = np.user_id AND nc.channel = 'desktop'
);

-- 3. Trigger: auto-create desktop channel row when a user's preferences are created
CREATE OR REPLACE FUNCTION public.ensure_desktop_notification_channel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.notification_channels (user_id, channel, enabled, event_types)
  VALUES (
    NEW.user_id,
    'desktop'::public.notification_channel,
    true,
    ARRAY['renewal_reminder', 'trial_expiration']::public.notification_event_type[]
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notification_preferences_desktop_channel ON public.notification_preferences;
CREATE TRIGGER notification_preferences_desktop_channel
  AFTER INSERT ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_desktop_notification_channel();

-- 4. Atomic claim RPC: only the first caller flips status from 'pending' to 'sent'
CREATE OR REPLACE FUNCTION public.claim_desktop_delivery(p_log_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.notification_log
  SET status = 'sent', delivered_at = now()
  WHERE id = p_log_id
    AND status = 'pending'
    AND channel = 'desktop'
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_desktop_delivery(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_desktop_delivery(UUID) TO authenticated;

-- 5. Add notification_log to the realtime publication so clients can subscribe
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_log;
```

- [ ] **Step 2: Apply BOTH migrations via Supabase MCP (in order)**

Call `mcp__supabase__apply_migration` twice, sequentially, on project `bpgsfyallqqvvtjorybl`:

1. First: `name = '20260410_01_add_desktop_enum'`, `query = <contents of 20260410_01_add_desktop_enum.sql>`
2. Then: `name = '20260410_02_unified_desktop_notifications'`, `query = <contents of 20260410_02_unified_desktop_notifications.sql>`

Do not combine them into a single call — the enum addition must commit before the second migration references it.

- [ ] **Step 3: Verify both migrations applied**

Run these four verification queries via `execute_sql` on project `bpgsfyallqqvvtjorybl` and confirm each expectation:

Query A — enum value present:
```sql
SELECT unnest(enum_range(NULL::public.notification_channel))::text AS label;
```
Expected: output includes `telegram`, `discord`, `slack`, `desktop`.

Query B — columns exist:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'notification_log'
  AND column_name IN ('title', 'body', 'delivered_at');
```
Expected: three rows (`title`, `body`, `delivered_at`).

Query C — desktop channel backfilled for every preferences row:
```sql
SELECT
  (SELECT COUNT(*) FROM public.notification_preferences) AS prefs_count,
  (SELECT COUNT(*) FROM public.notification_channels WHERE channel = 'desktop') AS desktop_count;
```
Expected: `prefs_count` equals `desktop_count`.

Query D — RPC and realtime publication:
```sql
SELECT proname FROM pg_proc WHERE proname = 'claim_desktop_delivery';
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'notification_log';
```
Expected: one row for each.

If any expectation fails, STOP and investigate before proceeding.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260410_01_add_desktop_enum.sql supabase/migrations/20260410_02_unified_desktop_notifications.sql
git commit -m "feat(notifications): add desktop channel outbox schema"
```

---

## Task 2: Edge function — desktop branch, dedup fix, payload formatter

**Files:**
- Create/Modify: `supabase/functions/send-notifications/index.ts`
- Create/Modify: `supabase/functions/send-notifications/utils/templates.ts`

**Context:** The `send-notifications` edge function (currently v7) lives only in the Supabase project, not in this repo. Before editing, fetch it with `mcp__supabase__get_edge_function` (slug `send-notifications`) and write each returned file to `supabase/functions/send-notifications/` so the change is version-controlled alongside this repo. Then deploy with `mcp__supabase__deploy_edge_function`.

- [ ] **Step 1: Materialize the current edge function source locally**

Create `supabase/functions/send-notifications/` and populate it with the files returned by `mcp__supabase__get_edge_function({ project_id: 'bpgsfyallqqvvtjorybl', function_slug: 'send-notifications' })`:
- `index.ts`
- `channels/telegram.ts`
- `channels/discord.ts`
- `channels/slack.ts`
- `utils/templates.ts`

Write each file verbatim from the MCP response.

- [ ] **Step 2: Add `formatDesktopPayload` to templates.ts**

Append this export to `supabase/functions/send-notifications/utils/templates.ts` (below the existing `formatTestMessage` export):

```ts
export interface DesktopPayload {
  title: string;
  body: string;
}

export function formatDesktopPayload(item: {
  item_name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string;
  trial_end_date: string | null;
  event_type: "renewal_reminder" | "trial_expiration";
}): DesktopPayload {
  const amount = formatCurrency(item.amount, item.currency);

  if (item.event_type === "renewal_reminder") {
    const days = daysBetween(new Date(), new Date(item.next_billing_date));
    const body =
      days === 0
        ? `${item.item_name} (${amount}) is due today!`
        : days === 1
          ? `${item.item_name} (${amount}) is due tomorrow`
          : `${item.item_name} (${amount}) is due in ${days} days`;
    return { title: "Upcoming Payment", body };
  }

  const endDate = item.trial_end_date ?? item.next_billing_date;
  const days = daysBetween(new Date(), new Date(endDate));
  const hasPaidAmount = item.amount > 0;
  const body =
    days === 0
      ? hasPaidAmount
        ? `${item.item_name} trial expires today! Convert to paid (${amount}/${item.billing_cycle}) or cancel.`
        : `${item.item_name} trial expires today! Set a paid amount, then convert or cancel.`
      : days === 1
        ? hasPaidAmount
          ? `${item.item_name} trial expires tomorrow. Convert to paid (${amount}/${item.billing_cycle}) or cancel.`
          : `${item.item_name} trial expires tomorrow. Set a paid amount, then convert or cancel.`
        : hasPaidAmount
          ? `${item.item_name} trial expires in ${days} days. Full price: ${amount}/${item.billing_cycle}`
          : `${item.item_name} trial expires in ${days} days. Add the paid amount before converting to active.`;
  return { title: "Trial Expiring Soon", body };
}
```

- [ ] **Step 3: Update `index.ts` — type, dedup, dispatch branch, logging**

Make these four edits to `supabase/functions/send-notifications/index.ts`:

**Edit 3a — extend `ChannelType` and `ChannelRow`:**

Replace:
```ts
interface ChannelRow {
  id: string;
  user_id: string;
  channel: "telegram" | "discord" | "slack";
  enabled: boolean;
  secret_value: string | null;
  metadata: Record<string, unknown>;
  event_types: string[];
}

type ChannelType = "telegram" | "discord" | "slack";
```

With:
```ts
interface ChannelRow {
  id: string;
  user_id: string;
  channel: "telegram" | "discord" | "slack" | "desktop";
  enabled: boolean;
  secret_value: string | null;
  metadata: Record<string, unknown>;
  event_types: string[];
}

type ChannelType = "telegram" | "discord" | "slack" | "desktop";
```

**Edit 3b — import `formatDesktopPayload`:**

Replace:
```ts
import { formatRenewalMessage, formatTrialMessage, formatTestMessage } from "./utils/templates.ts";
```

With:
```ts
import { formatRenewalMessage, formatTrialMessage, formatTestMessage, formatDesktopPayload } from "./utils/templates.ts";
```

**Edit 3c — include `pending` in dedup lookup:**

Replace the `getBulkSentToday` body:
```ts
  const { data } = await supabase
    .from("notification_log")
    .select("user_id, item_id, channel, event_type")
    .in("user_id", userIds)
    .eq("status", "sent")
    .gte("sent_at", todayStart.toISOString());
```

With:
```ts
  const { data } = await supabase
    .from("notification_log")
    .select("user_id, item_id, channel, event_type")
    .in("user_id", userIds)
    .in("status", ["sent", "pending"])
    .gte("sent_at", todayStart.toISOString());
```

Also rename the function for clarity:
```ts
async function getBulkAlreadyHandledToday(
```
And update the single call site further down from `getBulkSentToday` to `getBulkAlreadyHandledToday`.

**Edit 3d — extend `logNotification` to accept title/body and handle desktop dispatch:**

Replace:
```ts
async function logNotification(
  supabase: ReturnType<typeof createClient>,
  entry: {
    user_id: string;
    channel: string;
    event_type: string;
    item_id: string | null;
    status: "sent" | "failed" | "skipped";
    error_message?: string;
  }
) {
  await supabase.from("notification_log").insert(entry);
}
```

With:
```ts
async function logNotification(
  supabase: ReturnType<typeof createClient>,
  entry: {
    user_id: string;
    channel: string;
    event_type: string;
    item_id: string | null;
    status: "sent" | "failed" | "skipped" | "pending";
    error_message?: string;
    title?: string;
    body?: string;
  }
) {
  await supabase.from("notification_log").insert(entry);
}
```

Then, inside the `dispatchTasks.push(async () => { ... })` block in the scheduled-notification main loop, replace:
```ts
            try {
              const message =
                item.event_type === "renewal_reminder"
                  ? formatRenewalMessage(item)
                  : formatTrialMessage(item);

              await dispatchToChannel(
                channelConfig.channel,
                channelConfig.secret_value!,
                channelConfig.metadata ?? {},
                message
              );

              await logNotification(supabase, {
                user_id: userId,
                channel: channelConfig.channel,
                event_type: item.event_type,
                item_id: item.item_id,
                status: "sent",
              });
              totalSent++;
```

With:
```ts
            try {
              if (channelConfig.channel === "desktop") {
                const { title, body } = formatDesktopPayload(item);
                await logNotification(supabase, {
                  user_id: userId,
                  channel: "desktop",
                  event_type: item.event_type,
                  item_id: item.item_id,
                  status: "pending",
                  title,
                  body,
                });
                totalSent++;
                return;
              }

              const message =
                item.event_type === "renewal_reminder"
                  ? formatRenewalMessage(item)
                  : formatTrialMessage(item);

              await dispatchToChannel(
                channelConfig.channel,
                channelConfig.secret_value!,
                channelConfig.metadata ?? {},
                message
              );

              await logNotification(supabase, {
                user_id: userId,
                channel: channelConfig.channel,
                event_type: item.event_type,
                item_id: item.item_id,
                status: "sent",
              });
              totalSent++;
```

Also update the `secret_value` precondition so desktop channels aren't skipped for lacking a secret. Replace:
```ts
      for (const channelConfig of channels) {
        if (!channelConfig.secret_value) continue;
```

With:
```ts
      for (const channelConfig of channels) {
        if (channelConfig.channel !== "desktop" && !channelConfig.secret_value) continue;
```

**Edit 3e — extend `dispatchToChannel` signature** (defensive): the function is not called for desktop in the new flow, but keep the switch exhaustive so TypeScript stays happy:

Replace:
```ts
async function dispatchToChannel(
  channel: ChannelType,
  secret: string,
  metadata: Record<string, unknown>,
  message: string
): Promise<void> {
  switch (channel) {
    case "telegram":
      await sendTelegram(secret, metadata.chat_id as string, message);
      break;
    case "discord":
      await sendDiscord(secret, message);
      break;
    case "slack":
      await sendSlack(secret, message);
      break;
  }
}
```

With:
```ts
async function dispatchToChannel(
  channel: ChannelType,
  secret: string,
  metadata: Record<string, unknown>,
  message: string
): Promise<void> {
  switch (channel) {
    case "telegram":
      await sendTelegram(secret, metadata.chat_id as string, message);
      break;
    case "discord":
      await sendDiscord(secret, message);
      break;
    case "slack":
      await sendSlack(secret, message);
      break;
    case "desktop":
      // Desktop is pull-based; handled in the caller before reaching here.
      throw new Error("dispatchToChannel should not be called for desktop");
  }
}
```

- [ ] **Step 4: Deploy the updated edge function**

Use `mcp__supabase__deploy_edge_function` with:
- `project_id`: `bpgsfyallqqvvtjorybl`
- `name`: `send-notifications`
- `entrypoint_path`: `index.ts`
- `files`: array of `{ name, content }` objects for `index.ts`, `channels/telegram.ts`, `channels/discord.ts`, `channels/slack.ts`, `utils/templates.ts` — all read from the working copy under `supabase/functions/send-notifications/`.

- [ ] **Step 5: Smoke-test the edge function with an artificial due item**

Via `execute_sql`, insert a temporary item whose `next_billing_date` = CURRENT_DATE for your own user (look up `auth.uid()` via the Supabase dashboard or an authenticated session). Then manually invoke the edge function by calling the scheduled cron job once:

```sql
-- Find a test user id
SELECT user_id, timezone FROM public.notification_preferences LIMIT 1;
```

Use the returned `user_id` + `timezone`. Skip this step if you cannot safely create test data in prod — defer full verification to Task 7.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/send-notifications
git commit -m "feat(notifications): handle desktop channel via outbox in edge function"
```

---

## Task 3: Client service — `desktopNotifications.ts` with pure helpers + tests

**Files:**
- Create: `src/services/desktopNotifications.ts`
- Create: `src/services/desktopNotifications.test.ts`

- [ ] **Step 1: Write the failing test file**

Create `src/services/desktopNotifications.test.ts`:

```ts
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  isPendingDesktopRow,
  isFreshPendingRow,
  MAX_PENDING_AGE_MS,
} from './desktopNotifications';

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: 'user-1',
    channel: 'desktop',
    event_type: 'renewal_reminder',
    item_id: 'item-1',
    status: 'pending',
    title: 'Upcoming Payment',
    body: 'Netflix ($15.99) is due tomorrow',
    sent_at: new Date().toISOString(),
    delivered_at: null,
    error_message: null,
    ...overrides,
  };
}

describe('isPendingDesktopRow', () => {
  test('accepts a well-formed pending desktop row', () => {
    assert.equal(isPendingDesktopRow(row()), true);
  });

  test('rejects rows on other channels', () => {
    assert.equal(isPendingDesktopRow(row({ channel: 'telegram' })), false);
  });

  test('rejects rows already sent', () => {
    assert.equal(isPendingDesktopRow(row({ status: 'sent' })), false);
  });

  test('rejects rows missing title or body', () => {
    assert.equal(isPendingDesktopRow(row({ title: null })), false);
    assert.equal(isPendingDesktopRow(row({ body: '' })), false);
  });
});

describe('isFreshPendingRow', () => {
  test('accepts rows created within the max age window', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    assert.equal(isFreshPendingRow(row({ sent_at: recent }), Date.now()), true);
  });

  test('rejects rows older than the max age window', () => {
    const stale = new Date(Date.now() - (MAX_PENDING_AGE_MS + 60_000)).toISOString();
    assert.equal(isFreshPendingRow(row({ sent_at: stale }), Date.now()), false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun test src/services/desktopNotifications.test.ts`
Expected: FAIL — cannot resolve module `./desktopNotifications` (or similar module-not-found error).

- [ ] **Step 3: Implement `desktopNotifications.ts`**

Create `src/services/desktopNotifications.ts`:

```ts
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const MAX_PENDING_AGE_MS = 24 * 60 * 60 * 1000; // Drop pending rows older than 24h

export interface PendingDesktopRow {
  id: string;
  user_id: string;
  channel: string;
  event_type: string;
  item_id: string | null;
  status: string;
  title: string | null;
  body: string | null;
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
}

export function isPendingDesktopRow(row: unknown): row is PendingDesktopRow & {
  title: string;
  body: string;
} {
  if (!row || typeof row !== 'object') return false;
  const r = row as Record<string, unknown>;
  return (
    r.channel === 'desktop' &&
    r.status === 'pending' &&
    typeof r.title === 'string' &&
    (r.title as string).length > 0 &&
    typeof r.body === 'string' &&
    (r.body as string).length > 0
  );
}

export function isFreshPendingRow(row: PendingDesktopRow, nowMs: number): boolean {
  const createdMs = Date.parse(row.sent_at);
  if (Number.isNaN(createdMs)) return false;
  return nowMs - createdMs <= MAX_PENDING_AGE_MS;
}

export async function ensurePermission(): Promise<boolean> {
  let granted = await isPermissionGranted();
  if (!granted) {
    const permission = await requestPermission();
    granted = permission === 'granted';
  }
  return granted;
}

async function claimDelivery(logId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_desktop_delivery', {
    p_log_id: logId,
  });
  if (error) {
    console.error('claim_desktop_delivery failed:', error);
    return false;
  }
  return data === true;
}

async function deliver(row: PendingDesktopRow & { title: string; body: string }): Promise<void> {
  const granted = await ensurePermission();
  if (!granted) return;

  const claimed = await claimDelivery(row.id);
  if (!claimed) return; // Another client got it, or it's no longer pending

  try {
    await sendNotification({ title: row.title, body: row.body });
  } catch (err) {
    console.error('Failed to send desktop notification:', err);
  }
}

export async function drainPendingDesktopNotifications(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - MAX_PENDING_AGE_MS).toISOString();

  const { data, error } = await supabase
    .from('notification_log')
    .select('*')
    .eq('user_id', userId)
    .eq('channel', 'desktop')
    .eq('status', 'pending')
    .gte('sent_at', cutoff)
    .order('sent_at', { ascending: true });

  if (error) {
    console.error('Failed to drain pending desktop notifications:', error);
    return;
  }

  for (const row of data ?? []) {
    if (!isPendingDesktopRow(row)) continue;
    if (!isFreshPendingRow(row, Date.now())) continue;
    await deliver(row);
  }
}

export function subscribeToDesktopNotifications(userId: string): RealtimeChannel {
  return supabase
    .channel(`desktop-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notification_log',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row = payload.new as unknown;
        if (!isPendingDesktopRow(row)) return;
        if (!isFreshPendingRow(row, Date.now())) return;
        void deliver(row);
      },
    )
    .subscribe();
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/services/desktopNotifications.test.ts`
Expected: PASS — all six tests in the two describe blocks.

- [ ] **Step 5: Typecheck the whole project**

Run: `bun run build`
Expected: No TypeScript errors. (The build compiles TS via `tsc` before Vite.)

- [ ] **Step 6: Commit**

```bash
git add src/services/desktopNotifications.ts src/services/desktopNotifications.test.ts
git commit -m "feat(notifications): add pull-based desktop notification service"
```

---

## Task 4: Client hook — `useDesktopNotifications`

**Files:**
- Create: `src/app/hooks/useDesktopNotifications.ts`

- [ ] **Step 1: Write the hook**

Create `src/app/hooks/useDesktopNotifications.ts`:

```ts
import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  drainPendingDesktopNotifications,
  ensurePermission,
  subscribeToDesktopNotifications,
} from '@/services/desktopNotifications';
import { supabase } from '@/services/supabase';

/**
 * Manages the desktop notification outbox lifecycle.
 *
 * Behavior:
 * - On sign-in, requests OS notification permission and drains any pending
 *   `notification_log` rows (channel=desktop, status=pending) the edge function
 *   enqueued while the app was closed.
 * - Subscribes to realtime INSERTs on `notification_log` for this user, so new
 *   pending desktop rows fire a native notification as soon as they are enqueued.
 * - The atomic `claim_desktop_delivery` RPC ensures multiple open clients don't
 *   double-fire; only the first caller flips status from pending → sent.
 */
export function useDesktopNotifications(session: Session | null): void {
  useEffect(() => {
    if (!session) return;

    const userId = session.user.id;
    let cancelled = false;

    void (async () => {
      const granted = await ensurePermission();
      if (cancelled || !granted) return;
      await drainPendingDesktopNotifications(userId);
    })();

    const channel = subscribeToDesktopNotifications(userId);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [session]);
}
```

- [ ] **Step 2: Typecheck**

Run: `bun run build`
Expected: No TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/hooks/useDesktopNotifications.ts
git commit -m "feat(notifications): add useDesktopNotifications hook"
```

---

## Task 5: Remove legacy client-side reminder scheduling

**Files:**
- Delete: `src/services/notifications.ts`
- Modify: `src/app/hooks/useAppDataSync.ts`
- Modify: `src/types/index.ts`

- [ ] **Step 1: Delete the legacy service**

```bash
git rm src/services/notifications.ts
```

- [ ] **Step 2: Update `useAppDataSync.ts` — drop `runNotificationChecks`**

In `src/app/hooks/useAppDataSync.ts`:

Delete these lines (currently at lines 12–15):
```ts
import {
  checkAndNotifyExpiringTrials,
  checkAndNotifyUpcomingRenewals,
} from '@/services/notifications';
```

Delete the entire `runNotificationChecks` callback (currently lines 84–94):
```ts
  const runNotificationChecks = useCallback(
    async (itemsData: ItemWithCategory[]): Promise<void> => {
      const results = await Promise.allSettled([
        checkAndNotifyUpcomingRenewals(itemsData),
        checkAndNotifyExpiringTrials(itemsData),
      ]);

      reportBackgroundFailures(results, 'notification');
    },
    [reportBackgroundFailures],
  );
```

Replace the `runStartupBackgroundTasks` body (currently lines 134–154) to stop calling `runNotificationChecks`:

Old:
```ts
  const runStartupBackgroundTasks = useCallback(
    (itemsSnapshot: ItemWithCategory[]) => {
      window.setTimeout(() => {
        void (async () => {
          try {
            const maintenanceChanges = await runMaintenanceTasks();
            const latestItems =
              maintenanceChanges > 0 ? await loadItemsData() : itemsSnapshot;

            await runNotificationChecks(latestItems);
          } catch (error) {
            console.error('Startup background tasks failed:', error);
            toast.warning(
              'Background startup tasks failed. Data may be incomplete.',
            );
          }
        })();
      }, 0);
    },
    [loadItemsData, runMaintenanceTasks, runNotificationChecks],
  );
```

New:
```ts
  const runStartupBackgroundTasks = useCallback(
    (_itemsSnapshot: ItemWithCategory[]) => {
      window.setTimeout(() => {
        void (async () => {
          try {
            const maintenanceChanges = await runMaintenanceTasks();
            if (maintenanceChanges > 0) {
              await loadItemsData();
            }
          } catch (error) {
            console.error('Startup background tasks failed:', error);
            toast.warning(
              'Background startup tasks failed. Data may be incomplete.',
            );
          }
        })();
      }, 0);
    },
    [loadItemsData, runMaintenanceTasks],
  );
```

Note the parameter is renamed to `_itemsSnapshot` to silence the unused-variable warning while keeping the signature stable for the caller.

- [ ] **Step 3: Extend `NotificationChannelType` and `NotificationLogStatus` in `src/types/index.ts`**

Replace (line 104):
```ts
export type NotificationChannelType = 'telegram' | 'discord' | 'slack';
```

With:
```ts
export type NotificationChannelType = 'telegram' | 'discord' | 'slack' | 'desktop';
```

Replace (line 106):
```ts
export type NotificationLogStatus = 'sent' | 'failed' | 'skipped';
```

With:
```ts
export type NotificationLogStatus = 'sent' | 'failed' | 'skipped' | 'pending';
```

Replace the `NotificationLogEntry` interface (lines 129–138):
```ts
export interface NotificationLogEntry {
  id: string;
  user_id: string;
  channel: NotificationChannelType;
  event_type: NotificationEventType;
  item_id: string | null;
  status: NotificationLogStatus;
  error_message: string | null;
  sent_at: string;
}
```

With:
```ts
export interface NotificationLogEntry {
  id: string;
  user_id: string;
  channel: NotificationChannelType;
  event_type: NotificationEventType;
  item_id: string | null;
  status: NotificationLogStatus;
  error_message: string | null;
  sent_at: string;
  title: string | null;
  body: string | null;
  delivered_at: string | null;
}
```

- [ ] **Step 4: Purge the legacy localStorage key**

Add a one-time cleanup so old installs don't leave a stale `subtrkr-reminder-history` entry lying around. In `src/app/hooks/useAppDataSync.ts`, inside the existing `useEffect` that runs when `session` becomes available (the one at line 156 that loads initial data), add this at the top of the async block, right before `loadData()`:

```ts
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.removeItem('subtrkr-reminder-history');
          } catch {
            // Ignore storage failures
          }
        }
```

- [ ] **Step 5: Typecheck**

Run: `bun run build`
Expected: No TypeScript errors. If `useAppDataSync.ts` complains about the unused `ItemWithCategory` import (it was only used by the deleted callback), remove it from the import list.

- [ ] **Step 6: Run the existing test suite**

Run: `bun test`
Expected: All pre-existing tests still pass (`analytics.test.ts`, `lifecycle.test.ts`, `billingHelpers.test.ts`) plus the new `desktopNotifications.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/services/notifications.ts src/app/hooks/useAppDataSync.ts src/types/index.ts
git commit -m "refactor(notifications): remove legacy client-side reminder scheduling"
```

---

## Task 6: Wire `useDesktopNotifications` into the app shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import and call the hook**

In `src/App.tsx`, add the import near the other `@/app/hooks/*` imports (around line 26):

```ts
import { useDesktopNotifications } from '@/app/hooks/useDesktopNotifications';
```

Then immediately after the existing `useAppDataSync(session)` call (line 107–108):
```ts
  const { items, categories, isLoading, handleCategoriesChange } =
    useAppDataSync(session);
```

Add:
```ts
  useDesktopNotifications(session);
```

- [ ] **Step 2: Typecheck and build**

Run: `bun run build`
Expected: No TypeScript errors; Vite build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat(notifications): wire desktop notifications hook into app shell"
```

---

## Task 7: End-to-end verification against the deployed edge function

This task verifies the full loop works against the real Supabase project. It creates controlled test data, checks the edge function enqueues a pending row, observes the client draining and claiming it, then cleans up.

**Files:** none (verification only)

- [ ] **Step 1: Capture your user id and current channel config**

Run via Supabase MCP `execute_sql` on project `bpgsfyallqqvvtjorybl`:

```sql
SELECT np.user_id, np.timezone,
       EXISTS (SELECT 1 FROM public.notification_channels nc
               WHERE nc.user_id = np.user_id AND nc.channel = 'desktop' AND nc.enabled)
         AS desktop_enabled
FROM public.notification_preferences np
WHERE np.user_id = auth.uid();
```

Expected: one row; `desktop_enabled` is `true`. If missing, the backfill from Task 1 did not run — STOP.

- [ ] **Step 2: Insert a synthetic pending desktop row directly (bypass the edge function for a fast loop test)**

Replace `<YOUR_USER_ID>` with the id from Step 1:

```sql
INSERT INTO public.notification_log
  (user_id, channel, event_type, item_id, status, title, body)
VALUES
  ('<YOUR_USER_ID>', 'desktop', 'renewal_reminder', NULL, 'pending',
   'SubTrkr Test', 'If you see this notification, the desktop outbox is working.')
RETURNING id;
```

Expected: one row returned with a UUID.

- [ ] **Step 3: Launch the dev app and observe the notification**

Run: `bun run tauri:dev`

Within a few seconds of the authenticated session loading:
1. An OS-native notification titled "SubTrkr Test" appears.
2. Confirm via `execute_sql`:
   ```sql
   SELECT id, status, delivered_at FROM public.notification_log
   WHERE title = 'SubTrkr Test' ORDER BY sent_at DESC LIMIT 1;
   ```
   Expected: `status = 'sent'`, `delivered_at` is not null and within the last minute.

If the notification does not fire:
- Check the browser/Tauri devtools console for errors from `claim_desktop_delivery` or the realtime subscription.
- Confirm OS notification permission is actually granted for the SubTrkr dev bundle.
- Confirm `notification_log` is in the realtime publication (Task 1 Step 3 Query D).

- [ ] **Step 4: Verify idempotency — re-open the app with a still-pending row**

Insert a second row (same as Step 2) but keep the app closed. Then insert:

```sql
INSERT INTO public.notification_log
  (user_id, channel, event_type, item_id, status, title, body)
VALUES
  ('<YOUR_USER_ID>', 'desktop', 'renewal_reminder', NULL, 'pending',
   'SubTrkr Drain Test', 'This fired from the startup drain, not realtime.')
RETURNING id;
```

Then launch `bun run tauri:dev`. Expected: the notification fires from `drainPendingDesktopNotifications` on startup, and the row is marked `sent` with `delivered_at` populated.

- [ ] **Step 5: Verify staleness guard — old rows are ignored**

```sql
INSERT INTO public.notification_log
  (user_id, channel, event_type, item_id, status, title, body, sent_at)
VALUES
  ('<YOUR_USER_ID>', 'desktop', 'renewal_reminder', NULL, 'pending',
   'SubTrkr Stale', 'Should NOT appear',
   now() - interval '2 days')
RETURNING id;
```

Restart the dev app. Expected: no notification appears. The row is still `pending` in the DB (that's fine; a future maintenance sweep can purge stale rows — out of scope here).

- [ ] **Step 6: Full edge-function integration (optional, requires a 9 AM window for your timezone)**

If you can wait until the top of your local 9 AM hour, temporarily lower an item's `next_billing_date` to today and `reminder_days` to a high number so it lands in the window, then wait for the hourly cron to fire. Expected: `send-notifications` enqueues a desktop row, client delivers it, no duplicates appear on subsequent cron ticks (dedup works).

- [ ] **Step 7: Clean up test rows**

```sql
DELETE FROM public.notification_log
WHERE title IN ('SubTrkr Test', 'SubTrkr Drain Test', 'SubTrkr Stale');
```

Expected: 3 or more rows deleted.

- [ ] **Step 8: Commit any verification notes (if needed)**

If you updated docs (e.g., added a runbook entry), commit them:

```bash
git add docs/
git commit -m "docs(notifications): record desktop outbox verification steps"
```

Otherwise skip this commit.

---

## Out of scope (intentionally deferred)

These are worth doing but are NOT part of this plan:

- **Settings UI for toggling desktop notifications on/off.** The channel row is created enabled=true by the trigger; flipping it off currently requires SQL. Add UI once the delivery loop is proven in production.
- **Automatic purge of old `pending` rows.** A `delete_stale_desktop_deliveries` cron job. Not urgent — stale rows are cheap and are ignored by the client.
- **Push-based delivery when the app is closed** (APNS/WNS/background daemon). This plan only eliminates the duplicated scheduling bug; it does not upgrade desktop notifications to "works with app closed". Users who need guaranteed delivery when the app is closed should connect Telegram/Discord/Slack — which this refactor leaves untouched and fully working.
- **Retries on Tauri `sendNotification` failure.** Current design is fire-and-forget after a successful claim; if the OS notification dispatch throws, the row is already marked sent. Acceptable for best-effort desktop popups.
- **Backfilling past-missed reminders when a user opens the app days later.** The 24h staleness window intentionally drops these.
