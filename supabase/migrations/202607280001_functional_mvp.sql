-- Completes account bootstrap, preferences, transcript limits, and private audio storage.
alter table public.user_preferences
  add column if not exists notifications_enabled boolean not null default false,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.voice_notes
  add constraint voice_notes_transcript_size
  check (transcript is null or octet_length(transcript) <= 50000) not valid;

create unique index if not exists check_in_sessions_id_user_idx
  on public.check_in_sessions(id, user_id);

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
grant execute on function public.delete_user_data() to authenticated;
