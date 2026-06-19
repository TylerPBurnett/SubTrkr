# Custom Logo Import Plan

> Date: 2026-04-12
> Status: Proposed follow-up after `TASK-008`
> Scope: Replace direct remote `logo_url` rendering with app-controlled imported logo assets so CSP can stay tight without losing custom logo support

---

## Summary

SubTrkr currently stores `logo_url` and renders it directly into `<img>` tags. That conflicts with the new production CSP whenever a saved logo is hosted outside approved origins. The long-term secure fix is to treat custom logos as imported assets rather than permanently hotlinked remote images.

The target model is:

- `url` remains the subscription website URL
- custom logos can come from file upload or a pasted image URL
- the app imports, validates, and stores the logo in app-controlled storage
- the UI renders only stored local/app-controlled assets, not arbitrary third-party image URLs

## Problem

- Production CSP currently blocks many existing external `logo_url` values
- Broadening `img-src` to arbitrary remote hosts weakens CSP and leaks network metadata to third parties
- Direct remote logo rendering is brittle and can break when hosts change, redirect, rate-limit, or disappear
- The current model couples user customization to runtime network access instead of a stable asset owned by the app

## Goal

- Preserve a tight CSP
- Allow custom logos without requiring `img.logo.dev`
- Support both file upload and fetch-from-URL import
- Render only app-controlled stored assets in the UI
- Define a compatibility path for existing legacy `logo_url` values

## Non-Goals

- Opening `img-src` to arbitrary `https:` origins
- Reworking all branding/logo UX in one pass
- Building cloud image hosting unless local app storage proves insufficient
- Solving cross-device logo sync if local app-controlled storage is chosen first

## Proposed Direction

- Keep `url` as the website URL used for the subscription itself
- Introduce a real logo import flow:
  - upload image file
  - or paste image URL and import it once
- Validate imported images by type, size, and decode success
- Normalize imported images into a safe stored asset format and size
- Persist a stored asset reference instead of a raw external image URL
- Continue using `img.logo.dev` only as an optional source during auto-fill/import, not as the only supported custom-logo path

## Likely Touch Points

- `src/components/ItemForm.tsx`
- `src/components/item-form/useItemFormState.ts`
- `src/components/ui/ServiceLogo.tsx`
- `src/services/database/catalog.ts`
- `src/types/index.ts`
- `src-tauri/tauri.conf.json`
- Tauri-side local app data storage or a dedicated frontend storage utility

## Migration / Compatibility Questions

- How should existing external `logo_url` rows be handled?
- Should legacy remote logos be imported lazily when an item is viewed or edited, or via an explicit one-time migration flow?
- If local storage is used first, what is the acceptable sync story across multiple devices?
- Should the app keep a short-term compatibility allowlist during migration, or force manual re-import?

## Recommended Execution Order

1. Define the stored logo asset model and storage location
2. Add import pipeline for file and URL sources
3. Update item form UX to distinguish website URL from logo asset
4. Update rendering to use stored asset references only
5. Add compatibility handling for legacy external `logo_url` values
6. Tighten or preserve CSP once runtime rendering no longer depends on arbitrary remote hosts

## Source Material

- Hardening context and current blocker tracking live in [docs/completed-plans/PRODUCTION_HARDENING_PLAN.md](../completed-plans/PRODUCTION_HARDENING_PLAN.md)

## Exit Criteria

- Users can set a custom logo without relying on `img.logo.dev`
- The app no longer needs arbitrary remote image hosts in CSP
- Existing users with legacy external logos have a defined migration or fallback path
- Item list, dashboard, and analytics render logos from app-controlled assets
- The docs clearly distinguish subscription website URLs from imported logo assets
