-- Reset every account except the founder's (davislyu@gmail.com).
--
-- Keeps the accounts (people can still sign in) but wipes all their data:
-- habits, ticks, notes, meals, workouts, spending, achievements and kills,
-- plus their theme/dashboard preferences. Next sign-in they see onboarding
-- and choose an aura from scratch. The founder's account is untouched.
--
-- Run in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- It cannot be undone. Run step 1 alone first if you want to see what goes.

-- ── Step 1 (optional preview): who and how much will be wiped ───────────
-- select u.email,
--   (select count(*) from public.habits h where h.user_id = u.id) as habits,
--   (select count(*) from public.habit_completions c where c.user_id = u.id) as ticks,
--   (select count(*) from public.milestones m where m.user_id = u.id) as achievements_and_kills,
--   (select count(*) from public.non_essential_spendings s where s.user_id = u.id) as spendings
-- from auth.users u
-- where lower(u.email) <> 'davislyu@gmail.com'
-- order by u.email;

-- ── Step 2: the reset ───────────────────────────────────────────────────
begin;

do $$
declare
  admin_id uuid;
  n int;
begin
  select id into admin_id from auth.users where lower(email) = 'davislyu@gmail.com';
  if admin_id is null then
    raise exception 'Founder account not found; nothing was changed.';
  end if;

  delete from public.habit_completions      where user_id <> admin_id;
  delete from public.habits                 where user_id <> admin_id;
  delete from public.milestones             where user_id <> admin_id;
  delete from public.daily_observations     where user_id <> admin_id;
  delete from public.meals                  where user_id <> admin_id;
  delete from public.workouts               where user_id <> admin_id;
  delete from public.non_essential_spendings where user_id <> admin_id;

  update public.users
     set defaults_seeded = false, preferences = '{}'::jsonb
   where id <> admin_id;
  get diagnostics n = row_count;
  raise notice 'Reset % account(s). Founder % kept as is.', n, admin_id;
end $$;

commit;
