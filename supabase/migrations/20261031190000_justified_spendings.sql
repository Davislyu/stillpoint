-- Justified payments (arnona, rent, bills you can't avoid): still logged,
-- but never counted against progress. Existing rows default to "not justified".
alter table public.non_essential_spendings
  add column if not exists justified boolean not null default false;
