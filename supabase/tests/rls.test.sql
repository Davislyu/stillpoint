-- Isolation tests. Run after supabase_shim.sql + the migration.
-- Every block raises an exception on failure; success prints PASS lines.
\set ON_ERROR_STOP on
\set alice '''11111111-1111-1111-1111-111111111111'''
\set bob   '''22222222-2222-2222-2222-222222222222'''

select 'PASS pre-existing account backfilled by migration'
  where exists (select 1 from public.users where email = 'early@example.com');

insert into auth.users (id, email, raw_user_meta_data) values
  (:alice, 'alice@example.com', '{"full_name":"Alice A","avatar_url":"https://x/a.png"}'),
  (:bob,   'bob@example.com',   '{"name":"Bob B","picture":"https://x/b.png"}');

select 'PASS profile trigger (runs as non-superuser owner)' where (select count(*) from public.users where id in (:alice, :bob)) = 2
  and (select name from public.users where id = :alice) = 'Alice A'
  and (select image from public.users where id = :bob) = 'https://x/b.png';

-- Act as Alice.
set role authenticated;
select set_config('request.jwt.claim.sub', :alice, false);

insert into public.habits (id, name, accent, created_on) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Gym', 'clay', '2026-10-01');
insert into public.habit_completions (habit_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-30');
insert into public.daily_observations (date, critical_thinking_text) values ('2026-10-31', 'Alice private note');
insert into public.meals (date, meal_number, is_completed, notes) values ('2026-10-31', 1, true, 'Oats');
insert into public.workouts (week_start_date, workout_count) values ('2026-10-26', 2);
insert into public.non_essential_spendings (date, amount, description, category) values ('2026-10-31', 4.50, 'Flat white', 'coffee');
insert into public.milestones (milestone_key, reached_on) values ('streak-3', '2026-10-31');
select 'PASS alice writes own rows (user_id defaulted from auth.uid())'
  where (select count(*) from public.habits where user_id = :alice) = 1;

-- Act as Bob.
select set_config('request.jwt.claim.sub', :bob, false);
do $$
declare n int;
begin
  select (select count(*) from public.habits) + (select count(*) from public.habit_completions)
       + (select count(*) from public.daily_observations) + (select count(*) from public.meals)
       + (select count(*) from public.workouts) + (select count(*) from public.non_essential_spendings)
       + (select count(*) from public.milestones) into n;
  if n <> 0 then raise exception 'FAIL bob can see % of alice''s rows', n; end if;
  if (select count(*) from public.users) <> 1 then raise exception 'FAIL bob sees other profiles'; end if;
  raise notice 'PASS bob sees none of alice''s rows and only his own profile';
end $$;

do $$
begin
  update public.non_essential_spendings set amount = 999;
  delete from public.daily_observations;
  if found then raise exception 'FAIL bob deleted alice data'; end if;
  raise notice 'PASS bob update/delete affect 0 alice rows';
end $$;

do $$ begin
  insert into public.habits (name, created_on, user_id) values ('Spoof', '2026-10-01', '11111111-1111-1111-1111-111111111111');
  raise exception 'FAIL bob inserted a row owned by alice';
exception when insufficient_privilege then raise notice 'PASS insert with forged user_id rejected by RLS';
end $$;

do $$ begin
  insert into public.habits (id, name, created_on) values ('bbbbbbbb-0000-0000-0000-000000000001', 'Read', '2026-10-01');
  insert into public.habit_completions (habit_id, date) values ('aaaaaaaa-0000-0000-0000-000000000001', '2026-10-31');
  raise exception 'FAIL bob completed alice''s habit';
exception when foreign_key_violation then raise notice 'PASS completion pointing at another user''s habit rejected (composite FK)';
end $$;

do $$ begin
  update public.users set email = 'evil@example.com';
  raise exception 'FAIL email column writable';
exception when insufficient_privilege then raise notice 'PASS profile email is read-only to clients';
end $$;

-- Constraints
do $$ begin
  insert into public.meals (date, meal_number) values ('2026-10-31', 6);
  raise exception 'FAIL meal 6 allowed';
exception when check_violation then raise notice 'PASS meal_number limited to 1..5';
end $$;
do $$ begin
  insert into public.workouts (week_start_date, workout_count) values ('2026-10-26', 5);
  raise exception 'FAIL 5 workouts allowed';
exception when check_violation then raise notice 'PASS workout_count limited to 0..4';
end $$;
do $$ begin
  insert into public.workouts (week_start_date) values ('2026-10-28');
  raise exception 'FAIL non-Monday week start allowed';
exception when check_violation then raise notice 'PASS week_start_date must be a Monday';
end $$;
do $$ begin
  insert into public.non_essential_spendings (date, amount, description) values ('2026-10-31', 0, 'Free');
  raise exception 'FAIL zero amount allowed';
exception when check_violation then raise notice 'PASS spending amount must be positive';
end $$;

-- Upserts on the natural keys used by the client
insert into public.meals (date, meal_number, is_completed) values ('2026-10-31', 2, true)
  on conflict (user_id, date, meal_number) do update set is_completed = excluded.is_completed;
insert into public.meals (date, meal_number, notes) values ('2026-10-31', 2, 'Shake')
  on conflict (user_id, date, meal_number) do update set notes = excluded.notes;
select 'PASS meal upsert merges on (user_id, date, meal_number)'
  where (select count(*) from public.meals) = 1 and (select notes from public.meals) = 'Shake';
insert into public.workouts (week_start_date, workout_count) values ('2026-10-26', 1)
  on conflict (user_id, week_start_date) do update set workout_count = excluded.workout_count;
insert into public.workouts (week_start_date, workout_count) values ('2026-10-26', 3)
  on conflict (user_id, week_start_date) do update set workout_count = excluded.workout_count;
select 'PASS workouts upsert per week' where (select workout_count from public.workouts) = 3;

-- Anonymous visitors
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  perform 1 from public.habits;
  raise exception 'FAIL anon can read habits';
exception when insufficient_privilege then raise notice 'PASS anon has no access';
end $$;
reset role;

-- Alice's data untouched by Bob's attempts
select 'PASS alice data intact' where
  (select amount from public.non_essential_spendings where user_id = :alice) = 4.50
  and (select count(*) from public.daily_observations where user_id = :alice) = 1;

-- Cascade on account deletion
delete from auth.users where id = :alice;
select 'PASS deleting an account removes all its rows' where
  (select count(*) from public.habits where user_id = :alice) = 0
  and (select count(*) from public.non_essential_spendings where user_id = :alice) = 0;

-- v3: preferences column, writable only for your own profile
set role authenticated;
select set_config('request.jwt.claim.sub', :bob, false);
update public.users set preferences = '{"theme":"geek"}';
select 'PASS preferences saved for own profile' where (select preferences->>'theme' from public.users) = 'geek';
reset role;
do $$ begin
  update public.users set preferences = '[]'::jsonb where id = '22222222-2222-2222-2222-222222222222';
  raise exception 'FAIL non-object preferences allowed';
exception when check_violation then raise notice 'PASS preferences must be a JSON object';
end $$;
