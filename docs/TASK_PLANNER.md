# Task planner and optional Steam activity

The Tasks tab takes typed or dictated task lists, proposes categories and priorities, and opens an editable review before saving. It is inspired by the user's Notion task database, without importing personal task rows or modifying Notion.

## Classification

- Medium / high priority, up to and including 1 hour: Low Hanging.
- Medium / high priority, over 1 hour: Big Rock.
- Low priority, up to and including 1 hour: Nice to Do.
- Low priority, over 1 hour: Time Sink.
- Missing, zero, negative or non-finite hours: No Hours Set.
- Unknown priority with valid hours: Unknown Priority.

Life Admin, Leisure, and Finance are always available. Career, Health, Learning, Creative, and Relationships provide additional destinations. The current offline categorizer uses word matching, not an AI service. It defaults to Life Admin when uncertain and medium priority when priority is not stated. Users review and edit all suggestions. Missing durations are never invented.

Task lists support category filtering, text search, pending/completed views, status changes, editing, removal, and persistence in AsyncStorage. Export data includes tasks. The pie chart summarizes estimated hours of unfinished tasks, with missing estimates explicitly excluded.

## Voice

Web uses the browser SpeechRecognition implementation, when available; browsers can send audio to their speech service. A text field is always available. Native uses Expo audio recording plus the existing transcribe-note Supabase Edge Function. Dictation stops after five minutes; active capture is cancelled when leaving the screen or backgrounding the app. Native transcription requires a configured backend. There is no fake transcription or voice success in demo mode.

## Steam

Settings accepts an optional HTTPS Steam Community /id/name or /profiles/SteamID64 URL. It is saved locally with preferences and can be disconnected. Fetching recent games is explicitly requested by the user and requires a signed-in Supabase user.

Deploy the new function and configure the server-only secret using your normal Supabase workflow:

```bash
supabase secrets set STEAM_WEB_API_KEY=<your-key>
supabase functions deploy steam-activity
```

Never use an EXPO_PUBLIC variable for the Steam API key. The function validates the profile URL, resolves vanity IDs, calls GetRecentlyPlayedGames, and returns only display fields. No arbitrary URL is fetched. The Steam key stays server-side.

Public game details are required. No results is ambiguous: it can mean no recent play or private data. Steam reports a rolling two-week aggregate, not daily sessions. This data never automatically becomes activity time or task completion.

## Validation and preview

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm typecheck
pnpm lint
pnpm web
```

Open the Tasks tab for task capture and Settings for Steam. Real microphone permission flows and live Steam credentials require device/account testing. The GitHub Pages deployment is separate from local changes.
