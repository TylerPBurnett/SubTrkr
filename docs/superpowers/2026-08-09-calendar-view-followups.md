# Calendar view — deferred items and follow-ups

**Date:** 2026-08-10
**Branch:** `claude/calendar-subscription-bills-b3f66f`
**Spec:** [2026-08-09-calendar-view-design.md](specs/2026-08-09-calendar-view-design.md)
**Plan:** [2026-08-09-calendar-view.md](plans/2026-08-09-calendar-view.md)

Everything here was found by review during implementation, triaged, and
deliberately not fixed. Nothing in this list blocks merge. It is recorded
because the reasoning behind each deferral is worth more than the one-line
symptom, and none of it lives in git history.

## The verification record

**Updated 2026-08-11.** The calendar has now been driven in a browser against
real data. The original standing gap — that no part of it had ever been seen
rendered — is closed. What follows is what the five ranked checks actually
returned, kept because a prediction and its outcome are worth more together than
either alone.

Route that worked: `bun run dev` and drive `http://localhost:1420` through the
Browser pane. The Tauri dev build runs as a bare executable with no bundle id,
so the screenshot compositor filters it out of every capture — computer-use
cannot see it. Do not try; use the browser.

1. **Icon stack width — no problem, and the alarm was wrong.** 22px chips, three
   to a stack = 52px inside an 88px cell body, zero overflow across all 42
   cells. The pre-merge panic used a 72px content width that was never real; at
   the true width even 32px logos would have fitted. Only the `+N` pill at
   107px would have clipped.
2. **Paging and selection — correct.** Aug 24 → Next → Sept 24 carried the
   selection, `→` advanced to Sept 25 with no bounce, exactly one tab stop
   throughout.
3. **Year lens keyboard — was broken, now fixed.** The ring and the tabindex
   moved but DOM focus never did, so `activeElement` stayed on `BODY` and
   assistive tech announced nothing. `YearGrid` now takes `shouldFocus` and
   focuses its target. Labels also read `November 26, 2026` rather than
   `Thu Nov 26 2026`.
4. **Trial-end days — still unverified on screen, and here is why.** No item in
   the dataset has a `trial_end_date`; the one `trial`-status item (GitHub)
   leaves the field empty, which the form calls an "ongoing trial". The engine
   therefore emits no `trial-end` occurrence at all, so the branch cannot be
   exercised by looking. The `WeekGrid` half of it is fixed in code (below);
   seeing it requires setting a trial end date on an item first.
5. **Week lens — was broken, now fixed.** Names were being truncated to 41px in
   117px columns, so "The Wall Street Journal" showed a few characters in the
   one lens that exists to show names in full. The card was restructured: logo
   and amount share the top line, the name takes full width beneath with a
   2-line clamp. Measured 81px, nothing clipped.

The both-theme check remains a proxy: a token audit confirming all 14 CSS custom
properties used by calendar code resolve in both the light and `.dark` blocks of
`src/index.css`. Light mode has been seen; a systematic side-by-side has not.

## Closed since

- **The two filter popovers only shared their rows, not their chrome**
  (2026-08-11). The calendar's was 224px with hairline groups and a menu-row
  Clear; the subscriptions/bills one was 280px with a title bar, visible
  section labels, and a footer button — and the Sort popover beside it used a
  filled pill with a TRAILING check, a third idiom two dividers away, drawing
  on `--accent-green` where the filter trigger drew on `--brand-text`. All
  three now share `FILTER_POPOVER_SURFACE`, `FILTER_POPOVER_CLASS` (256px) and
  one row shape. Selection semantics moved to `utils/categorySelection.ts`
  under test, because "all", "none", and "only" had been written twice.
- **Rows claimed `role="menuitemcheckbox"` outside any menu** (2026-08-11).
  Invalid — that role needs a `menu`/`menubar` ancestor, and these live in a
  Radix Popover. Exactly the `gridcell`-without-`row` failure this branch
  shipped three times: the browser drops the role and the control announces as
  nothing. They are `aria-pressed` toggle buttons now. Adding `role="menu"` to
  the popover was rejected as the fix — that role promises arrow-key roving
  and type-ahead which Radix Popover does not implement, trading a quiet
  failure for a loud lie.

- **`WeekGrid` "$0.00" on a trial-end-only day** (2026-08-11). A trial-end
  marker carries `amount: 0`, so a day holding nothing but trial ends summed to
  zero and rendered a confident `$0.00` — a day with no money moving, reported
  as a day costing nothing. `WeekGrid` now gates on a charge count like
  `DayCell` does, and shows an amber "Trial ends" instead. **Not seen on
  screen** — see check 4 above for why.
- **Seven-day chunking existed three times** (2026-08-11) — `MonthGrid`,
  `YearGrid`, `CashFlowStrip` — with `WEEK_OPTIONS` twice. Both now export from
  `calendarRange.ts`. This was the largest drift risk between the lenses: a
  change to where a week starts had to be made in three places or they would
  disagree. Verified after the refactor: month lens 42 cells / 7 rows /
  1 tab stop, year lens 12 grids / 61 rows / 427 cells / 0 orphaned gridcells.

## Where this is tracked

This doc is the detail; **[docs/TASKS.md](../TASKS.md) is the queue.** It was
orphaned from that ledger until 2026-08-11, which meant everything below was
recorded but not actually scheduled anywhere. It now has rows:

- **TASK-022** — the `--text-muted` contrast failure (app-wide, not calendar-only)
- **TASK-023** — everything under "Open follow-ups" below
- **TASK-024** — popover viewport overflow at short window heights

Add new findings to both: the row in `TASKS.md` so it gets scheduled, the
reasoning here so it is worth picking up.

## Open follow-ups

### Worth doing

- **Year-lens padding cells** render untinted with no total in their aria-label,
  yet clicking one navigates to its true month where it may have real spend.
  Standard calendar behaviour, but the cell looks empty.
- **A category created while a partial filter is active** renders deselected
  rather than joining the all-selected set. Self-corrects on reselect-all.
- **Colour semantics disagree between lenses.** Week-lens cards use
  `--brand-primary` for an ordinary charge; month-lens cells use the item's
  category colour for the same thing.
- **`railFits` keys off `window.innerWidth`**, but the spec says the rail should
  hide when the *main panel* drops below 1024px. With the sidebar dragged to its
  420px maximum the panel is ~530px narrower than the window.

### Cleanup

- **The selection `boxShadow` string is duplicated** across `DayCell`,
  `WeekGrid`, and `YearGrid`. A `selectionRing()` helper would collapse it.
- **`occurrences.ts` is ~340 lines** carrying projection, filtering, and day
  summarisation. Coherent today; a split candidate if it grows.
- **Unreachable `default` branches** in both `occurrences.ts` switches suppress
  TypeScript exhaustiveness checking. `occurrenceIndexBounds`' default returns
  `{lo: 0, hi: -1}`, which would render an empty calendar with no error if a
  `daily` cycle were ever added. An `assertNever` would surface it.

### Test coverage

- **The `⌘1`–`⌘6` shortcut renumbering has no test.** The guard bound and the
  view array must agree or a view becomes keyboard-unreachable; agreement is
  currently verified only by inspection. Lifting the array into
  `constants.ts` and asserting it against `NAV_ITEMS` would make it durable.
- **`occurrences.test.ts` cases 2 and 3** place the anchor inside their own
  range, giving every cycle a trivial `n=0` self-match. This weakens the
  per-cycle vacuity guard: deleting case 4 would leave the yearly sum non-zero
  and the guard green, despite losing the only case where the calendar-year
  differences to `rangeStart` and `rangeEnd` actually differ.

### Polish

- `hasTrialEnd` gets no day-total colour treatment where `hasOverdue` does.
- Lens changes slide rather than cross-fade; the `AnimatePresence` key includes
  the lens, so a lens switch replays whatever direction the last page set.
- `Enter` always opens the selected day's first item, never focuses the rail
  when a day holds several.
- The empty-range message renders below the whole layout rather than in-grid,
  and also fires in year lens where it reads oddly under twelve grids.
- `.calendar-logo-ring` rings in `--bg-card` while `.calendar-day:hover`
  switches the cell to `--bg-hover`, so the separator rings go the wrong colour
  on hover.
- `gridDays` is built for all three lenses but the year branch never uses it —
  371 `Date` objects allocated and discarded per render.

## Known limitation, inherited deliberately

Day, week, month, and year totals sum raw `amount` values and format as USD.
This matches what `Dashboard` and `Analytics` already do — `formatCurrency`
defaults to USD and no aggregate caller passes a per-item currency. An account
holding both USD and EUR items already gets wrong totals elsewhere in the app.
The calendar inherits the behaviour so the surfaces agree rather than
disagreeing in a new way. Fixing it means an FX source or per-currency
subtotals, app-wide.
