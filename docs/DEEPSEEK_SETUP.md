# DeepSeek setup for Life Analytics

GitHub Pages cannot hold a secret API key. The server function reason-check-in uses DeepSeek V4.1 Flash (deepseek-flash) with thinking enabled and high reasoning effort. No OpenAI key is needed for browser dictation.

## Account steps

1. Create a Supabase project at https://supabase.com/dashboard/projects. Keep its database password private.
2. Create a DeepSeek API key at https://platform.deepseek.com/api_keys. The API account needs available credits; choose any purchase yourself.
3. In your Supabase project, open Edge Functions → Secrets. Add DEEPSEEK_API_KEY with that key. Optionally set DEEPSEEK_MODEL=deepseek-flash. Do not put the DeepSeek key into GitHub Pages, EXPO_PUBLIC variables, browser storage, or chat.
4. Send the assistant your Supabase project URL and publishable (or legacy anon) key. These are public client configuration, not the secret/service-role key.

## Deployment connection

To let GitHub deploy the prepared function, create a Supabase personal access token at https://supabase.com/dashboard/account/tokens and put it directly into the repository's Actions secret SUPABASE_ACCESS_TOKEN:
https://github.com/sepsalimi/SoloLeveling/settings/secrets/actions

Add repository variables SUPABASE_PROJECT_REF, EXPO_PUBLIC_SUPABASE_URL, and EXPO_PUBLIC_SUPABASE_ANON_KEY (the public publishable/anon key). The assistant can set these public variables from the project URL and public key.

Run Deploy DeepSeek reasoning backend, then Publish phone preview. The backend workflow deploys only the authenticated reasoning function, not the database. It does not deploy or expose older example functions.

Create an app account from /SoloLeveling/auth/ and verify the confirmation email. Set the Supabase Auth site URL to https://sepsalimi.github.io/SoloLeveling/ first. For a private preview, invite your own account and disable public signups.

Successful processing saves dated activities to the existing on-device database immediately. Cloud sync additionally needs the SQL migrations in supabase/migrations applied to the new project; keep that separate from function deployment and preserve existing data if using an existing project.

## Behavior

Tap to start, tap to stop. Browser silence/session endings restart dictation without submitting the check-in. Only explicit Stop triggers automatic AI processing and saving. Permission loss, repeated network failures, leaving the screen, or backgrounding the app can interrupt recording; captured text stays available.

No manual title/minutes/category review is required. Missing durations are retained as untimed activities in the session payload and are excluded from time totals. The model response is validated; invalid or incomplete output is never saved as success.

Without backend configuration or sign-in, the transcript remains a local draft with a retry message. No rule-based substitute is presented as DeepSeek output.
