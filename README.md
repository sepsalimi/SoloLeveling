# Life Analytics

Life Analytics is a private, nonjudgmental mobile app for turning short voice or text check-ins into editable activity timelines and useful time analytics.

The native iOS and Android applications are the primary product. The Expo web build is supported as a secondary authenticated client.

## Implemented MVP

- Supabase email/password registration, login, recovery, session restoration, logout, and account deletion.
- Account-scoped Postgres persistence protected by Row Level Security.
- Onboarding and settings for reminder schedules, optional metrics, and audio retention.
- Foreground-only recording with pause, resume, cancel, a five-minute limit, and local retry after processing failures.
- Authenticated OpenAI transcription and strict structured activity extraction through Supabase Edge Functions.
- Multi-note check-in drafts with duplicate filtering and bounded transcript retention.
- Complete activity review for title, description, date, time, duration, category, social context, purpose, efficiency, mood, and energy.
- Selected merge and split actions, manual activity creation, history editing, and deletion.
- Today, week, month, and year-to-date analytics with category, stacked distribution, trend, social, purpose, efficiency, focused-time, and previous-period metrics.
- Local weekday reminders, JSON/CSV export, light/dark themes, and accessible controls.

There is no demo mode and no shared sample account. A configured Supabase project is required.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the client, database, Edge Function, and privacy boundaries.

The production data flow is:

1. The user types a note or records audio in the foreground.
2. Audio is sent to the authenticated `transcribe-note` Edge Function.
3. The transcript is sent to `process-check-in` using OpenAI Structured Outputs.
4. The client validates and deduplicates the result.
5. The user reviews the activities and saves them through one transactional Postgres function.
6. Analytics reload from user-scoped Supabase tables.

Raw audio is sent directly for transcription when retention is disabled. When retention is enabled, it is stored in a private user-scoped Storage path. Transcripts are stored only when they are no larger than 50 KB.

## Prerequisites

- Node.js 24
- pnpm 11.7
- Expo-compatible iOS or Android development environment
- Supabase CLI and Docker for local backend tests
- A Supabase project and OpenAI API key for hosted testing

## App setup

```bash
pnpm install
cp .env.example .env
```

Set the public Supabase client values in `.env`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

Start Expo:

```bash
pnpm start
```

The project includes `eas.json` and native identifiers for preview and production builds:

```bash
npx eas-cli build --profile preview --platform android
npx eas-cli build --profile preview --platform ios
```

## Supabase setup

For a local backend:

```bash
supabase start
supabase db reset
```

For a hosted project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Set Edge Function secrets:

```bash
supabase secrets set OPENAI_API_KEY=<key>
supabase secrets set OPENAI_TRANSCRIPTION_MODEL=gpt-4o-mini-transcribe
supabase secrets set OPENAI_EXTRACTION_MODEL=gpt-4.1-mini
```

Deploy every required function:

```bash
supabase functions deploy transcribe-note
supabase functions deploy process-check-in
supabase functions deploy delete-account
```

`supabase/config.toml` keeps JWT verification enabled for all three functions. Never add `OPENAI_API_KEY` to an Expo public environment variable.

## Testing

```bash
pnpm typecheck
pnpm lint
pnpm test
npx expo-doctor
pnpm export:web
```

`pnpm test` runs Vitest domain/service tests and Jest Expo component tests.

Run database policy tests against local Supabase:

```bash
supabase test db
```

Run the native happy path against a configured development backend:

```bash
TEST_EMAIL=<email> TEST_PASSWORD=<password> maestro test e2e/check-in-happy-path.yaml
```

## Web deployment

The GitHub Pages workflow builds the authenticated web client at `/SoloLeveling`. Configure these repository secrets before deployment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Voice recording is primarily verified for native builds. Browser microphone behavior still depends on HTTPS and browser MediaRecorder support.

## Privacy behavior

- Recording begins only after the user presses Record.
- Background recording is disabled.
- The app requests no location, contacts, photos, messages, or calendar permissions.
- OpenAI credentials exist only in Supabase Edge Function secrets.
- Raw audio is not retained by default.
- Stored audio is private and scoped by the authenticated user ID.
- Transcript and source-segment sizes are constrained.
- Account deletion removes retained audio and the Supabase Auth user; foreign-key cascades remove app data.
- Pending drafts are removed when the account changes or is deleted.

## Known limitations

- A live Supabase/OpenAI end-to-end run requires project credentials that are not stored in this repository.
- Local pgTAP RLS tests require Docker and the Supabase CLI.
- Pending review drafts are stored in the application sandbox so interrupted work can be recovered.
- Account deletion spans Supabase Storage and Auth APIs, so a failed request must be retried.
- Native store signing, screenshots, privacy labels, and release review remain deployment tasks.

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md). Health platforms, wearables, location, calendars, social features, subscriptions, passive monitoring, and a single “life score” remain out of scope.
