/**
 * The app's stacking ladder, written down because it was previously only
 * implied by scattered Tailwind classes — and because getting it wrong is
 * silent. Nothing throws when two layers tie; the browser just picks the one
 * later in the DOM, and the loser becomes invisible or unclickable with no
 * warning anywhere.
 *
 * ## The ladder
 *
 * | z-index | Layer                | Examples                                    |
 * |---------|----------------------|---------------------------------------------|
 * | 10–30   | in-page chrome       | sticky headers, selection HUD               |
 * | 50      | base dialogs         | `ItemForm`, `StatusChangeDialog`            |
 * | 60      | second-level dialogs | `ConfirmDialog`, `BulkCategoryDialog`       |
 * | 70      | `StatusHistoryDialog`|                                             |
 * | 80      | floating layers      | popover, select, dropdown-menu              |
 *
 * ## Why floating layers sit ABOVE every dialog
 *
 * A popover, select, or dropdown is spawned *by* the content under it, and it
 * is always transient — it closes the moment you interact anywhere else. There
 * is no state in which one should be covered by the surface that opened it.
 *
 * All three used to sit at 50, which put them at or below every dialog on the
 * ladder. Inside `ItemForm` (also 50) they tied and lost on DOM order, so
 * every DatePicker in the item form opened a calendar that could not be
 * clicked: the modal's `backdrop-blur-md` overlay was the element under the
 * cursor, and `document.elementFromPoint` at the calendar's centre returned
 * the backdrop rather than any day button. Inside `ConfirmDialog` (60) or
 * `StatusHistoryDialog` (70) they lost outright.
 *
 * ## Adding a layer
 *
 * New dialogs slot at 50/60/70 by nesting depth. Anything above 70 must stay
 * below 80, or it will start covering its own popovers. If you need a layer
 * above the floating tier, you are probably building a dialog and want 70.
 */

export const DIALOG_LAYER = {
  /** Base dialogs opened from a page. */
  base: 50,
  /** Dialogs opened from inside another dialog. */
  nested: 60,
  /** `StatusHistoryDialog`, which opens above a nested dialog. */
  history: 70,
  /** Popover, select, dropdown-menu — above everything that can spawn them. */
  floating: 80,
} as const;
