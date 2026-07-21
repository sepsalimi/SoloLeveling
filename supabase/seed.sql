insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values ('00000000-0000-0000-0000-000000000001', 'demo@example.com', crypt('password123', gen_salt('bf')), now(), now(), now())
on conflict (id) do nothing;

insert into public.profiles (id, display_name, timezone)
values ('00000000-0000-0000-0000-000000000001', 'Demo User', 'America/New_York')
on conflict (id) do nothing;

insert into public.user_preferences (user_id, afternoon_reminder_time, evening_reminder_time, reminder_days)
values ('00000000-0000-0000-0000-000000000001', '14:00', '20:30', array[1,2,3,4,5])
on conflict (user_id) do nothing;

insert into public.check_in_sessions (id, user_id, session_date, session_type, status, completed_at)
values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', current_date, 'afternoon', 'completed', now())
on conflict (id) do nothing;

insert into public.activity_entries (
  user_id, session_id, activity_date, title, duration_minutes, primary_category, social_context, purpose_tags, efficiency_percent, confidence
)
values
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 'Client presentation', 120, 'work', 'solo', array['productive'], 80, 0.94),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', current_date, 'Gym', 50, 'exercise', 'public', array['growth','recovery'], null, 0.9);

