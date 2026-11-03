-- Whether a budget is part of a month's plan now belongs to the month budget
-- row, so it syncs with the plan itself. Existing rows were all part of their
-- month's plan and default to active.
alter table public.month_budgets
  add column if not exists active boolean not null default true;
