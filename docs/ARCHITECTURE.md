# Architecture

## Product boundary

Life Analytics is a native-first Expo application. It records only while its recording screen is active and stores production account data in Supabase. There is no client-side OpenAI key or demo data path.

## Client

Expo Router owns navigation:

- `auth` and `reset-password` handle account access.
- `onboarding` stores initial preferences and schedules reminders.
- `(tabs)/check-in` records or accepts text and processes follow-up notes.
- `review` edits and approves the active draft.
- `home`, `analytics`, and `history` query the hydrated account state.
- `settings` manages reminders, privacy choices, export, logout, and deletion.

`AppStateProvider` restores the Supabase session and hydrates activities, sessions, and preferences through `dataRepository.ts`. Supabase remains the source of truth.

`CheckInDraftProvider` retains one unfinished session across the recording and review routes. AsyncStorage is used only for interrupted draft recovery, never as the production activity database. Native authentication tokens use SecureStore; web tokens use browser-compatible AsyncStorage.

Domain calculations remain in `src/lib`:

- `analytics.ts`: periods, comparisons, category and social totals, efficiency, effective focused time, and chart series.
- `duration.ts`: explicit clock and duration normalization used by fixtures.
- `duplicates.ts`: same-day duplicate detection.
- `validation.ts`: the client boundary for strict model output and activity edits.

## Check-in pipeline

### Text

1. Create or reuse a `check_in_sessions` draft.
2. Insert a processing `voice_notes` record representing the submitted note.
3. Invoke `process-check-in` with the new transcript and current draft activities.
4. Validate nullable Structured Output fields with Zod and deduplicate all entries.
5. Retain the transcript only when its UTF-8 size is at most 50 KB.
6. Persist the updated draft locally and open review.

### Voice

1. `expo-audio` records in the application document directory for at most five minutes.
2. The URI is attached to the local draft before network processing.
3. If retention is enabled, upload the file to the private `voice-notes` bucket.
4. Send the foreground file to `transcribe-note`.
5. Run the same extraction pipeline as text.
6. Delete the local file after successful processing; preserve it after failure for explicit retry.

No background upload or recording task is registered.

## Review and persistence

Review edits the complete `ActivityEntry` shape. Merge requires two selected entries; split requires one selected entry.

Saving invokes `public.complete_check_in`. The Postgres function validates session ownership and replaces session activities plus the session status in one transaction. A failed insert rolls back the replacement.

History uses ordinary RLS-scoped updates and deletes for individual activities.

## Supabase

Tables:

- `profiles`
- `user_preferences`
- `check_in_sessions`
- `voice_notes`
- `activity_entries`

An `auth.users` trigger creates profile and preference rows. Composite foreign keys prevent attaching notes or activities to another user's session.

RLS is enabled on every personal table. The private Storage bucket checks that the first path segment equals `auth.uid()`.

Edge Functions:

- `transcribe-note`: authenticated multipart audio transcription.
- `process-check-in`: authenticated strict activity extraction.
- `delete-account`: authenticated retained-audio and Auth user deletion.

All functions keep platform JWT verification enabled in `supabase/config.toml` and independently resolve the user from the Authorization header.

## Transcript and audio retention

- `retain_audio=false`: audio is transcribed directly and not uploaded to Storage.
- `retain_audio=true`: audio is stored at `<user-id>/<note-id>.m4a`.
- Full transcripts larger than 50 KB are processed but stored as `null`.
- Model-provided source segments are limited by the schema and database.

## Analytics

Analytics are computed on the client from hydrated activity rows. Period helpers produce current and previous equivalent ranges using local calendar dates. “Social” includes explicit partner, family, friend, and coworker contexts; `public` and `unknown` are not silently classified as social.

Effective focused time is calculated only for productive activities:

```text
durationMinutes × ((efficiencyPercent ?? 100) / 100)
```

## Verification

- Vitest covers domain calculations, validation, deduplication, extraction boundaries, and migration declarations.
- Jest Expo and React Native Testing Library cover text check-in and activity editing components.
- pgTAP exercises cross-user RLS against local Supabase.
- Maestro defines the authenticated native happy path.
