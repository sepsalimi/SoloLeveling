-- Exercises activity isolation with two authenticated users against local Postgres.
begin;
select plan(4);

insert into auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000101', 'rls-one@example.com', '', now(), now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'rls-two@example.com', '', now(), now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

select lives_ok(
  $$insert into public.activity_entries (
    user_id, activity_date, title, duration_minutes, primary_category, social_context, purpose_tags
  ) values (
    '00000000-0000-0000-0000-000000000101', current_date, 'Private activity', 30, 'other', 'solo', '{}'
  )$$,
  'a user can insert their own activity'
);

select is(
  (select count(*) from public.activity_entries)::bigint,
  1::bigint,
  'a user can read their own activity'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

select is(
  (select count(*) from public.activity_entries)::bigint,
  0::bigint,
  'another user cannot read the activity'
);

select throws_ok(
  $$insert into public.activity_entries (
    user_id, activity_date, title, duration_minutes, primary_category, social_context, purpose_tags
  ) values (
    '00000000-0000-0000-0000-000000000101', current_date, 'Cross-user write', 30, 'other', 'solo', '{}'
  )$$,
  '42501',
  'new row violates row-level security policy for table "activity_entries"',
  'another user cannot write the activity'
);

select * from finish();
rollback;
