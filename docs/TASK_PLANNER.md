# Conversational task planner

The Plan tab accepts a natural voice or text update and automatically saves linked goals, projects, tasks, and recurrence. It does not require a title/category/minutes approval form after every turn.

The assistant may ask one short question when the answer materially changes organization. That question appears above the voice control, and the next turn retains the conversation context.

## Model

Tasks include:

- title and To Do / In Progress / Done status
- low, medium, or high priority
- planned hours, separate from actual time
- optional due date
- broad area and optional project/goals
- optional daily, weekly, or monthly recurrence
- explicit versus inferred provenance for priority, effort, and due date

Projects show active/overdue counts and completion progress. Shortcuts cover Inbox, Today, Tomorrow, Next 7 Days, and Completed.

Recurring definitions stay active. Completing one dated occurrence preserves prior history and generates future occurrences.

## Deterministic task type

- Missing or nonpositive planned hours: No Hours Set
- Medium/high and up to one hour: Low Hanging
- Medium/high and over one hour: Big Rock
- Low and up to one hour: Nice to Do
- Low and over one hour: Time Sink
- Unknown priority with valid hours: Unknown Priority

The one-hour boundary is inclusive. `src/lib/tasks.ts` computes the label whenever priority or planned hours change.

## Storage and sync

`src/services/taskStore.ts` stores one versioned plan per account/device scope. Legacy task arrays migrate to the current document, including Finance to Finances. Signed-in plans sync through the RLS-protected `life_plans` table. Anonymous plans remain anonymous and are not attached after sign-in.

Stable semantic IDs and merge-by-title/project make repeated reasoning responses idempotent.

## Optional Steam connection

Steam remains secondary. It accepts only validated HTTPS Steam Community profile URLs and never converts game totals into daily activity or task completion automatically.
