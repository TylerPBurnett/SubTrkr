# Toggle View Suggestions

- Dropdown clipping in list view: the list container uses `overflow-hidden` on the card, so the actions menu can get cut off near the edges. If you notice that, either remove `overflow-hidden` on the list wrapper or render the menu in a portal. (`src/components/ItemList.tsx`)
- Small screens: the table has a `minWidth`, so it will scroll horizontally. If that feels clunky, consider hiding less-critical columns on small widths or switching to stacked rows. (`src/components/ItemList.tsx`)
- Toggle accessibility: add `aria-pressed` to the grid/list buttons and maybe a visible focus ring for keyboard users. (`src/components/ItemList.tsx`)
- Preference scope: right now the view preference is per item type (bills vs subscriptions). If you want a single global preference, change the storage key. (`src/components/ItemList.tsx`)
