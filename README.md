# Life Analytics MVP

A polished Expo React Native MVP for personal life analytics. The app helps users turn short text or voice check-ins into editable activity entries and calm analytics without passive monitoring.

## What is included

- Expo Router mobile app with light/dark mode aware UI.
- Email/password auth screen with Supabase support and demo mode fallback.
- Onboarding for reminder times, reminder days, efficiency tracking, mood/energy tracking, and raw audio retention.
- Today screen with tracked time, untracked time, category breakdown, check-ins, and recent activities.
- Text check-in extraction flow with deterministic mock mode.
- Voice recording UI with microphone permission handling and five-minute timer guard.
- Review flow with approve all, edit title/duration, delete, add, merge, split, retry, and save.
- Analytics views for today, week, month, and year to date with donut, bar, and line charts.
- History screen with search and category/social/purpose filtering.
- Settings for reminders, notifications, tracking preferences, export, logout, privacy explanation, and delete-account guidance.
- Supabase migration with tables, constraints, indexes, and Row Level Security.
- Supabase Edge Function for secure OpenAI structured extraction.
- Seed data, tests, architecture note, and roadmap.

## Current package baseline

This project targets Expo SDK 57. Expo's current SDK table lists SDK 57 with React Native 0.86 and React 19.2.3, and the Expo Router SDK 57 page recommends `~57.0.4`. Supabase JS and `react-native-chart-kit` versions are pinned to current stable npm releases as of July 20, 2026.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Start the app:

```bash
pnpm start
```

4. Run on a device or simulator from the Expo CLI.

Demo mode is enabled by default with `EXPO_PUBLIC_DEMO_MODE=true`, so the vertical slice works without Supabase or OpenAI keys.

## Supabase setup

1. Create a Supabase project.
2. Link the local project:

```bash
supabase link --project-ref <project-ref>
```

3. Apply migrations and seed data:

```bash
supabase db push
supabase db seed
```

4. Deploy the Edge Function:

```bash
supabase functions deploy transcribe-note
supabase functions deploy process-check-in
```

5. Set server-side secrets:

```bash
supabase secrets set OPENAI_API_KEY=<key>
supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
supabase secrets set OPENAI_EXTRACTION_MODEL=gpt-4.1-mini
```

## Required environment variables

Mobile app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DEMO_MODE`

Supabase Edge Function secrets:

- `OPENAI_API_KEY`
- `OPENAI_TRANSCRIPTION_MODEL`
- `OPENAI_EXTRACTION_MODEL`

Never put `OPENAI_API_KEY` in the Expo app environment.

## Testing

```bash
pnpm test
pnpm typecheck
pnpm lint
```

The test suite covers duration normalization, analytics calculations, duplicate detection, structured extraction validation, RLS migration checks, recording/review flow smoke tests, and a text-check-in happy path.

## Production notes

- Production voice transcription should upload audio to Supabase Storage or send a short foreground recording to `transcribe-note`, then call `process-check-in`, then delete raw audio unless the user opted into retention.
- Do not log transcripts, audio URLs, API keys, or personal activity content.
- The mobile app requests microphone permission only when the user starts recording.
- Location, contacts, photos, messages, and calendar permissions are intentionally unused.

## Known limitations

- Voice upload/transcription is scaffolded at the UI and Edge Function boundary; demo mode uses text extraction.
- Review editing currently supports title and duration inline. Category, social context, purpose, efficiency, mood, and energy are represented in data and cards but need richer pickers.
- Previous-period comparison insight cards are placeholders until more persisted history exists.
- Delete account requires a production admin endpoint to remove the auth user after `delete_user_data` clears profile data.