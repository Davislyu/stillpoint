-- Stillpoint v3: per-account preferences (theme, mode, themes tried).
alter table public.users
  add column if not exists preferences jsonb not null default '{}'::jsonb
  constraint users_preferences_object check (jsonb_typeof(preferences) = 'object' and pg_column_size(preferences) < 8192);

grant update (preferences) on public.users to authenticated;
