# DeepSeek reasoning setup

GitHub Pages never receives the provider key. Both reasoning functions authenticate the Supabase user before calling DeepSeek.

## Secrets and model

Set these Supabase Edge Function secrets:

```bash
supabase secrets set DEEPSEEK_API_KEY=<provider-key>
supabase secrets set DEEPSEEK_MODEL=deepseek-v4-flash
supabase secrets set OPENAI_API_KEY=<provider-key>
```

`OPENAI_API_KEY` is required for voice. `transcribe-note` sends one finished recording to `gpt-transcribe`. `OPENAI_TRANSCRIPTION_MODEL` can override that model name.

`DEEPSEEK_MODEL` is optional. The September 2026 official API documents `deepseek-v4-flash` and `deepseek-v4-pro`; legacy `deepseek-chat` and `deepseek-reasoner` names are retired. The functions use Chat Completions with:

- `thinking: { "type": "enabled" }`
- `reasoning_effort: "high"`
- JSON object response format

Reasoning traces are discarded server-side.

## Client configuration

Set GitHub repository variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_PROJECT_REF`

Set the repository Actions secret `SUPABASE` to a Supabase personal access token. The backend workflow maps it to `SUPABASE_ACCESS_TOKEN`.

Configure the Supabase Auth site URL and allowed redirect URLs for:

```text
https://sepsalimi.github.io/SoloLeveling/
https://sepsalimi.github.io/SoloLeveling/reset-password
```

The current Supabase token cannot change Auth settings. In the Supabase dashboard, open Authentication, then Email, and turn off Confirm email. That lets the existing account sign in. Google stays on the sign-in page until Authentication, then Google, has a client ID and secret.

## Deployment

Run the `Deploy DeepSeek reasoning backend` workflow. It deploys:

- `reason-life`: conversational goals/projects/tasks
- `reason-check-in`: dated actual activities and task progress
- `transcribe-note`: one-shot speech transcription for Plan and Check-in

Each function uses `--no-verify-jwt` at the gateway because it validates the user against `/auth/v1/user`.

The workflow does not apply SQL. Review and apply migrations separately.

## Required live checks

1. Sign in with a confirmed account.
2. Submit the onboarding scenario and verify linked goals, projects, tasks, provenance, and null optional dates.
3. Submit a multi-day check-in and verify Sep 28/29/30 records from a Sep 30 local anchor.
4. Retry the same session and confirm no duplicate records.
5. Sign in as a second account and verify no first-account plan or check-in is visible.

Provider credit, email redirect configuration, remote migration state, and physical microphone behavior cannot be inferred from a successful function deployment.
