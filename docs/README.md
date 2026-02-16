# SubTrkr Documentation

Welcome to the SubTrkr documentation! This folder contains all technical documentation, guides, architecture details, and implementation plans.

## 📂 Documentation Structure

```
docs/
├── architecture/          # Core system architecture
├── guides/               # How-to guides
├── notifications/        # Notification system docs
├── plans/               # Implementation plans
├── reference/           # Design systems and references
└── [root files]         # Session notes, testing guides, etc.
```

## 🎯 Start Here

### New to the Project?
1. Read [MEMORY.md](../.claude/projects/-Users-tyler-Development-SubTrkr/memory/MEMORY.md) for project conventions
2. Check [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md) for auth system
3. Review [PRODUCTION_RELEASE_WORKFLOW.md](./PRODUCTION_RELEASE_WORKFLOW.md) for release process

### Need to Understand a System?
- **Authentication** → [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md)
- **Notifications** → [notifications/NOTIFICATION_SETUP.md](./notifications/NOTIFICATION_SETUP.md)
- **Telegram Integration** → [architecture/TELEGRAM_ARCHITECTURE.md](./architecture/TELEGRAM_ARCHITECTURE.md)
- **Timezones** → [architecture/TIMEZONE_IMPLEMENTATION.md](./architecture/TIMEZONE_IMPLEMENTATION.md)
- **UI/UX Design** → [reference/DESIGN_SYSTEM.md](./reference/DESIGN_SYSTEM.md)
- **Theming** → [THEMING.md](./THEMING.md)

### Need to Do Something?
- **Add a Service** → [guides/adding-services.md](./guides/adding-services.md)
- **Test the App** → [TESTING_GUIDE.md](./TESTING_GUIDE.md)
- **Test Updates** → [UPDATER_TESTING_GUIDE.md](./UPDATER_TESTING_GUIDE.md)
- **Release to Production** → [PRODUCTION_RELEASE_WORKFLOW.md](./PRODUCTION_RELEASE_WORKFLOW.md)
- **Review Before Release** → [RELEASE_CAPTAIN_CHECKLIST.md](./RELEASE_CAPTAIN_CHECKLIST.md)

## 📚 Documentation by Category

### 🏗️ Architecture
Core system designs and technical implementations.

| Document | Description |
|----------|-------------|
| [AUTHENTICATION.md](./architecture/AUTHENTICATION.md) | Complete auth system: session management, OAuth, RLS patterns |
| [TELEGRAM_ARCHITECTURE.md](./architecture/TELEGRAM_ARCHITECTURE.md) | User-owned Telegram bot integration |
| [TIMEZONE_IMPLEMENTATION.md](./architecture/TIMEZONE_IMPLEMENTATION.md) | User timezone handling for notifications |
| [TRIAL_AUTOMATION_CHANGES.md](./architecture/TRIAL_AUTOMATION_CHANGES.md) | Trial period auto-conversion logic |

### 📖 Guides
Step-by-step how-to guides for common tasks.

| Document | Description |
|----------|-------------|
| [adding-services.md](./guides/adding-services.md) | How to add new services to the known services list |

### 🔔 Notifications
Notification system setup and configuration.

| Document | Description |
|----------|-------------|
| [NOTIFICATION_SETUP.md](./notifications/NOTIFICATION_SETUP.md) | Initial notification system setup |
| [NOTIFICATION_CUSTOMIZATION.md](./notifications/NOTIFICATION_CUSTOMIZATION.md) | Advanced notification configuration |
| [NOTIFICATIONS_COMPLETE.md](./notifications/NOTIFICATIONS_COMPLETE.md) | Complete notification system overview |
| [NOTIFICATION_IMPROVEMENTS.md](./notifications/NOTIFICATION_IMPROVEMENTS.md) | Optimization history and improvements |

### 📝 Plans
Implementation plans for major features.

| Document | Description |
|----------|-------------|
| [plan.md](./plans/plan.md) | Main project plan |
| [next.md](./plans/next.md) | Upcoming features |
| [2026-02-14-repo-structure-*.md](./plans/) | Repository structure design & implementation |
| [SubTrkr - Subscription Tracker App v1 plan.md](./plans/) | Original v1 plan |

### 🎨 Reference
Design systems, patterns, and recommendations.

| Document | Description |
|----------|-------------|
| [DESIGN_SYSTEM.md](./reference/DESIGN_SYSTEM.md) | UI/UX design system and patterns |
| [Sonnet_recs.md](./reference/Sonnet_recs.md) | Claude Sonnet recommendations |

### 🧪 Testing & Release
Testing guides and production release workflows.

| Document | Description |
|----------|-------------|
| [TESTING_GUIDE.md](./TESTING_GUIDE.md) | General testing guide |
| [UPDATER_TESTING_GUIDE.md](./UPDATER_TESTING_GUIDE.md) | Testing the Tauri updater |
| [PRODUCTION_RELEASE_WORKFLOW.md](./PRODUCTION_RELEASE_WORKFLOW.md) | Complete release process |
| [RELEASE_CAPTAIN_CHECKLIST.md](./RELEASE_CAPTAIN_CHECKLIST.md) | Pre-release checklist |

### 🎨 UI/UX
User interface and experience documentation.

| Document | Description |
|----------|-------------|
| [THEMING.md](./THEMING.md) | Theme system implementation |
| [THEME_EXTENSION_SUMMARY.md](./THEME_EXTENSION_SUMMARY.md) | Theme extension summary |
| [UI_CONTAINER_STYLE_NOTES.md](./UI_CONTAINER_STYLE_NOTES.md) | UI container styling patterns |
| [ICON_SETUP.md](./ICON_SETUP.md) | App icon setup |
| [SettingsUXplan.md](./SettingsUXplan.md) | Settings screen UX plan |

### 📋 Session Notes
Development session summaries and fixes.

| Document | Description |
|----------|-------------|
| [session-2026-01-27-form-logo-fixes.md](./session-2026-01-27-form-logo-fixes.md) | Form and logo fixes |
| [DROPDOWN_FIX_SUMMARY.md](./DROPDOWN_FIX_SUMMARY.md) | Dropdown component fixes |
| [chart-enhancements.md](./chart-enhancements.md) | Chart component enhancements |
| [SEARCH_FILTER_PLAN.md](./SEARCH_FILTER_PLAN.md) | Search and filter implementation |
| [TRIAL_PRICING_FOLLOW_UP.md](./TRIAL_PRICING_FOLLOW_UP.md) | Trial pricing follow-up notes |

### 🤖 AI/Agent Docs
AI agent configuration and usage.

| Document | Description |
|----------|-------------|
| [agents.md](./agents.md) | AI agent instructions and workflows |
| [claude-suggestions.md](./claude-suggestions.md) | Claude AI suggestions |
| [toggleviewsuggestions.md](./toggleviewsuggestions.md) | View toggle suggestions |

## 🔍 Quick Find

Common lookups to save you time:

### Authentication
| What | Where |
|------|-------|
| Auth flow diagram | [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md#session-lifecycle) |
| File locations | [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md#quick-reference) |
| OAuth setup | [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md#3-oauth-google--github) |
| RLS patterns | [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md#row-level-security-rls) |
| Session management | [architecture/AUTHENTICATION.md](./architecture/AUTHENTICATION.md#session-state-management) |

### Notifications
| What | Where |
|------|-------|
| Setup guide | [notifications/NOTIFICATION_SETUP.md](./notifications/NOTIFICATION_SETUP.md) |
| Telegram bots | [architecture/TELEGRAM_ARCHITECTURE.md](./architecture/TELEGRAM_ARCHITECTURE.md) |
| Timezone logic | [architecture/TIMEZONE_IMPLEMENTATION.md](./architecture/TIMEZONE_IMPLEMENTATION.md) |
| 9 AM local time | [architecture/TIMEZONE_IMPLEMENTATION.md](./architecture/TIMEZONE_IMPLEMENTATION.md) |

### Development
| What | Where |
|------|-------|
| Add a service | [guides/adding-services.md](./guides/adding-services.md) |
| Design system | [reference/DESIGN_SYSTEM.md](./reference/DESIGN_SYSTEM.md) |
| Theme variables | [THEMING.md](./THEMING.md) |
| Testing | [TESTING_GUIDE.md](./TESTING_GUIDE.md) |

### Release
| What | Where |
|------|-------|
| Release workflow | [PRODUCTION_RELEASE_WORKFLOW.md](./PRODUCTION_RELEASE_WORKFLOW.md) |
| Pre-release checklist | [RELEASE_CAPTAIN_CHECKLIST.md](./RELEASE_CAPTAIN_CHECKLIST.md) |
| Updater testing | [UPDATER_TESTING_GUIDE.md](./UPDATER_TESTING_GUIDE.md) |

## 📖 Documentation Standards

When adding new documentation:

### File Naming
- **Architecture**: `UPPERCASE_WITH_UNDERSCORES.md` (e.g., `AUTHENTICATION.md`)
- **Guides**: `lowercase-with-dashes.md` (e.g., `adding-services.md`)
- **Session notes**: `session-YYYY-MM-DD-description.md`
- **Plans**: `plan-name.md` or dated `YYYY-MM-DD-description.md`

### Required Sections
1. **Title** - Clear, descriptive
2. **Last Updated** - Date in YYYY-MM-DD format
3. **Overview** - What this doc covers
4. **Quick Reference** - Key info at a glance (for architecture docs)
5. **Content** - Main documentation
6. **Related Documentation** - Links to related docs

### Best Practices
- ✅ Include code examples with file references (e.g., `src/App.tsx:114-128`)
- ✅ Add diagrams for complex flows (use ASCII art for simple ones)
- ✅ Link to related documentation
- ✅ Update this README when adding new docs
- ✅ Keep it concise - prefer links over duplication
- ✅ Date your documents

## 🛠️ Project Conventions

See [MEMORY.md](../.claude/projects/-Users-tyler-Development-SubTrkr/memory/MEMORY.md) for:
- Tooling (bun, not npm)
- Architecture patterns (service layer, lifted state)
- Database conventions (TEXT ids, RLS patterns)
- Notification system setup
- Pre-existing issues

## 📊 Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Desktop**: Tauri 2
- **Backend**: Supabase (Auth, Database, Realtime, Edge Functions, pg_cron)
- **Package Manager**: bun
- **Notifications**: Telegram, Discord, Slack

## 🔗 External Resources

- [Tauri Docs](https://v2.tauri.app/)
- [Supabase Docs](https://supabase.com/docs)
- [React 19 Docs](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

**Last Updated:** 2026-02-15

**Questions?** Check the [architecture](./architecture/) or [guides](./guides/) folders, or reference the quick find table above.
