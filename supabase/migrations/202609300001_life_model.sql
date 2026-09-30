-- Tenant-scoped life plans and multi-day activity validation for the conversational product.
create table if not exists public.life_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  constraint life_plan_version check ((payload->>'version')::integer = 2),
  constraint life_plan_arrays check (
    jsonb_typeof(payload->'goals') = 'array'
    and jsonb_typeof(payload->'projects') = 'array'
    and jsonb_typeof(payload->'tasks') = 'array'
    and jsonb_typeof(payload->'occurrences') = 'array'
  )
);

alter table public.life_plans enable row level security;
create policy life_plans_own on public.life_plans
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

update public.daily_activity_entries
set primary_category = case primary_category
  when 'work' then 'Career'
  when 'learning' then 'Learning'
  when 'health' then 'Health'
  when 'exercise' then 'Health'
  when 'food' then 'Health'
  when 'chores' then 'Life Admin'
  when 'social' then 'Relationships'
  when 'entertainment' then 'Leisure'
  when 'rest' then 'Leisure'
  when 'travel' then 'Life Admin'
  when 'personal_care' then 'Health'
  when 'other' then 'Life Admin'
  else primary_category
end;

alter table public.daily_activity_entries
  drop constraint if exists daily_activity_entries_primary_category_check;
alter table public.daily_activity_entries
  add constraint daily_activity_entries_primary_category_check
  check(primary_category in ('Life Admin','Finances','Leisure','Career','Health','Learning','Creative','Relationships'));

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
  if exists (
    select 1
    from jsonb_array_elements(payload->'entries') value
    group by value->>'activityDate'
    having sum((value->>'durationMinutes')::integer) > 1440
  ) then raise exception 'More than 24 hours on one date'; end if;

  insert into public.daily_check_ins(user_id,client_id,session_date,payload)
    values(owner_id,session_id,(payload->>'sessionDate')::date,payload)
    on conflict(user_id,client_id) do update set session_date=excluded.session_date,payload=excluded.payload;
  delete from public.daily_activity_entries where user_id=owner_id and session_client_id=session_id;
  for entry in select value from jsonb_array_elements(payload->'entries') loop
    if entry->>'id' is null or entry->>'title' is null or entry->>'activityDate' is null
       or (entry->>'durationMinutes')::integer not between 1 and 1440
       or entry->>'primaryCategory' not in ('Life Admin','Finances','Leisure','Career','Health','Learning','Creative','Relationships') then
      raise exception 'Invalid activity';
    end if;
    insert into public.daily_activity_entries(user_id,client_id,session_client_id,activity_date,title,duration_minutes,primary_category,payload)
      values(owner_id,entry->>'id',session_id,(entry->>'activityDate')::date,entry->>'title',(entry->>'durationMinutes')::integer,entry->>'primaryCategory',entry);
  end loop;
end;
$$;

revoke all on function public.save_daily_check_in(jsonb) from public, anon;
grant execute on function public.save_daily_check_in(jsonb) to authenticated;

create or replace function public.delete_user_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.life_plans where user_id = auth.uid();
  delete from public.daily_check_ins where user_id = auth.uid();
  delete from public.activity_entries where user_id = auth.uid();
  delete from public.voice_notes where user_id = auth.uid();
  delete from public.check_in_sessions where user_id = auth.uid();
  delete from public.user_preferences where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;
