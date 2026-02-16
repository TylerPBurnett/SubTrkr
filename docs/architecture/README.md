# Architecture Documentation

Core system architecture and implementation details for SubTrkr.

## 📚 Documentation Index

### Authentication & Security
- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Complete auth system overview
  - Session management, auth methods (email/password, OTP, OAuth)
  - Database integration, RLS patterns
  - UI components and security considerations
  - Quick reference for all auth-related files

### Notifications
- **[TELEGRAM_ARCHITECTURE.md](./TELEGRAM_ARCHITECTURE.md)** - Telegram bot integration
  - User-owned bot setup, webhook handling
  - Chat ID auto-detection
  - Edge Functions implementation

- **[TIMEZONE_IMPLEMENTATION.md](./TIMEZONE_IMPLEMENTATION.md)** - User timezone handling
  - 9 AM local time notification logic
  - Timezone storage and conversion
  - `pg_cron` scheduling patterns

### Business Logic
- **[TRIAL_AUTOMATION_CHANGES.md](./TRIAL_AUTOMATION_CHANGES.md)** - Trial period automation
  - Auto-convert trials to paid/cancelled
  - Status transitions and billing logic

## 🔍 Quick Lookup

Need to find something fast? Use this table:

| Topic | Document | Key Info |
|-------|----------|----------|
| How auth works | [AUTHENTICATION.md](./AUTHENTICATION.md) | Session lifecycle, getUserId pattern |
| Auth file locations | [AUTHENTICATION.md](./AUTHENTICATION.md) | Quick Reference section |
| OAuth in Tauri | [AUTHENTICATION.md](./AUTHENTICATION.md) | skipBrowserRedirect pattern |
| RLS policies | [AUTHENTICATION.md](./AUTHENTICATION.md) | Database Integration section |
| Telegram bots | [TELEGRAM_ARCHITECTURE.md](./TELEGRAM_ARCHITECTURE.md) | User-owned bot flow |
| Notification timing | [TIMEZONE_IMPLEMENTATION.md](./TIMEZONE_IMPLEMENTATION.md) | 9 AM local time logic |
| Trial expiration | [TRIAL_AUTOMATION_CHANGES.md](./TRIAL_AUTOMATION_CHANGES.md) | Auto-conversion rules |

## 📁 Related Documentation

### Notifications
See [../notifications/](../notifications/) for notification system setup and configuration:
- `NOTIFICATION_SETUP.md` - Initial setup guide
- `NOTIFICATION_CUSTOMIZATION.md` - Advanced configuration
- `NOTIFICATIONS_COMPLETE.md` - System overview

### Guides
See [../guides/](../guides/) for how-to guides:
- `adding-services.md` - Adding new known services

### Reference
See [../reference/](../reference/) for reference docs:
- `DESIGN_SYSTEM.md` - UI/UX design system
- `Sonnet_recs.md` - Claude Sonnet recommendations

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────┐
│                      SubTrkr App                        │
│                    (Tauri + React)                      │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌──────────┐
   │  Auth  │  │Database │  │Real-time │
   │Supabase│  │Supabase │  │Supabase  │
   └────────┘  └─────────┘  └──────────┘
        │            │            │
        └────────────┼────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐
   │Edge Func│  │ pg_cron  │  │Telegram  │
   │send-noti│  │  hourly  │  │   Bot    │
   └─────────┘  └──────────┘  └──────────┘
```

## 🎯 Architecture Principles

1. **Service Layer Pattern** - All business logic in `src/services/`
2. **getUserId() Helper** - Consistent auth checks before DB operations
3. **RLS Policies** - Database enforces access control
4. **Lifted State** - State management in `App.tsx` (no Redux/Zustand)
5. **CSS Variables** - Theme system via custom properties
6. **Lazy Loading** - Code splitting for heavy components

See [MEMORY.md](../../.claude/projects/-Users-tyler-Development-SubTrkr/memory/MEMORY.md) for project conventions.

## 📝 Contributing to Docs

When adding new architecture documentation:

1. **Place it here** (`docs/architecture/`)
2. **Follow naming convention**: `UPPERCASE_WITH_UNDERSCORES.md`
3. **Update this README** - Add to index and quick lookup table
4. **Include sections**:
   - Overview
   - Quick Reference (file locations, key patterns)
   - Architecture diagrams (when helpful)
   - Code examples
   - Related documentation links
5. **Date it** - Include "Last Updated" at the top

---

**Last Updated:** 2026-02-15
