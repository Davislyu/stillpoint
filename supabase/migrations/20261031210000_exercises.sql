-- Lift tracker: one row per exercise with its current best (kg) and a short
-- PR history for the sparkline. Same isolation rules as every other table.

create table public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  weight_kg  numeric(6, 2) not null default 0 check (weight_kg >= 0 and weight_kg < 1000),
  reps       smallint not null default 1 check (reps between 1 and 100),
  created_on date not null,
  pr_on      date,
  -- [{ "date": "2026-10-31", "kg": 102.5, "reps": 3 }, ...] oldest first, capped client-side
  history    jsonb not null default '[]'::jsonb check (jsonb_typeof(history) = 'array' and pg_column_size(history) < 16384),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index exercises_user_idx on public.exercises (user_id, created_at);

create trigger exercises_set_updated_at
  before update on public.exercises
  for each row execute function public.set_updated_at();

alter table public.exercises enable row level security;
alter table public.exercises force row level security;
create policy "exercises: owner only" on public.exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.exercises from anon;
grant select, insert, update, delete on public.exercises to authenticated;

alter publication supabase_realtime add table public.exercises;
