# SubTrkr Desktop Docs Guide

Use this folder as a queue, not a dump.

## Start Here

1. Read `docs/ROADMAP.md` for current priorities and the recommended next session.
2. Read `docs/TASKS.md` for the concrete operating queue.
3. If the work touches shared Supabase schema or write paths, read `docs/SUPABASE_BACKEND_WORKFLOW.md` before touching code.
4. Open the matching file in `docs/plans/` for active implementation context.
5. Use `docs/completed-plans/` and `docs/completed/` only for historical context.

## Current Active Plans

- `docs/plans/TRIAL_PRICING_FOLLOW_UP.md` — split free-trial pricing from post-trial pricing in the data model, UI, and notifications

## Structure

- `docs/ROADMAP.md` — source of truth for completed work, remaining priorities, and what to tackle next
- `docs/TASKS.md` — action queue for concrete tasks, follow-ups, and blocked work
- `docs/SUPABASE_BACKEND_WORKFLOW.md` — safe workflow for shared backend changes from the desktop repo
- `docs/PRODUCTION_RELEASE_WORKFLOW.md` — release process for production desktop builds
- `docs/RELEASE_CAPTAIN_CHECKLIST.md` — short pre-release and post-release checklist
- `docs/UPDATER_TESTING_GUIDE.md` — updater-specific verification workflow
- `docs/plans/` — active or upcoming plans only
- `docs/PLAN_TEMPLATE.md` — starter structure for new plan docs
- `docs/completed-plans/` — finished design docs and implementation plans
- `docs/completed/` — completed summaries, session notes, and legacy one-off docs
- `docs/architecture/` — stable system and feature architecture docs
- `docs/notifications/` — notification setup, customization, and backlog docs
- `docs/reference/` — design system, theming, backend reference notes, and setup docs
- `docs/guides/` — task-oriented how-to guides
- `docs/email-templates/` — Supabase email template assets and install notes
- `docs/IOS_DESIGN_HANDOFF.md` — visual/design source of truth for shared product language

## Workflow

- `docs/ROADMAP.md` answers: what matters next?
- `docs/TASKS.md` answers: what concrete tasks exist right now?
- `docs/SUPABASE_BACKEND_WORKFLOW.md` answers: where should shared backend work happen?
- `docs/plans/` answers: how should a selected task be executed?
- `docs/completed-plans/` and `docs/completed/` answer: what already shipped, and what context is worth keeping?

## Tracking Rule

- If implementation work spawns later follow-ups, add them to `docs/TASKS.md` immediately.
- If a follow-up needs deeper context, create a new plan in `docs/plans/` and keep the task row as the pointer back to it.
- When a plan is finished, move it into `docs/completed-plans/`.
- Historical fix summaries, session notes, or deprecated guidance belong in `docs/completed/`, not the root docs index.

## Working Rule

If you ask what to do next, start with `docs/ROADMAP.md`, then `docs/TASKS.md`, then open the highest-priority file still in `docs/plans/`.
