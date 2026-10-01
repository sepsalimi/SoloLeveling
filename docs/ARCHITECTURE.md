# Architecture

## Domain model

`src/types/life.ts` defines the versioned planning document:

- broad life areas
- goals and linked projects
- tasks with priority, planned hours, optional due date, provenance, and recurrence
- dated task occurrences with independent completion history
- retained context notes

`src/types/activity.ts` defines actual activity events. Timed and untimed events retain `recordedAt` separately from the date on which the activity occurred. Activities may link to a known task or project and record completed versus partial progress.

Legacy Finance and activity categories are normalized by `src/lib/areas.ts`, `src/lib/lifePlan.ts`, and `src/lib/sessionMigration.ts`.

## Planning pipeline

1. `src/components/LifeCapture.tsx` accepts explicit-stop voice input or text.
2. `src/services/reasoning.ts` sends a bounded copy of active context to `reason-life`.
3. The function authenticates the bearer session, calls the server-configured DeepSeek model, and validates the returned goals, projects, tasks, inference provenance, dates, and recurrence.
4. `src/lib/reasoningContracts.ts` validates the response again on the client.
5. `src/lib/lifePlan.ts` resolves links against stable local identities and merges retries idempotently.
6. `src/services/taskStore.ts` saves to a tenant-scoped local key and syncs the signed-in plan through RLS.

The deterministic task bucket formula remains in `src/lib/tasks.ts`; the model never chooses those labels.

## Check-in pipeline

1. `src/components/TaskVoice.tsx` uses browser SpeechRecognition on web and Expo Audio on native.
2. Browser recognition restarts after service session endings. Silence does not submit. Background, permission, or connection interruption stops capture and preserves finalized text.
3. `src/services/checkInDraft.ts` stores the transcript, capture timestamp, local date, timezone, session identity, and clarification question under the active account/device scope.
4. `reason-check-in` resolves corrections and relative dates, excludes negative/future reports, retains untimed events, and checks plausibility per actual date.
5. The client validates returned dates and linked identifiers before `src/lib/automaticCheckIn.ts` creates stable activity IDs.
6. Web saves use IndexedDB; native saves use SQLite. Retry replaces the same session rather than appending duplicates.
7. Signed-in saves sync through `save_daily_check_in`. Task completion updates the dated occurrence while partial work moves the linked task to In Progress.

Local live cue matching is intentionally cheap and provisional. Durable records come only from validated reasoning output.

## Analytics

`src/lib/analytics.ts` aggregates saved timed events only. It:

- normalizes each event to one broad area for a mutually exclusive breakdown
- calculates unknown/untracked capacity across the full selected date range
- does not assume 100 percent efficiency when none was reported
- keeps purpose tags separate because overlapping tags are not a partition
- leaves untimed completions visible in History without adding zero or fabricated minutes

Planned task hours appear only in the planner chart.

## Isolation and security

- Local task, preference, legacy activity, session, and draft keys are scoped by Supabase user ID or the anonymous device scope.
- Anonymous data is never silently attached to a later account.
- Supabase tables use RLS with `auth.uid()`.
- Edge functions authenticate the bearer session before paid inference.
- Paid reasoning endpoints enforce a short per-user request window before contacting DeepSeek.
- The client validates model dates and only accepts task/project IDs from the supplied account context.
- API keys and reasoning traces never return to the client.
- Native Supabase sessions use encrypted AsyncStorage payloads with their encryption key in SecureStore.

## Deployment

The product source is `main`.

- `pages.yml` checks out `main`, runs typecheck/tests/export, prepares route shells, and publishes GitHub Pages.
- `deploy-reasoning.yml` checks out `main` and deploys `reason-check-in` plus `reason-life`.
- SQL migrations are reviewed and applied separately; function deployment never mutates the database.
