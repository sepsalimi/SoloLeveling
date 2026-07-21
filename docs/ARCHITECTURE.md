# Architecture

## Client

The Expo app uses Expo Router for file-based navigation and a small local state provider in `src/context/AppState.tsx`. Demo mode persists activities, sessions, and preferences with AsyncStorage so the MVP can be exercised without backend keys.

Core domain logic is isolated in `src/lib`:

- `duration.ts` parses explicit ranges and duration phrases.
- `duplicates.ts` removes repeated extracted activities across follow-up notes.
- `analytics.ts` calculates tracked time, untracked time, social split, purpose totals, average efficiency, effective focused minutes, and daily series.
- `validation.ts` validates structured model output with Zod.

Screens live in `app`:

- `auth.tsx`: email/password auth and demo entry.
- `onboarding.tsx`: reminder and privacy preferences.
- `(tabs)/home.tsx`: today summary.
- `(tabs)/check-in.tsx`: voice/text capture.
- `review.tsx`: extracted activity review and save.
- `(tabs)/analytics.tsx`: period analytics and charts.
- `(tabs)/history.tsx`: search/filter/edit/delete surface.
- `(tabs)/settings.tsx`: preferences, export, privacy, logout, delete-account entry.

## Backend

Supabase owns authentication, Postgres, storage, Edge Functions, and RLS. The migration defines `profiles`, `user_preferences`, `check_in_sessions`, `voice_notes`, and `activity_entries` with user-scoped RLS policies.

OpenAI calls must go through `supabase/functions/process-check-in`. The function accepts a transcript and existing activities, calls a text model with Structured Outputs, and returns strict JSON. A production voice path should add an audio upload endpoint or function branch that transcribes first, then extracts activities, then deletes storage objects when `retain_audio=false`.

## Data flow

1. User records or types a check-in.
2. Audio is uploaded to Supabase Storage in production, or text is submitted directly.
3. Supabase Edge Function transcribes and extracts structured activities.
4. Client validates output and filters duplicates.
5. User reviews, edits, merges, splits, or deletes entries.
6. Approved entries are saved to Supabase or local demo storage.
7. Analytics recompute from saved entries.

## Security posture

- OpenAI keys are server-side only.
- RLS scopes every personal table to `auth.uid()`.
- The app does not request location, contacts, photos, messages, or calendar access.
- Raw audio retention is disabled by default.
- Sensitive content should never be logged.