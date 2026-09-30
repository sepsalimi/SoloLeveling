# Cursor handoff: SoloLeveling / Life Analytics

Prepared September 30, 2026 from the current code, deployment history, and the owner's product instructions. Private workspace links and connector-derived details are omitted from this public handoff. This is a ready-to-use implementation prompt. Treat the product requirements below as the owner's direction; verify the technical snapshot before changing code.

## Your assignment

Take over this repository as a product-minded senior engineer and designer. Thoroughly audit the implementation, then build a polished, reliable, modern app around three functions:

1. Speak about my life, goals, projects, and tasks; the app organizes them for me.
2. Give me a useful morning plan and let me report what I did through conversational voice check-ins.
3. Show accurate analytics of where my time actually went.

Implement the working product, not just mockups or a plan. Work in coherent, testable stages. Preserve existing data and working behavior. Use your judgment for routine decisions; ask only short questions when a real ambiguity or external setup blocks progress. Do not require me to approve every extracted activity or fill in forms after speaking.

The experience should feel like a capable, supportive manager who knows my goals: direct about next actions, realistic about capacity, and never nagging or judgmental. Leisure and rest are legitimate parts of life.

## Start from the correct Git history

Repository: https://github.com/sepsalimi/SoloLeveling
Live app: https://sepsalimi.github.io/SoloLeveling/check-in/

The current deployed app source is on branch codex/phone-preview-20260928, at commit 4534ca9da1ac121f6f9fc0c2a39899722a9fa70a before this handoff. It is pushed but NOT merged into main.

Main contains a different, newer application history that was deliberately preserved. Its deployment workflows were updated separately. Do not overwrite main, force-push, reset local changes, or assume its app is identical to the live preview. Fetch both branches, inspect their differences, and reconcile useful work deliberately. Prefer an implementation branch based on the deployed preview until the histories are understood.

At handoff, local modifications in .github/workflows/pages.yml, .gitignore, README.md, and app.json are line-ending differences; .codex-remote-attachments contains user uploads. Preserve them and do not publish private attachments or personal Notion content as sample data.

The remote main workflow phone-preview.yml checks out a PINNED preview commit. Pushing new app code alone does not update the live site. Remote main deploy-reasoning.yml checks out the preview branch. Its GitHub secret reference was changed to secrets.SUPABASE; the older copy on the preview branch still references secrets.SUPABASE_ACCESS_TOKEN. Reconcile this discrepancy.

Latest verified successful deployment runs:
- Frontend: https://github.com/sepsalimi/SoloLeveling/actions/runs/36738690224
- Reasoning backend: https://github.com/sepsalimi/SoloLeveling/actions/runs/36744000481

Do not let a main-branch Pages workflow accidentally replace the intended preview with different app code. Explain the final release path and keep one coherent deployment source.

## Product 1: conversational life setup and task planning

I should be able to say:
"I work a nine-to-five. I do photography on the side, want to grow that business, study machine learning, find a better job, earn more, and lose weight. I also need to do my taxes and take out the trash every Tuesday."

Distinguish:
- Life areas: a small stable set of broad categories.
- Goals: outcomes such as changing career or losing weight.
- Projects: ongoing efforts such as photography or a job search.
- Tasks: concrete actions.
- Recurring task definitions and dated occurrences.

Do not turn every aspiration into a completed activity or every sentence into a task. Retain relevant context and connect tasks to goals/projects where justified.

Use a short onboarding example, not an instruction manual:
"Tell me what you are working toward and what needs doing. Mention urgency, roughly how long something takes, or a deadline if you know. It's okay to leave details out."

A reasoning LLM should extract and organize the information. Infer sensible task priority, category, and PLANNED effort when omitted; keep internal provenance for explicit versus inferred values. Do not fabricate hard deadlines. Due date can be null. A goal without enough detail can remain a goal until clarified. Prefer one or two short conversational questions only when they materially improve the result. The user responds by voice again.

Show the assistant's short question above the microphone. Support optional spoken questions after the user stops; stop playback before recording and never interrupt active dictation. A transcript/text fallback remains available.

Save the result automatically. Allow later edits, undo, and corrections naturally, including by voice. Do not make a mandatory title/minutes/category approval screen part of normal capture.

Use a limited shared taxonomy, initially something like Life Admin, Finances, Leisure, Career, Health, Learning, Creative, and Relationships. Projects and optional subcategories provide detail without proliferating top-level categories. Use the user's context: photography may be a business or hobby. Career work and career advancement study should remain distinguishable in analytics even if related to the same goal. Preserve Finance/Finances aliases during migration.

## Notion-inspired task organization: product requirements

Build linked Tasks and Projects tables with an intuitive mobile presentation. Tasks need a title, status, low/medium/high priority, estimated hours, optional due date, project/area association, and optional recurrence. Support recurring schedules and individual dated occurrences. Completing one occurrence must preserve future occurrences and past history.

Provide useful views for pending tasks by date and task type, a calendar, and completed tasks. Include shortcuts for Inbox, Today, Tomorrow, and Next 7 Days. Project cards should show a friendly visual identity, status, active/overdue counts, and a clear progress indicator.

Use broad life areas such as Life Admin, Finances, Leisure, and Career, with user-defined projects beneath them. Recreate this useful structure with a cleaner mobile experience. Do not hardcode personal projects, copy private task records, or import a Notion workspace. This public specification intentionally excludes private workspace URLs and connector-derived schema details.

### Required deterministic task classification

The owner supplied this formula logic, also implemented in src/lib/tasks.ts:
- Missing/nonpositive estimated hours: ⚠️ No Hours Set.
- High OR medium priority, estimated hours <= 1: 🍒 Low Hanging.
- High OR medium priority, estimated hours > 1: 🪨 Big Rock.
- Low priority, estimated hours <= 1: ☕️ Nice to Do.
- Low priority, estimated hours > 1: 🐌 Time Sink.
- Invalid/unknown priority with valid hours: ⚠️ Unknown Priority.

Compute this from priority and planned hours; do not ask the LLM to choose a bucket independently. Recompute when either field changes. Preserve the one-hour boundary. "Time Sink" is an effort/priority label, not a moral judgment about leisure. The formula source is the owner's provided expression.

## Product 2: morning plans and voice check-ins

### Morning
Provide opt-in phone notifications at a preferred local time and on selected days. Present a small, feasible plan with concrete tasks and estimated effort. Consider deadlines, recurrence, priority, in-progress work, goals, and available capacity. Do not fill every hour or only select easy tasks.

Be direct: "Today: submit the application, study for 45 minutes, and pay the bill." Offer occasional useful coaching tied to stated goals, such as a next learning step for a machine-learning job search. Keep suggestions optional and limited. Never silently invent a commitment, deadline, or completed work.

Actual background notifications must work on the supported delivery platform. Installing a PWA alone does not implement push. Choose and implement the appropriate web push/backend scheduling or native notification approach; clearly state platform limitations. Notification content and plan state must remain consistent after edits, timezone changes, permission changes, and missed days.

### Evening / anytime check-in
The primary screen is one large microphone button:
- Tap to start; tap again to stop.
- Keep listening through pauses and browser recognition session endings.
- Do not auto-submit because of silence or an arbitrary recording timer.
- Only explicit Stop submits the user's turn.
- If the OS, permission, connection, or browser interrupts capture, preserve the transcript and explain what happened. Never pretend recording continues.
- Save drafts through reloads and provide retry without double-saving.
- No beeps, chimes, notification sounds, or assistant speech during recording.

The user speaks naturally. The reasoning model decides what was done, its category/project/task link, date, and stated duration. Parse corrections: "twenty hours, sorry, two hours studying" means 120 minutes, not 1,320 minutes or two activities.

Support several historical dates in a single utterance:
"Two days ago I studied for two hours. Yesterday I edited photos for an hour. Today I took out the trash."
Store each activity on the day it happened, not the day it was reported. Anchor relative dates to the user's timezone and capture timestamp, retaining that anchor through retries. Keep recordedAt separate from occurredOn. Handle midnight boundaries and explicit time ranges. Ask a short clarification only when genuinely ambiguous.

PLANNED effort and ACTUAL logged time are different:
- The model may estimate future task effort.
- It must not invent actual duration just to populate analytics.
- "Took out the trash" can mark that task occurrence complete and record an untimed event.
- Untimed events must remain visible and editable, without counting as zero-duration failures or fabricated tracked minutes.
- A worked-on task is not necessarily complete. Match completion statements and partial progress correctly.
- Missed days and unmentioned categories are unknown, not failures.

### Live visual cues
Preserve and improve the existing colorful cue concept. During capture, reveal a compact set of relevant area/task tiles: Work, Workout, P.Eng study, Photography, Take out trash, etc.

Unaddressed tiles are vibrant. When the user reports a matching activity, the tile fades/desaturates with a quiet transition, remaining readable. This frees attention for things still to mention. Add a small text/icon state so color is not the only signal.

Separate "mentioned in this conversation" from "task completed." A negative report can count as addressed but must never imply completion or logged productive time. Distinguish completed, skipped, planned, and partial activity. Corrections can restore or update a tile. Do not confuse "work" with "workout."

Live matching can use fast local/provisional processing, but durable records must come from validated reasoning output. Do not send a costly model call for every interim word. Handle many cues with relevance, progressive disclosure, or a compact carousel, rather than making the recording screen scroll vertically.

## Product 3: life analytics

Make it easy to see where actual time goes by day, week, month, and custom range:
- Career/day job.
- Career advancement/learning.
- Side business and hobby projects.
- Finances and Life Admin.
- Leisure, optionally distinguishing gaming/YouTube when supplied.
- Health/exercise, relationships, rest, and other meaningful areas.

Use an attractive pie/donut for a mutually exclusive category breakdown, daily trends, and useful project/task drill-down. Show durations and understandable percentages. Support finer detail only when provided; never fabricate it.

Separate planned workload from recorded actual time. Show untimed completions separately. Unknown/untracked time must be labeled honestly. Do not label every missing hour "wasted." Avoid double-counting repeated mentions, retries, overlapping intervals, multiple category tags, or recurring occurrences. Apply time plausibility checks per actual date, not once to an entire multi-day submission.

The existing task pie is planned hours, not actual life analytics. If a category has overlapping purpose tags, do not present their sum as a partition of a day. An automatic confidence value of 1 or assumed 100% efficiency is not evidence of certainty or productivity.

## Design direction

Make the app fun, extremely intuitive, modern, and bubbly. Voice should be the primary interaction for almost everything: setup, planning, check-ins, clarification, and corrections. Minimize typing, forms, and navigation; retain accessible text and touch alternatives. Use rounded, friendly shapes, expressive colorful tiles, delightful quiet motion, and clear feedback so the experience feels approachable and effortless. Modern, sleek, calm, playful, and immediately understandable. Use the current dark aesthetic as a starting point: charcoal surfaces, generous spacing, strong typography, vibrant yellow/coral/mint/lilac/blue tiles, and a dominant microphone. Use coherent tokens and restrained animation, not gradients and decorations everywhere.

The recording experience fits one phone viewport with no vertical scrolling in ordinary supported sizes. Respect safe areas, browser chrome, keyboards, reduced motion, readable contrast, and large text; accessibility must not be sacrificed to force a layout. Long task tables/history/analytics may scroll. Keep navigation simple around Plan, Check-in, Analytics with secondary settings/history.

The user should speak and see the app understand. Avoid dense forms, duplicate actions, jargon, and mandatory review queues. Provide subtle saved feedback, easy undo, and an optional details view.

## Current implementation and known gaps

Stack: Expo 57, React Native 0.86, React 19, TypeScript, Expo Router, Supabase, pnpm 11.7, Vitest. Verify installed versions and compatibility before upgrading. Avoid an unnecessary framework rewrite.

Inspect these entry points:
- app/(tabs)/tasks.tsx, src/lib/tasks.ts, src/types/task.ts, src/services/taskStore.ts.
- app/(tabs)/check-in.tsx, src/components/TaskVoice.tsx, src/lib/continuousSpeech.ts.
- src/lib/checkIn.ts, src/components/ActivityCueTile.tsx.
- src/services/reasoning.ts, src/lib/automaticCheckIn.ts.
- supabase/functions/reason-check-in/index.ts.
- src/services/checkInDraft.ts, dailyCheckIns.ts, checkInDb.ts, checkInDb.web.ts.
- src/context/AppState.tsx, src/services/localStore.ts.
- src/lib/analytics.ts, app/(tabs)/analytics.tsx, history.tsx.
- src/services/reminders.ts, src/components/MorningPlan.tsx, DailySettings.tsx.
- public/manifest.json, install.js, sw.js, src/components/InstallApp.tsx.
- scripts/prepare-pages.mjs, Supabase migrations, and both branches' GitHub workflows.

Verified gaps:
- Task capture uses regex/keyword drafting and local AsyncStorage; it is not conversational reasoning.
- LifeTask lacks due dates, recurrence, goals, project relations, and explicit user ownership.
- Task and activity category enums differ substantially. Unify them without losing old data.
- Current reasoning output only has title, minutes, category, source. automaticSession assigns one supplied date to every item; it cannot represent multi-day reporting correctly.
- There is no implemented multi-turn clarification contract in that endpoint.
- Live cues use aliases/rules and do not receive contextual task/goal knowledge.
- Morning planning currently sorts tasks and selects three; it is not a contextual coach.
- Web reminders are in-app only. Native notification text is generic.
- Web dictation uses browser SpeechRecognition. Native capture uses a separate transcription function; verify that entire path before claiming native support.
- Several docs describe older OpenAI/manual-review flows. Code and this product brief take precedence; update stale docs.
- State combines legacy AsyncStorage and newer daily databases. Audit account isolation, editing/deleting daily records, export completeness, and cross-device reconciliation.
- taskStore currently uses one unscoped storage key. Fix account isolation.
- analytics.ts calculates untracked time against one 24-hour day even when supplied longer-period entries; audit aggregation semantics.
- Untimed activities live separately in session JSON; ensure dates, task links, history, export, and analytics preserve them.

Already present: tap-to-toggle capture with recognition restarts, local transcript drafts, automatic evening extraction/save, colorful cue chips, local dated check-in databases, cloud-sync code, task formula, installation UI/PWA assets, and optional Steam URL UI. Preserve useful behavior. Steam is secondary, optional, and must not block the three core functions.

## Backend and operational state

Supabase project ref: llfaamdiscrmurexamem
Public URL: https://llfaamdiscrmurexamem.supabase.co

GitHub public variables are configured:
EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (holds the publishable key), SUPABASE_PROJECT_REF.
The GitHub deployment secret is named SUPABASE and is mapped by the remote main workflow to environment variable SUPABASE_ACCESS_TOKEN.
The owner reports adding DEEPSEEK_API_KEY to Supabase Edge Function secrets.

reason-check-in was deployed successfully and responds with 401 to unsigned requests. It validates the session against Supabase Auth itself, so gateway verify_jwt=false is intentional. Preserve real user authentication and RLS. Do not expose a public paid inference endpoint.

The current code defaults to model deepseek-flash, thinking enabled, reasoning_effort high. This is an implementation snapshot, not a guarantee that it is still the latest valid model identifier. Verify the current DeepSeek reasoning model and request schema with official docs and a real authenticated call; make selection server-configurable. Never expose private keys or chain-of-thought to clients.

A signed-in end-to-end DeepSeek request has NOT yet been verified. Credit availability, Auth email redirect configuration, and real microphone behavior still require validation. Do not equate deployment success with a working product.

Database migrations exist at supabase/migrations/202607200001_initial_schema.sql and 202609270001_daily_check_ins.sql. Their application to this project has NOT been verified. Inspect remote schema before applying anything. Function deployment does not apply migrations. Local saving can succeed while cloud sync remains pending.

Build a coherent persisted model for areas, goals/projects, tasks, recurrence occurrences, conversations, activity events, and preferences. Use server-side validation, stable identities, idempotent writes, tenant isolation, safe migrations, bounded AI usage, retry/backoff, and useful errors. Preserve offline drafts and local records; never silently lose or duplicate them. Validate dates and ownership after model output rather than trusting model-generated identifiers.

## Implementation and acceptance

Start with a short audit of the actual branch, runtime, flows, schema, and deployment. Then implement, validate, and document each stage; do not stop after the audit. Prioritize data correctness and complete voice flows alongside design polish.

Use the repository's commands: pnpm install --frozen-lockfile, pnpm typecheck, pnpm test, pnpm export:web, and node scripts/prepare-pages.mjs. The previous implementation reported 55 passing tests, but rerun and add meaningful tests for the new behavior. Inspect lint configuration before treating lint failures as introduced regressions.

Acceptance scenarios:
1. A new user describes work, photography, a career change, fitness, taxes, and a weekly chore. Appropriate goals/projects/tasks appear with sensible inferred metadata; optional dates remain optional; at most one or two useful clarification questions, no required review form.
2. All six formula states and the exactly-one-hour boundary behave correctly after edits.
3. Completing Tuesday's recurring trash occurrence preserves next week's task and previous history.
4. Tap starts capture; pauses/session restarts do not submit; tap stops and processes once. Permission/network/background interruption preserves a recoverable draft.
5. "I worked five hours and worked out for 30 minutes" addresses the correct separate cues and records the correct durations.
6. "I didn't work out; I'll do it tomorrow" never logs a completed workout.
7. With a Sep 30 local capture date, "Two days ago I studied two hours; yesterday I edited photos one hour; today I took out the trash" creates Sep 28/29/30 events respectively, including an untimed trash event. Retry preserves those dates.
8. "Twenty hours, sorry, two hours" logs 120 minutes once. Repeated submissions/corrections do not duplicate records.
9. A failure preserves the transcript. Reload, retry, and another-device sync produce the same durable result.
10. Actual charts reconcile exactly to saved dated events. Planned hours and untimed events do not inflate tracked time.
11. Two accounts cannot access each other's local or remote records. Anonymous drafts are not silently attached to the next signed-in user.
12. Enabled notifications deliver on a supported physical phone; disabled notifications do not. Clearly distinguish tested native/PWA behavior.
13. The recording screen fits representative small phones, with accessible controls and no sounds interrupting speech. Verify install/standalone, auth, routing under /SoloLeveling/, and browser refresh.

Use both deterministic tests and browser/device checks. Mocked recognition/model tests are useful but do not replace at least one real authenticated inference test and honest reporting of untested hardware behavior. Finish with a concise summary of implemented behavior, validation, deployment status, remaining limitations, and how to run the app.

## Temporary handoff: remove when finished

This file is a temporary bridge to the cloud Cursor agent. Once you have completed the takeover and implementation, preserve any still-relevant product decisions, setup instructions, and unresolved work in the normal project documentation. Then delete docs/CURSOR_HANDOFF.md in a cleanup commit and remove stale references to it. Do not delete it before its requirements and remaining work have been incorporated. Do not retain personal Notion links or examples as public demo data.
