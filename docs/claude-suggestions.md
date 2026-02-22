# Claude's Suggestions for SubTrkr

## What's Working Well

- **Clean component architecture** - Good separation between UI components, services, and types
- **Unified Item model** - Smart approach using `item_type` to handle both subscriptions and bills
- **Status system** - The active/paused/cancelled/archived flow with history tracking is well thought out
- **CSS variables for theming** - Makes light/dark mode clean and maintainable

---

## Suggestions to Consider

### Quick Wins

1. **Fix the CSS warning**
   - Move the Google Fonts `@import` to the top of `index.css` (before any rules) or into `index.html` `<head>` for better performance

2. **Clean up deprecations**
   - `is_active` field and `toggleItemActive` function are marked deprecated but still exist
   - Consider removing these once fully migrated to the status system

### Future Enhancements

 - add a budget feature in settings and wire it up to dashboard/analytics
 

3. **Manual logo override**
   - Let users paste a custom logo URL for obscure services that logo.dev doesn't have
   - Could add a small "edit" button on the logo in the form

4. **Logo validation**
   - Before saving, verify the logo.dev URL actually returns an image (some domains return 404)
   - Could show a preview in the form

5. **Expand the services list**
   - Grow the curated list in `/src/data/knownServices.ts` over time based on commonly added services
   - Currently ~55 services, could add more regional/niche ones

### Performance (when it matters)

6. **Code splitting**
   - The 875KB bundle triggers a warning
   - Could lazy-load Analytics and Settings since they're not the primary views
   - Use `React.lazy()` and `Suspense`

7. **Logo preloading**
   - Preload logos for upcoming items shown on Dashboard
   - Improves perceived performance

### Architecture Thoughts

8. **Component size**
   - `ItemList.tsx` (634 lines) and `ItemForm.tsx` (500+ lines) are getting large
   - Could extract sub-components like `ItemCard`, `ItemFilters`, `FormFields`
   - Not urgent, but helps maintainability as the app grows

---

## Database Migration Reminder

Don't forget to run the migration for the new `logo_url` column:

```sql
ALTER TABLE items ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
```

Migration file: `/supabase/migrations/20260126_add_logo_url.sql`
