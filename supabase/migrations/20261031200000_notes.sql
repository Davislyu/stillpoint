-- Second brain: free-form notes that link to each other with [[Title]] and
-- group by #tags. Same isolation rules as every other table: forced RLS,
-- owner-only policy, user_id defaulted from the signed-in user.

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.users (id) on delete cascade,
  date       date not null,
  title      text not null default '' check (char_length(title) <= 120),
  body       text not null default '' check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_date_idx on public.notes (user_id, date desc);

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
alter table public.notes force row level security;
create policy "notes: owner only" on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

alter publication supabase_realtime add table public.notes;
