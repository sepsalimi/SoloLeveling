-- Check-ins and normalized actual-time records; plans remain separate.
create table public.daily_check_ins (
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null,
  session_date date not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, client_id)
);
create table public.daily_activity_entries (
  user_id uuid not null,
  client_id text not null,
  session_client_id text not null,
  activity_date date not null,
  title text not null check(length(trim(title)) > 0),
  duration_minutes integer not null check(duration_minutes between 1 and 1440),
  primary_category text not null check(primary_category in ('work','learning','health','exercise','food','chores','social','entertainment','rest','travel','personal_care','other')),
  payload jsonb not null,
  primary key(user_id, client_id),
  foreign key(user_id, session_client_id) references public.daily_check_ins(user_id, client_id) on delete cascade
);
create index daily_activity_user_date on public.daily_activity_entries(user_id, activity_date);
alter table public.daily_check_ins enable row level security;
alter table public.daily_activity_entries enable row level security;
create policy daily_sessions_own on public.daily_check_ins for all to authenticated using(auth.uid() = user_id) with check(auth.uid() = user_id);
create policy daily_entries_own on public.daily_activity_entries for all to authenticated using(auth.uid() = user_id) with check(auth.uid() = user_id);

create or replace function public.save_daily_check_in(payload jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  owner_id uuid := auth.uid();
  session_id text := payload->>'id';
  entry jsonb;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  if session_id is null or length(session_id) < 1 or payload->>'sessionType' is distinct from 'evening'
     or payload->>'status' is distinct from 'completed' or jsonb_typeof(payload->'entries') is distinct from 'array' then
    raise exception 'Invalid check-in';
  end if;
  if jsonb_array_length(payload->'entries') > 100 then raise exception 'Invalid activity count'; end if;
  if (select sum((value->>'durationMinutes')::integer) from jsonb_array_elements(payload->'entries')) > 1440 then raise exception 'More than 24 hours'; end if;
  insert into public.daily_check_ins(user_id,client_id,session_date,payload)
    values(owner_id,session_id,(payload->>'sessionDate')::date,payload)
    on conflict(user_id,client_id) do update set session_date=excluded.session_date,payload=excluded.payload;
  delete from public.daily_activity_entries where user_id=owner_id and session_client_id=session_id;
  for entry in select value from jsonb_array_elements(payload->'entries') loop
    if (entry->>'activityDate')::date <> (payload->>'sessionDate')::date then raise exception 'Activity date mismatch'; end if;
    insert into public.daily_activity_entries(user_id,client_id,session_client_id,activity_date,title,duration_minutes,primary_category,payload)
      values(owner_id,entry->>'id',session_id,(entry->>'activityDate')::date,entry->>'title',(entry->>'durationMinutes')::integer,entry->>'primaryCategory',entry);
  end loop;
end;
$$;
revoke all on function public.save_daily_check_in(jsonb) from public, anon;
grant execute on function public.save_daily_check_in(jsonb) to authenticated;

-- Extend the existing account-data deletion routine to cover the new tables.
create or replace function public.delete_user_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.daily_check_ins where user_id = auth.uid();
  delete from public.activity_entries where user_id = auth.uid();
  delete from public.voice_notes where user_id = auth.uid();
  delete from public.check_in_sessions where user_id = auth.uid();
  delete from public.user_preferences where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;
