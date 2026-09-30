# Morning plans and voice check-ins

## Morning

Morning plans are optional. They select up to three unfinished tasks using hard deadlines, priority, recurring commitments, and work already in progress. Planned hours remain estimates and never become actual activity records.

Native builds can schedule silent local notifications on selected weekdays. Notification content opens the current plan rather than embedding a stale task list. The static web app shows in-app prompts only; it does not claim background push support.

## Evening or anytime

- Tap the microphone once to start and again to stop.
- Browser recognition restarts through pauses and service session endings.
- Silence and timers never submit.
- Only explicit Stop sends the completed turn to reasoning.
- Backgrounding, permission loss, or persistent speech-service failure stops capture and explains the interruption.
- Finalized words, original capture timestamp, timezone, and date anchor survive reload and retry.
- Native recordings use Expo Audio and are deleted from temporary storage after transcription or cancellation.

The reasoning output supports several historical dates in one turn. `recordedAt` remains the original capture timestamp while each timed or untimed event has its own occurred date. Durations are checked independently per actual date.

Plans, negated reports, and skipped activities are not logged. Partial progress does not complete a task. A clear untimed completion can complete its linked occurrence without adding invented minutes.

## Live cues

Local cue matching drives the colorful carousel without a model call for every interim word. A cue can be completed, partial, skipped, or planned. Addressed cues fade but stay readable, and color is not the only state indicator.

Task-derived cues augment the small default area set. Work and workout use separate matching rules. These cues are provisional; only validated server reasoning writes durable events.

## Persistence

- Web: IndexedDB sessions and normalized timed activities.
- Native: SQLite sessions and normalized timed activities.
- Untimed events remain in the versioned session payload and are visible/editable in History.
- Stable session and event IDs make retry idempotent.
- Account scope is part of every local record key.
- A failed cloud write leaves an explicit pending-sync message while preserving the local save.

The migration `202609300001_life_model.sql` updates the save RPC for multi-day events and per-date plausibility.
