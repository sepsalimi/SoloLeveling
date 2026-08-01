-- Harden check-in completion against double-submit and speed session-scoped deletes.
create index if not exists activity_entries_user_session_idx
  on public.activity_entries (user_id, session_id);

create or replace function public.complete_check_in(
  target_session_id uuid,
  reviewed_entries jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  session_status text;
begin
  if jsonb_typeof(reviewed_entries) <> 'array' or jsonb_array_length(reviewed_entries) = 0 then
    raise exception 'At least one reviewed activity is required.';
  end if;

  select status into session_status
  from public.check_in_sessions
  where id = target_session_id and user_id = auth.uid()
  for update;

  if session_status is null then
    raise exception 'Check-in session was not found.';
  end if;

  if session_status = 'completed' then
    raise exception 'This check-in was already saved.';
  end if;

  if session_status not in ('draft', 'processing', 'review', 'failed') then
    raise exception 'Check-in session cannot be completed from status %.', session_status;
  end if;

  delete from public.activity_entries
  where session_id = target_session_id and user_id = auth.uid();

  insert into public.activity_entries (
    user_id,
    session_id,
    activity_date,
    title,
    description,
    start_time,
    end_time,
    duration_minutes,
    primary_category,
    social_context,
    purpose_tags,
    efficiency_percent,
    energy_level,
    mood,
    confidence,
    needs_review,
    source_transcript_segment
  )
  select
    auth.uid(),
    target_session_id,
    entry.activity_date,
    entry.title,
    entry.description,
    entry.start_time,
    entry.end_time,
    entry.duration_minutes,
    entry.primary_category,
    entry.social_context,
    entry.purpose_tags,
    entry.efficiency_percent,
    entry.energy_level,
    entry.mood,
    entry.confidence,
    false,
    entry.source_transcript_segment
  from jsonb_to_recordset(reviewed_entries) as entry(
    activity_date date,
    title text,
    description text,
    start_time time,
    end_time time,
    duration_minutes int,
    primary_category text,
    social_context text,
    purpose_tags text[],
    efficiency_percent int,
    energy_level int,
    mood int,
    confidence numeric,
    source_transcript_segment text
  );

  update public.check_in_sessions
  set status = 'completed', completed_at = now()
  where id = target_session_id and user_id = auth.uid();
end;
$$;
