# PR Notes — `hardening-plan-implementation`

Working notes for the PR. Sections are appended as review items are addressed; final summary will be condensed into the PR description on open.

**Branch:** `hardening-plan-implementation`

## Branch summary

Implements the production hardening plan (Phases 1–3) and a large structural refactor:
- `src/App.tsx` (1,292 LOC) split into `src/app/hooks/` + `src/app/components/`
- `src/components/ItemForm.tsx`, `ItemList.tsx`, `NotificationSettings.tsx` decomposed into per-feature folders
- `src/services/database.ts` (863 LOC) split into focused modules under `src/services/database/`
- New deterministic regression tests (`item-form/billingHelpers.test.ts`, `database/analytics.test.ts`, `database/lifecycle.test.ts`)
- CSP hardening: `img.logo.dev` removed, `connect-src` scoped via `vite.config.ts` `buildCsp` helper
- Realtime subscriptions scoped to current user (commits `2008cbd`, `a609aed`)
- Letter-initial logo fallback, vibrancy preserved during startup, deep-link reload fixes

A pre-merge code review surfaced 15 issues (5 critical, 10 important). Each is tracked here as it lands.

---

## Review-driven fixes

### ✅ Item 1 — `hasSeededCategories` ref reset on user switch (CRITICAL)

**File:** `src/app/hooks/useAppDataSync.ts:204`

**Bug:** Module-instance ref `hasSeededCategories: useRef(false)` flipped to `true` on first sign-in and was never reset. If user A signed out and user B signed in within the same session, default categories were never seeded for B.

**Fix:** Replaced boolean ref with `seededForUserId: useRef<string | null>(null)`. The effect now resets the ref on sign-out and only short-circuits when `current === userId`. Optimistic flag set *before* the async seed call to prevent StrictMode double-invoke.

---

### ✅ Item 2 — Webhook URL allowlist (CRITICAL, cross-repo)

**Files:**
- `src/services/webhookValidator.ts` (new)
- `src/components/notification-settings/useNotificationSettings.ts` — `handleSaveWebhook` now validates before submit
- `src/services/notificationChannels.ts` — `upsertNotificationChannel` validates Discord/Slack secrets at the service layer (defense in depth)
- **`SubTrkr-mobile`** (cross-repo): `supabase/functions/send-notifications/utils/webhookValidator.ts` (new), `channels/discord.ts` and `channels/slack.ts` patched to validate before `fetch`. Deployed as `send-notifications` v9 to project `bpgsfyallqqvvtjorybl`.
- **`SubTrkr-mobile/supabase/config.toml`** — added `[functions.send-notifications]` block with `verify_jwt = false` so future deploys don't regress the platform-level JWT setting.

**Risk addressed:** SSRF. Previously, any non-empty string was accepted as a webhook URL and posted from the edge function — a malicious user could have pointed it at internal infrastructure (`localhost:9000`, `169.254.169.254`, etc.).

**Allowlist (mirrored client + server):**
- Discord: `https://discord.com/api/webhooks/...`
- Slack: `https://hooks.slack.com/services/...`
- HTTPS only · no embedded credentials · canonical hostname/path only

**Defense-in-depth blocklist (server-side):** loopback, RFC1918, link-local (incl. AWS/GCP/Azure IMDS), CGNAT, IPv6 loopback + ULA, GCP metadata host. Catches programmer error if the allowlist is ever loosened.

**Open items:**
- Run inspection query against `notification_channels` to find any pre-existing rows that wouldn't pass the new validator (snippet below). Decision per-row.
- The blocklist matches on the literal hostname string in the URL, not the resolved IP — so DNS rebinding is *not* mitigated. Allowlist hostname check covers this in practice; full DNS-rebinding defense (IP resolution + pinning) would be a separate, larger lift.

```sql
-- Inspection query for stale notification_channels rows
SELECT id, user_id, channel, secret_value
FROM notification_channels
WHERE channel IN ('discord','slack')
  AND secret_value IS NOT NULL
  AND NOT (
    (channel='discord' AND secret_value ~ '^https://discord\.com/api/webhooks/') OR
    (channel='slack'   AND secret_value ~ '^https://hooks\.slack\.com/services/')
  );
```

---

### ✅ Item 3 — RPC `p_user_id` ownership guard (CRITICAL → no-op)

**File:** `src/services/database/lifecycle.ts:81`

**Original concern:** `executeStatusChange` calls the `execute_item_status_change` RPC without passing `user_id`, raising the question of whether ownership is enforced server-side.

**Resolution after reviewing the SQL** (`SubTrkr-mobile/supabase/migrations/20260328113000_harden_execute_item_status_change_contract.sql`): the proc is **`SECURITY INVOKER`**, derives `v_user_id` from `auth.uid()` (signed JWT), and filters every read/write by `WHERE id = p_item_id AND user_id = v_user_id`. Ownership is fully enforced. Adding a client-supplied `p_user_id` parameter would be redundant at best and weaker at worst (trusting client input vs. trusting the JWT).

**Documentation change landed:** added an explanatory comment above `executeStatusChange()` in `src/services/database/lifecycle.ts` so future reviewers do not re-flag this.

---

### ✅ Item 4 — Double-submit guard (CRITICAL)

**Files:**
- `src/components/ItemForm.tsx`
- `src/components/item-form/useItemFormState.ts`
- `src/components/notification-settings/useNotificationSettings.ts`

**Bug:** Three handlers could be re-entered by a rapid double-click before React's `isSaving` state flipped to `true` — creating duplicate items, duplicate webhook upserts, or duplicate Telegram `getUpdates` polls.

**Fix:** Synchronous `useRef` in-flight locks, checked before any state mutation:

- **`handleSubmit`** (`useItemFormState.ts`): `submittingRef` set synchronously before calling `onSave`. Released via `useEffect([isSaving])` when the parent drops `isSaving` back to `false` (covers both success and failure). A try/catch around the `onSave` call also releases the ref if `onSave` throws synchronously.
- **`handleSaveWebhook`** (`useNotificationSettings.ts`): `savingWebhookRef` set after validation passes (so a rejected URL can be corrected and retried without being throttled), released in `finally`.
- **`handleDetectTelegramChat`**: `detectingTelegramRef` set before polling `api.telegram.org/getUpdates`, released in `finally`.

**Why refs, not just `isSaving`:** React state updates are asynchronous and batched — a second click within the same tick can fire before the first click's `setIsSaving(true)` has flushed. A ref is synchronous and guarantees the second click sees the lock.

**Verification:** `bunx tsc --noEmit` passes. +43/-4 across 3 files.

---

### ✅ Item 5 — Telegram bot token format validation (CRITICAL)

**Files:**
- `src/services/telegramValidator.ts` (new)
- `src/services/telegramValidator.test.ts` (new)
- `src/components/notification-settings/useNotificationSettings.ts`

**Bug:** Telegram setup previously accepted any non-empty string and interpolated it directly into `getMe` / `getUpdates` calls. This was not SSRF (hostname is fixed), but it produced poor UX and allowed obvious garbage input to reach Telegram.

**Fix:** Added `validateTelegramBotToken()` as a shared helper. Both `handleVerifyTelegramBot` and `handleDetectTelegramChat` now validate/trim the token before any network request, and reuse the normalized token in the subsequent API call / secret write.

**Validator shape:** `^\d+:[A-Za-z0-9_-]{30,}$`

**Additional hardening:** `handleVerifyTelegramBot` now also uses a synchronous ref guard so rapid double-clicks cannot fire duplicate `getMe` requests before React re-renders.

---

### ✅ Item 6 — `scheduleReload` stale closure (IMPORTANT)

**File:** `src/app/hooks/useAppDataSync.ts:145`

**Bug:** `scheduleReload()` closed over `reloadItemsAndRunNotificationChecks()` but its dependency list referenced `loadItemsData` instead, leaving a stale callback hazard after updates.

**Fix:** Corrected the dependency array to `[loadCategoriesData, reloadItemsAndRunNotificationChecks]`.

---

### ✅ Item 7 — `mountedRef` guard for setState after unmount (IMPORTANT)

**File:** `src/components/notification-settings/useNotificationSettings.ts`

**Bug:** `loadData()` and several async handlers could call `setState()` after the settings screen unmounted.

**Fix:** Added `mountedRef` and guarded all post-await state writes in `loadData()`, webhook save, Telegram verify/detect, disconnect, toggle, and preference updates. Loading/error state is now only written while mounted.

---

### ✅ Item 8 — Surface silent error paths (IMPORTANT)

**Files:**
- `src/components/notification-settings/useNotificationSettings.ts`
- `src/services/database/lifecycle.ts`

**Bug:** Several failures were logged but never surfaced to the user, and `advancePastDueItems()` silently counted only successes without logging partial failures.

**Fixes:**
- `handleDisconnect()`, `handleToggleChannel()`, `handleUpdatePreference()`, and initial `loadData()` now set actionable UI errors.
- `advancePastDueItems()` now uses `Promise.allSettled()`, logs rejected updates, and still returns the fulfilled count.

---

### ✅ Item 9 — Stabilize `onInstallNow` with ref (IMPORTANT → no-op)

**Resolution:** No change required. `App.tsx` already passes `handleInstallNow` via `useCallback`, so `useAppUpdateNotifications()` is not currently retriggering due to callback identity churn.

---

### ✅ Item 10 — `Cmd+N` / `Cmd+B` form/dialog guard (IMPORTANT)

**File:** `src/app/hooks/useGlobalShortcuts.ts`

**Bug:** Escape respected the open form / status dialog, but `Cmd+N` and `Cmd+B` did not, allowing new forms to stack over existing modal state.

**Fix:** Added the same `showFormRef` / `hasStatusChangeDialogRef` guard to both shortcuts before they trigger `onAddNew`.

---

### ✅ Item 11 — Selection-pruning effect dep regression (IMPORTANT)

**File:** `src/components/item-list/useItemListState.ts`

**Bug:** The selection-pruning effect depended on the entire `Set` object, causing extra reruns from identity churn.

**Fix:** Narrowed the dependency from `selectedItemIds` to `selectedItemIds.size`, matching the earlier effect pattern in the same hook.

---

### ✅ Item 12 — `getNextBillingDateAfterResume` date string compare (IMPORTANT)

**File:** `src/services/database/lifecycleHelpers.ts`

**Bug:** Resume logic compared raw strings (`item.next_billing_date >= resumedOn`), which is fragile when one side includes an ISO timestamp and the other is date-only.

**Fix:** Normalized both operands with `normalizeDateOnly()` before comparing and before building the anchor date used for the next billing calculation.

---

### ✅ Item 13 — Exhaustive default in billing math switches (IMPORTANT)

**File:** `src/services/database/billingMath.ts`

**Bug:** `toMonthlyAmount()` and `toYearlyAmount()` had no exhaustive guard. If `BillingCycle` gained a new value later, the functions would silently return `undefined`.

**Fix:** Added `assertNeverBillingCycle()` and explicit `default` branches so unsupported future enum values fail loudly.

---

### ✅ Item 14 — Coincidental quarterly assertion (IMPORTANT)

**File:** `src/services/database/analytics.test.ts`

**Bug:** The original quarterly test used values where an incorrect implementation could still accidentally pass (`60 + 30 = 90`).

**Fix:** Changed the quarterly amount from `90` to `60`, making the expected normalized total `80` and ensuring the test actually validates quarterly math.

---

### ✅ Item 15 — `archivePastCancellations` stub (IMPORTANT)

**File:** `src/services/database.ts`

**Bug:** `archivePastCancellations()` was an exported no-op stub that always returned `0`.

**Fix:** Removed the dead export entirely rather than keeping misleading placeholder behavior in the service barrel.

---

## Additional notes from full-branch review

- The remaining critical findings were all localized. No additional architectural changes were required beyond the cross-repo server-side webhook enforcement in `SubTrkr-mobile`.
- Item 9 was verified as a false positive against the current branch state and documented as such rather than papered over with redundant code.

---

## Cross-repo deployment record

| Layer | Repo | Status |
|---|---|---|
| Client validator (Item 2) | `SubTrkr` | This PR |
| Edge function validator (Item 2) | `SubTrkr-mobile` | Deployed: `send-notifications` v9 to `bpgsfyallqqvvtjorybl` (2026-04-16). Committed as `b83f692` on `main` (not yet pushed). |
| `verify_jwt = false` config (Item 2) | `SubTrkr-mobile/supabase/config.toml` | Same commit `b83f692`. |

---

## Verification checklist

- [x] Item 1: tested by signing out and back in (categories still seed correctly for the same user; verify on multi-user later)
- [x] Item 2: smoke-tested all three test notifications post-deploy — Telegram, Discord, Slack all return success
- [x] Items 4–15 app-side changes: `bunx tsc --noEmit` passes
- [x] Items 5–15 service/helper regressions: `bun test src/services/*.test.ts src/services/database/*.test.ts`
- [ ] Item 2 (negative path): try saving `https://example.com/foo` → confirm clean validator error in UI
- [ ] Item 2 (DB): run inspection query, decide on any stale rows
- [x] Final: `bun run build` passes
- [ ] Final: full smoke pass via `/smoke` slash command after all items land
