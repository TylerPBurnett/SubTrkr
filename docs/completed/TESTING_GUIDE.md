# Context Menu Dropdown - Testing Guide

## Quick Start

Run the development server:
```bash
npm run dev
```

## Test Scenarios

### Grid View Tests

#### 1. Top-Left Card (Should open DOWNWARD)
1. Switch to grid view
2. Click the three-dots menu on a card in the first row
3. **Expected**: Menu opens below the button with slide-down animation
4. **Verify**: Menu is fully visible and not cut off

#### 2. Bottom Row Card (Should open UPWARD)
1. Scroll to see cards at the bottom of the grid
2. Click the three-dots menu on a card in the last visible row
3. **Expected**: Menu opens above the button with slide-up animation
4. **Verify**: Menu is fully visible and not cut off by viewport bottom

#### 3. Right Edge Card (Horizontal Alignment)
1. Resize window to make grid narrower (2 columns)
2. Click the three-dots menu on a card at the right edge
3. **Expected**: Menu stays within viewport, doesn't overflow right edge
4. **Verify**: Menu is fully visible horizontally

#### 4. Z-Index Test (Most Important)
1. Open a menu on a card in the middle of the grid
2. **Expected**: Menu appears ABOVE all other cards
3. **Verify**:
   - Menu is not hidden behind any card
   - Menu shadow is visible
   - Can click all menu items

#### 5. Scroll Test
1. Open any menu
2. Scroll the page while menu is open
3. **Expected**: Menu repositions to stay aligned with button
4. Close menu by clicking outside

### List View Tests

#### 1. First Row (Should open DOWNWARD)
1. Switch to list view
2. Click the three-dots menu on the first row
3. **Expected**: Menu opens below the button
4. **Verify**: Menu doesn't overlap table header

#### 2. Last Visible Row (Should open UPWARD)
1. Scroll to bottom of list
2. Click the three-dots menu on the last visible row
3. **Expected**: Menu opens above the button
4. **Verify**: Menu is not cut off by table bottom or viewport

#### 3. Near-Bottom Row (Critical Test)
1. Position a row so it's about 100px from the bottom of viewport
2. Click the three-dots menu
3. **Expected**: Menu opens upward if not enough space below
4. **Verify**: Entire menu is visible

#### 4. Scroll Test (List View)
1. Open a menu on any row
2. Scroll the list/table
3. **Expected**: Menu repositions smoothly
4. Click outside to close

### Animation Tests

#### 1. Downward Opening Animation
1. Open a menu that should open downward
2. **Expected**: Menu slides down with fade-in (8px translateY)
3. **Verify**: Smooth animation, no jank

#### 2. Upward Opening Animation
1. Open a menu that should open upward
2. **Expected**: Menu slides up with fade-in (reverse direction)
3. **Verify**: Smooth animation, transform origin is bottom-right

#### 3. No Flicker on Open
1. Open any menu
2. **Expected**: No visible position jump or flash
3. **Verify**: Menu appears smoothly at correct position

### Interaction Tests

#### 1. Menu Actions Work
1. Open any menu
2. Click "Edit"
3. **Expected**: Edit dialog opens, menu closes
4. Repeat for other actions (Pause, Cancel, etc.)

#### 2. Visit Website Link
1. Open menu on item with URL
2. Click "Visit Website"
3. **Expected**: Opens in new tab, menu closes

#### 3. Delete Confirmation
1. Open menu
2. Click "Delete"
3. **Expected**: Confirmation dialog appears, menu closes

#### 4. Click Outside to Close
1. Open any menu
2. Click anywhere outside the menu
3. **Expected**: Menu closes immediately

#### 5. Backdrop Click
1. Open any menu
2. Click the backdrop (dimmed area)
3. **Expected**: Menu closes

### Edge Cases

#### 1. Narrow Viewport
1. Resize window to very narrow (mobile-like width)
2. Open menu on right-side cards
3. **Expected**: Menu adjusts position to stay within viewport

#### 2. Very Tall Menu
1. Open menu on item with many status-specific actions
2. Ensure menu height exceeds available space
3. **Expected**: Menu flips to direction with more space

#### 3. Rapid Open/Close
1. Quickly click menu button multiple times
2. **Expected**: Menu toggles cleanly without memory leaks or stale state

#### 4. Window Resize While Open
1. Open a menu
2. Resize browser window
3. **Expected**: Menu repositions to stay visible

## Browser Testing

Test in these browsers for compatibility:
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (if on macOS)
- [ ] Mobile browsers (responsive view or actual device)

## Performance Checks

1. **Frame Rate**: Use browser DevTools Performance tab
   - Open/close menu should be smooth (60fps)
   - No layout thrashing

2. **Memory**: Use Memory profiler
   - Open/close menu 50 times
   - Check for memory leaks (should be stable)

3. **Event Listeners**: Use DevTools Elements → Event Listeners
   - Verify scroll and resize listeners are removed when menu closes

## Known Working Scenarios

Based on the implementation:
- ✅ Portal rendering prevents all z-index issues
- ✅ Dynamic positioning handles all viewport positions
- ✅ Animations are direction-aware
- ✅ Event listeners are properly cleaned up
- ✅ Works with keyboard navigation (existing behavior)
- ✅ ARIA attributes maintained for accessibility

## What to Look For (Issues)

If you encounter any of these, please report:
- Menu appears in wrong position
- Menu flickers or jumps on open
- Menu hidden behind cards
- Menu cut off by viewport
- Menu doesn't reposition on scroll
- Animation stutters or wrong direction
- Click outside doesn't close menu
- Memory issues with repeated use

## Success Criteria

The fix is successful if:
1. ✅ Menu NEVER hidden behind other elements (grid or list)
2. ✅ Menu NEVER cut off by viewport boundaries
3. ✅ Menu opens in optimal direction based on space
4. ✅ Animations are smooth and direction-appropriate
5. ✅ All menu actions work as before
6. ✅ No performance degradation
7. ✅ No console errors or warnings
