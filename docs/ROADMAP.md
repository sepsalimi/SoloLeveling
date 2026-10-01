# Remaining work

## External validation

- Confirm email redirect settings and run a signed-in `reason-life` plus `reason-check-in` request against the deployed DeepSeek account.
- Review and apply all Supabase migrations to project `llfaamdiscrmurexamem`, then verify account-to-account RLS with real users.
- Verify native Expo Audio capture, temporary-file deletion, notification permissions, timezone changes, disabled schedules, and missed days on physical iOS and Android phones.

## Product follow-up

- Add a background web-push service if installed-PWA reminders are required. The current web build intentionally promises only in-app reminders.
- Add direct voice correction commands for existing saved entities beyond merge-by-title updates.
- Add richer calendar navigation and project/task drill-down from analytics.
- Add explicit available-capacity preferences to morning planning.
- Add conflict resolution for simultaneous edits from two devices. Current document sync uses `updatedAt` and last-write semantics.
- Add a first-party account UI for inspecting pending sync records.

## Operational follow-up

- Confirm the first `main` Pages deployment and direct-route refresh after the product merge.
- Deploy both reasoning functions.
- Apply the additive life-model migration only after remote schema inspection and backup review.
- Retire older OpenAI example functions if production confirms they are unused.
