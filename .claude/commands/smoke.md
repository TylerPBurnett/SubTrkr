---
description: Run a Playwright-driven visual smoke test of the running SubTrkr app. Use when you want to verify all major views render correctly after a refactor, before a PR merge, or after a deploy. Requires dev server running on port 1420 (bun run dev or bun run tauri:dev).
---

# SubTrkr Smoke Test

Automated visual regression check using the Playwright MCP tools. Walk through every major view, take screenshots, and report a pass/fail summary.

## Prerequisites

- Dev server must be running on `http://localhost:1420`
- Playwright MCP must be connected

If the dev server isn't running, tell the user to start it with `bun run dev` first. Do NOT start it yourself.

## Test Sequence

Run each step in order. Take a screenshot after each major view loads. Track pass/fail for each check.

### 1. Login
- Navigate to `http://localhost:1420`
- Credentials are pre-filled — click the "Sign In" button
- Wait for the dashboard to load (up to 5 seconds)
- **Check**: page navigates past the login screen

### 2. Dashboard
- Take a screenshot
- **Check**: heading "Dashboard" is visible
- **Check**: stats cards render (Projected Monthly, Yearly Run Rate, Active Items, Due This Week)
- **Check**: "Spending by Category" section is visible

### 3. Subscriptions — Table View
- Click "Subscriptions" in the sidebar navigation
- Wait for items to load
- Take a screenshot
- **Check**: at least one item row renders with a company name
- **Check**: logos render (img elements present in rows)

### 4. Subscriptions — Grid View
- Click the "Grid view" button (aria-label)
- Take a screenshot
- **Check**: card elements render in a grid layout

### 5. Bills — Grid View
- Click "Bills" in the sidebar navigation
- Click "Grid view" if not already active
- Take a screenshot
- **Check**: at least one bill card renders
- **Check**: letter-initial fallback tiles appear for items without logos (look for single-character text nodes inside colored tile divs — items like "Rent" or custom bills typically show these)

### 6. Add Subscription — Known Service
- Click "Subscriptions" in the sidebar navigation
- Click "Add Subscription" button
- Wait for the form modal to appear
- Type "Net" slowly (with delay between characters) into the name input (`input[name="name"]`)
- Wait 500ms for debounced search
- Take a screenshot of the autocomplete dropdown
- **Check**: dropdown appears with "Netflix" suggestion showing a logo and "$15.49 / Monthly"
- Click the Netflix suggestion
- Take a screenshot of the filled form
- **Check**: name field shows "Netflix"
- **Check**: amount field shows "15.49"
- **Check**: preview card shows the Netflix logo
- Close the form (click "Close form" button)

### 7. Add Subscription — Unknown Name
- Click "Add Subscription" again
- Type "My Custom Service" into the name input
- Take a screenshot
- **Check**: preview card shows a colored letter tile with "M" (not a broken image or generic icon)
- Close the form

### 8. Analytics
- Click "Analytics" in the sidebar navigation
- Wait for charts to load (1.5 seconds)
- Take a screenshot
- **Check**: heading "Analytics" is visible
- **Check**: stats cards render (Monthly Spend, etc.)
- **Check**: "Monthly Spending Trend" section is visible

### 9. Settings — Categories
- Click "Settings" in the sidebar navigation
- Wait for settings to load
- Take a screenshot
- **Check**: "Categories" tab is visible and active
- **Check**: category items render (AI, Cloud Storage, Streaming, etc.)

### 10. Settings — Notifications
- Click the "Notifications" tab button
- Wait for notification channels to load
- Take a screenshot
- **Check**: channel cards render (Desktop, Telegram, Discord, Slack)

### 11. Theme Toggle
- Click the theme toggle button (aria-label contains "Switch theme")
- Wait 500ms
- Take a screenshot in the alternate theme
- **Check**: page renders without visual breakage
- Toggle back to the original theme

### 12. Network — Logo Proxy Verification
- Use `browser_network_requests` with filter `logo-proxy` to check logo network traffic
- **Check**: logo requests route through `supabase.co/functions/v1/logo-proxy` (PASS if at least one proxy request found)
- Use `browser_run_code` to scan all `<img>` src attributes on the current page
- **Check**: zero `img.logo.dev` direct references in rendered DOM

### 13. Console Errors
- Use `browser_console_messages` with level `error`
- **Check**: no unexpected errors (ignore `AuthApiError: Invalid Refresh Token` — that's a harmless stale session error on page load)

## Reporting

After all checks complete, close the browser with `browser_close`.

Clean up any screenshot files that were created during the test.

Present a summary table:

```
| # | Check                              | Result |
|---|-------------------------------------|--------|
| 1 | Login                              | ✅/❌  |
| 2 | Dashboard renders                  | ✅/❌  |
| 3 | Subscriptions table view           | ✅/❌  |
| 4 | Subscriptions grid view            | ✅/❌  |
| 5 | Bills grid + letter fallback       | ✅/❌  |
| 6 | Service autocomplete + auto-fill   | ✅/❌  |
| 7 | Custom name letter tile            | ✅/❌  |
| 8 | Analytics                          | ✅/❌  |
| 9 | Settings — Categories              | ✅/❌  |
| 10| Settings — Notifications           | ✅/❌  |
| 11| Theme toggle                       | ✅/❌  |
| 12| Logo proxy (no img.logo.dev)       | ✅/❌  |
| 13| Console errors                     | ✅/⚠️/❌ |
```

Use ⚠️ for checks that passed with caveats (e.g., harmless auth errors only).

If any check fails, include the screenshot and a brief description of what went wrong so the user can investigate.

## Tips for Reliability

- Always use `waitForTimeout` after navigation and clicks (500ms–2000ms depending on data load)
- Use `browser_run_code` for complex DOM queries rather than trying to parse snapshots
- Use `browser_snapshot` to get element refs before clicking
- For the name input in the form, use `page.locator('input[name="name"]')` and type slowly with `{ delay: 100 }` to trigger the debounced autocomplete
- Navigation buttons are inside `getByRole('navigation')` — scope clicks there to avoid ambiguity with other buttons sharing the same label
