-- The ledger now takes any payment, not only leaks: add the everyday categories.
alter table public.non_essential_spendings drop constraint if exists non_essential_spendings_category_check;
alter table public.non_essential_spendings
  add constraint non_essential_spendings_category_check
  check (category in ('coffee', 'subscription', 'impulse', 'eating-out', 'entertainment', 'other',
                      'groceries', 'bills', 'transport', 'health', 'shopping'));
