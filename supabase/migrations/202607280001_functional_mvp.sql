-- Completes account bootstrap, preferences, transcript limits, and private audio storage.
alter table public.user_preferences
  add column if not exists notifications_enabled boolean not null default false,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.voice_notes
  add constraint voice_notes_transcript_size
  check (transcript is null or octet_length(transcript) <= 50000) not valid;

alter table public.activity_entries
  add constraint activity_entries_source_segment_size
  check (source_transcript_segment is null or octet_length(source_transcript_segment) <= 5000) not valid;

create unique index if not exists check_in_sessions_id_user_idx
  on public.check_in_sessions(id, user_id);

alter table public.voice_notes
  add constraint voice_notes_session_user_fk
  foreign key (session_id, user_id)
  references public.check_in_sessions(id, user_id)
  on delete cascade
  not valid;

alter table public.activity_entries
  add constraint activity_entries_session_user_fk
  foreign key (session_id, user_id)
  references public.check_in_sessions(id, user_id)
  not valid;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, timezone)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'timezone', ''), 'UTC')
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, timezone)
select id, 'UTC'
from auth.users
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select id
from auth.users
on conflict (user_id) do nothing;

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.user_preferences to authenticated;
grant select, insert, update, delete on table public.check_in_sessions to authenticated;
grant select, insert, update, delete on table public.voice_notes to authenticated;
grant select, insert, update, delete on table public.activity_entries to authenticated;

insert into storage.buckets (id, name, public)
values ('voice-notes', 'voice-notes', false)
on conflict (id) do update set public = false;

drop policy if exists "voice_notes_storage_select_own" on storage.objects;
create policy "voice_notes_storage_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "voice_notes_storage_insert_own" on storage.objects;
create policy "voice_notes_storage_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "voice_notes_storage_delete_own" on storage.objects;
create policy "voice_notes_storage_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'voice-notes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

revoke all on function public.delete_user_data() from public;
revoke all on function public.delete_user_data() from authenticated;

create or replace function public.complete_check_in(
  target_session_id uuid,
  reviewed_entries jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if jsonb_typeof(reviewed_entries) <> 'array' or jsonb_array_length(reviewed_entries) = 0 then
    raise exception 'At least one reviewed activity is required.';
  end if;

  if not exists (
    select 1
    from public.check_in_sessions
    where id = target_session_id and user_id = auth.uid()
  ) then
    raise exception 'Check-in session was not found.';
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

revoke all on function public.complete_check_in(uuid, jsonb) from public;
grant execute on function public.complete_check_in(uuid, jsonb) to authenticated;
