create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  afternoon_reminder_time time not null default '14:00',
  evening_reminder_time time not null default '20:30',
  reminder_days int[] not null default array[1,2,3,4,5,6,0],
  efficiency_enabled boolean not null default true,
  mood_enabled boolean not null default true,
  retain_audio boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_days_valid check (reminder_days <@ array[0,1,2,3,4,5,6])
);

create table public.check_in_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  session_type text not null check (session_type in ('afternoon','evening','manual')),
  status text not null check (status in ('draft','processing','review','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.check_in_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text,
  transcript text,
  processing_status text not null default 'pending' check (processing_status in ('pending','processing','completed','failed')),
  processing_error text,
  created_at timestamptz not null default now()
);

create table public.activity_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.check_in_sessions(id) on delete set null,
  activity_date date not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  start_time time,
  end_time time,
  duration_minutes int not null check (duration_minutes > 0 and duration_minutes <= 1440),
  primary_category text not null check (primary_category in ('work','learning','health','exercise','food','chores','social','entertainment','rest','travel','personal_care','other')),
  social_context text not null check (social_context in ('solo','with_partner','with_family','with_friends','with_coworkers','public','unknown')),
  purpose_tags text[] not null default '{}',
  efficiency_percent int check (efficiency_percent between 0 and 100),
  energy_level int check (energy_level between 1 and 5),
  mood int check (mood between 1 and 5),
  confidence numeric not null default 0 check (confidence >= 0 and confidence <= 1),
  needs_review boolean not null default false,
  source_transcript_segment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purpose_tags_valid check (purpose_tags <@ array['productive','fun','recovery','necessary','growth'])
);

create index check_in_sessions_user_date_idx on public.check_in_sessions(user_id, session_date desc);
create index voice_notes_user_session_idx on public.voice_notes(user_id, session_id);
create index activity_entries_user_date_idx on public.activity_entries(user_id, activity_date desc);
create index activity_entries_category_idx on public.activity_entries(user_id, primary_category);
create index activity_entries_purpose_gin_idx on public.activity_entries using gin(purpose_tags);

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.check_in_sessions enable row level security;
alter table public.voice_notes enable row level security;
alter table public.activity_entries enable row level security;

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete using (auth.uid() = id);

create policy "preferences_all_own" on public.user_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "sessions_all_own" on public.check_in_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "voice_notes_all_own" on public.voice_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_entries_all_own" on public.activity_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger preferences_touch_updated_at before update on public.user_preferences for each row execute function public.touch_updated_at();
create trigger sessions_touch_updated_at before update on public.check_in_sessions for each row execute function public.touch_updated_at();
create trigger activities_touch_updated_at before update on public.activity_entries for each row execute function public.touch_updated_at();

create or replace function public.delete_user_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.activity_entries where user_id = auth.uid();
  delete from public.voice_notes where user_id = auth.uid();
  delete from public.check_in_sessions where user_id = auth.uid();
  delete from public.user_preferences where user_id = auth.uid();
  delete from public.profiles where id = auth.uid();
end;
$$;

