# Life Analytics

Life Analytics is an Expo 57 app for conversational life planning, explicit voice check-ins, and honest actual-time analytics. It treats rest and leisure as valid life areas, never invents tracked time, and keeps planned effort separate from recorded activity.

## Product

- Plan: speak naturally about goals, projects, tasks, deadlines, and recurrence. Authenticated DeepSeek reasoning organizes and saves the result without a mandatory review queue.
- Check in: tap once to record and tap again to stop. Browser recognition restarts through pauses; only explicit Stop submits. Multi-day activity dates stay anchored to the original capture time and timezone.
- Analytics: view mutually exclusive area totals, daily trends, project-linked activity, untimed completions, and custom date ranges.
- Storage: anonymous records remain device-scoped. Signed-in plans and check-ins use account-scoped local storage plus Supabase RLS sync.

The shared areas are Life Admin, Finances, Leisure, Career, Health, Learning, Creative, and Relationships. Legacy Finance and activity categories migrate in memory and through the additive database migration.

## Local setup

```bash
pnpm install --frozen-lockfile
pnpm web
```

Without Supabase client variables, the app opens a device-only preview. Conversational reasoning and cross-device sync require:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Server-only secrets belong in Supabase or GitHub Actions, never in Expo public variables.

## Validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm export:web
node scripts/prepare-pages.mjs
npx expo-doctor@latest
```

## Supabase

Apply migrations only after reviewing the target project:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Deploy the authenticated reasoning functions with gateway JWT verification disabled because each function validates the bearer session against Supabase Auth:

```bash
supabase functions deploy reason-check-in --no-verify-jwt
supabase functions deploy reason-life --no-verify-jwt
```

Set `DEEPSEEK_API_KEY` in Supabase Edge Function secrets. `DEEPSEEK_MODEL` is optional and defaults to `deepseek-v4-flash`.

## Release source

`codex/phone-preview-20260928` is the coherent product source. `.github/workflows/pages.yml` verifies and publishes that branch under `/SoloLeveling/`. `.github/workflows/deploy-reasoning.yml` deploys both reasoning functions with the repository secret `SUPABASE` mapped to `SUPABASE_ACCESS_TOKEN`.

Database migrations remain a deliberate manual operation. Frontend or function deployment does not apply them.

## Current external validation limits

- The Pages build passes, but the `github-pages` environment currently rejects deployments from `codex/phone-preview-20260928`. Allow this branch in the environment deployment rules, then rerun the Pages workflow.
- A real signed-in DeepSeek response still needs an account with confirmed email and provider credit.
- Remote migration application and cross-device sync need project access.
- Native microphone capture and scheduled notifications need a physical iOS or Android device.
- Web background push is not implemented; web reminders are in-app while native builds use scheduled local notifications.
