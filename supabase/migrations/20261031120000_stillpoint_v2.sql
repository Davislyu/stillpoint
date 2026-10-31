-- ════════════════════════════════════════════════════════════════════════
-- Stillpoint v2: per-user data with row-level security and realtime sync.
--
-- Isolation model
--   * Every user-owned table has `user_id uuid not null default auth.uid()`.
--   * RLS is enabled and FORCED on every table; the only policies grant the
--     `authenticated` role access to rows where user_id = auth.uid().
--   * `anon` has no privileges at all. Unauthenticated requests see nothing.
--   * Child rows (habit_completions) reference their parent through a
--     composite (id, user_id) foreign key, so a row can never point at
--     another user's habit even if a client forges the habit_id.
-- ════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Helpers ─────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ── users ───────────────────────────────────────────────────────────────
-- Public profile mirrored from auth.users (Google name + avatar).

create table public.users (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text not null,
  name              text,
  image             text,
  defaults_seeded   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, email, name, image)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email = excluded.email,
        name  = coalesce(excluded.name, public.users.name),
        image = coalesce(excluded.image, public.users.image);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_auth_user();

-- ── habits ──────────────────────────────────────────────────────────────

create table public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  accent      text not null default 'sage'
              check (accent in ('sage', 'dusk', 'mauve', 'sand', 'teal', 'clay')),
  created_on  date not null,
  archived_on date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint habits_id_user_unique unique (id, user_id),
  constraint habits_archive_after_create check (archived_on is null or archived_on >= created_on)
);
create index habits_user_idx on public.habits (user_id);

create table public.habit_completions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  habit_id   uuid not null,
  date       date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint habit_completions_once_per_day unique (habit_id, date),
  constraint habit_completions_same_owner
    foreign key (habit_id, user_id) references public.habits (id, user_id) on delete cascade
);
create index habit_completions_user_date_idx on public.habit_completions (user_id, date);

create table public.milestones (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.users (id) on delete cascade,
  milestone_key text not null check (milestone_key ~ '^[a-z0-9-]{1,40}$'),
  reached_on    date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint milestones_once unique (user_id, milestone_key)
);

-- ── daily_observations ──────────────────────────────────────────────────

create table public.daily_observations (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null default auth.uid() references public.users (id) on delete cascade,
  date                    date not null,
  critical_thinking_text  text not null default '' check (char_length(critical_thinking_text) <= 20000),
  observations_text       text not null default '' check (char_length(observations_text) <= 20000),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint daily_observations_one_per_day unique (user_id, date)
);

-- ── meals ───────────────────────────────────────────────────────────────

create table public.meals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.users (id) on delete cascade,
  date         date not null,
  meal_number  smallint not null check (meal_number between 1 and 5),
  is_completed boolean not null default false,
  notes        text not null default '' check (char_length(notes) <= 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint meals_one_per_slot unique (user_id, date, meal_number)
);

-- ── workouts ────────────────────────────────────────────────────────────
-- One row per user per ISO week (weeks start on Monday).

create table public.workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.users (id) on delete cascade,
  week_start_date date not null check (extract(isodow from week_start_date) = 1),
  workout_count   smallint not null default 0 check (workout_count between 0 and 4),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint workouts_one_per_week unique (user_id, week_start_date)
);

-- ── non_essential_spendings ─────────────────────────────────────────────

create table public.non_essential_spendings (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.users (id) on delete cascade,
  date        date not null,
  amount      numeric(12, 2) not null check (amount > 0 and amount < 1000000),
  description text not null check (char_length(btrim(description)) between 1 and 80),
  category    text not null default 'other'
              check (category in ('coffee', 'subscription', 'impulse', 'eating-out', 'entertainment', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index non_essential_spendings_user_date_idx on public.non_essential_spendings (user_id, date);

-- ── updated_at triggers ─────────────────────────────────────────────────

do $$
declare t text;
begin
  foreach t in array array[
    'users', 'habits', 'habit_completions', 'milestones',
    'daily_observations', 'meals', 'workouts', 'non_essential_spendings'
  ] loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end $$;

-- ── Row-level security ──────────────────────────────────────────────────

-- users: RLS enabled but not FORCED, so the security-definer trigger above
-- (owned by the table owner) can create profiles. Clients are unaffected:
-- they connect as `authenticated`, which the policies below still bind.
alter table public.users enable row level security;

create policy "users: read own profile" on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy "users: update own profile" on public.users
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'habits', 'habit_completions', 'milestones',
    'daily_observations', 'meals', 'workouts', 'non_essential_spendings'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))',
      t || ': owner only', t
    );
  end loop;
end $$;

-- ── Privileges ──────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from authenticated;

grant select, update (name, image, defaults_seeded) on public.users to authenticated;
grant select, insert, update, delete on
  public.habits, public.habit_completions, public.milestones,
  public.daily_observations, public.meals, public.workouts, public.non_essential_spendings
  to authenticated;

-- ── Realtime ────────────────────────────────────────────────────────────
-- Realtime evaluates the same RLS policies before delivering INSERT/UPDATE
-- events, so each client only receives its own rows.

alter publication supabase_realtime add table
  public.habits, public.habit_completions, public.milestones,
  public.daily_observations, public.meals, public.workouts, public.non_essential_spendings;

-- ── Backfill ────────────────────────────────────────────────────────────
-- Accounts that signed in before this migration ran have no profile yet.

insert into public.users (id, email, name, image)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;
