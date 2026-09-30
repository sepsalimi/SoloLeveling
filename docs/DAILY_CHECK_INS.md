# Morning and evening check-ins

Morning plans are opt-in through Settings > Your daily rhythm or onboarding. They suggest up to three unfinished tasks, ordered by priority, in-progress status, then estimated effort. Suggestions never become actual activity records.

The evening flow supports a one-tap voice start, editable transcript, colourful topic tiles, and a quiet review after dictation. Interim browser recognition results drive live tile dimming; only finalized text is reviewed and saved. A faded tile means mentioned, not task completion. Negative and future statements are ignored by the rule-based matcher. Tile labels and matching phrases are editable in Settings. Ambiguous shared durations stay blank.

Records include date, actual duration in minutes, title, category, and source transcript. Users confirm missing durations before saving. Dates use the device's local day. Saving updates analytics and History without mixing in planned hours.

## Storage

- Web: IndexedDB database life-analytics-check-ins, with sessions and normalized activities stores.
- Native: SQLite database life-analytics.db, with daily_check_ins and daily_activity_entries tables.
- Saves are transactional and use stable IDs so retrying a save does not double count.
- Signed-in records are scoped by account. Unsigned device records are kept separately and are not automatically uploaded when another person signs in.
- Supabase sync needs migration 202609270001_daily_check_ins.sql. It defines account-owned tables, RLS, and the transactional save_daily_check_in RPC.
- Cloud failures preserve the local database save; Settings provides Retry cloud sync.
- Export includes daily check-in sessions and their activity records.

Apply the migration using the project's normal Supabase deployment process. It has not been applied to a live database by this change.

## Voice and reminders

Web live cues require browser SpeechRecognition support. Unsupported browsers have a text fallback. Native audio is transcribed after finishing through the existing transcribe-note function, so native tiles update after transcription, not live. Temporary native audio is deleted after transcription or cancellation. Recognition is currently English, and categorization is rule-based.

The app plays no chimes, spoken prompts, or haptics during recording. Foreground reminder banners are suppressed. Native scheduled reminders use silent notification content and an Android channel with no sound/vibration. Web reminders are in-app prompts while Today is open; the static site does not deliver background push notifications. Device reminder and microphone permission behavior still needs physical-device testing.

## Verification

Type checking, unit tests, lint, and the Expo web export validate the implementation. Browser checks cover simulated interim/final speech, work versus workout matching, missing-duration review, IndexedDB persistence, reload, analytics totals, morning opt-in, and narrow-screen layout. Real microphone recognition and deployed Supabase synchronization require separate device/account validation.

## Phone capture update (2026-09-29)

Evening check-in now uses a fixed-height screen. Tap the large microphone to start dictation; tap again to finish. Activity chips appear during capture and dim for recognized topics. Interim-only browser results are preserved for review. Send my check-in opens one activity at a time, then Save my day writes the existing dated session to storage. Keyboard users can activate the microphone with Space or Enter. Prefer to type remains available for denied permissions or unsupported browsers.

Browser verification covers 390x844, 375x667, and 360x640 viewports with simulated speech, live cue matching, tap start/stop, interim retention, and saving. Real microphone recognition remains dependent on the phone browser and its permission/service availability.

## Automatic processing update

The evening title/minutes/category review form has been removed. Explicit Stop now submits to reason-check-in and saves validated model output automatically. Browser silence/session ends restart capture; permission or persistent network failures show an interruption. There is no five-minute recording cutoff. Missing durations remain untimed and do not inflate analytics. Setup: see DEEPSEEK_SETUP.md. No live DeepSeek calls are possible until the backend credentials are configured.
