# Calendar view — deferred items and follow-ups

**Date:** 2026-08-10
**Branch:** `claude/calendar-subscription-bills-b3f66f`
**Spec:** [2026-08-09-calendar-view-design.md](specs/2026-08-09-calendar-view-design.md)
**Plan:** [2026-08-09-calendar-view.md](plans/2026-08-09-calendar-view.md)

Everything here was found by review during implementation, triaged, and
deliberately not fixed. Nothing in this list blocks merge. It is recorded
because the reasoning behind each deferral is worth more than the one-line
symptom, and none of it lives in git history.

## The standing gap

**No part of this calendar has ever been seen rendered.** The app sits behind a
Supabase sign-in wall whose session lives in the Tauri webview, separate from
any browser that could be driven, so every browser-verification step in the plan
was skipped. Verification was: 123 passing tests, a clean typecheck, and close
code review at every task.

The manual both-theme check was substituted with a token audit confirming all 14
CSS custom properties used by calendar code resolve in both the light and
`.dark` blocks of `src/index.css`. That is a proxy, not a substitute.

**Check these five first when someone can finally look**, ranked by likelihood ×
obviousness (from the final whole-branch review):

1. **Icon stack width.** Fixed pre-merge by dropping the day-cell logos to 22px,
   but the arithmetic was never confirmed on screen. Open the calendar at the
   default 1280×800 window on a month with a day holding 4+ charges. The stack
   plus `+N` pill should fit; collapsing the rail (`⌘.`) buys ~42px per cell.
2. **Paging and selection.** Click a day, page forward, Tab — the grid should
   still have exactly one tab stop. Press `→` — it should not jump back a month.
3. **Year lens keyboard.** Press `Y`, then arrows — the selected square should
   visibly move. Tab should not trap you for hundreds of stops.
4. **Trial-end days.** Needs an item with a `trial_end_date` in view. Expect an
   amber edge, an hourglass marker, and no `$0` total.
5. **Week lens at realistic widths.** ~90px per column at 1280 with the rail
   open leaves roughly 34px for a name. The week lens exists specifically to
   show names at full length; check that it actually does.

## Open follow-ups

### Worth doing

- **`WeekGrid` shows "$0.00" on a trial-end-only day.** Narrower than the
  equivalent bug fixed in `DayCell` pre-merge — `WeekGrid` builds no ARIA
  sentence, so the accessibility harm does not recur, but the figure is
  misleading. Separate code path: `WeekGrid.tsx` gates on
  `occurrences.length > 0` rather than a charge count. Confirmed by two
  independent reviews.
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

- **Seven-day chunking exists three times** — `MonthGrid`, `YearGrid`,
  `CashFlowStrip` — and `WEEK_OPTIONS` twice. Export both from
  `calendarRange.ts`. This is the largest drift risk between the three lenses.
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
