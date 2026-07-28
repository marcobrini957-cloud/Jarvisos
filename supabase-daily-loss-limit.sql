-- Per-user daily loss limit.
--
-- It used to live in localStorage, so it was really a per-browser setting: a
-- user who logged in on their phone got the €200 default back and a limit they
-- had never chosen. It belongs to the person, so it lives on their profile.
--
-- `daily_loss_mode` decides how `daily_loss_value` is read:
--   'amount'  → the value is in account currency (200 = €200/day)
--   'percent' → the value is a share of account balance (2 = 2%/day)
-- Percent is stored rather than the resolved figure so the limit tracks the
-- account as it grows or shrinks.
--
-- Applied to production 2026-07-28.

alter table public.user_profiles
  add column if not exists daily_loss_mode  text    not null default 'amount',
  add column if not exists daily_loss_value numeric not null default 200;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_daily_loss_mode_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_daily_loss_mode_check
      check (daily_loss_mode in ('amount','percent'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_daily_loss_value_check'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_daily_loss_value_check
      check (daily_loss_value > 0);
  end if;
end $$;
