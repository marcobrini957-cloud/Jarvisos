-- How far price has to move before a trade counts as decided.
--
-- Break-even used to be a flat ±€10 on net profit — size-blind, so the same
-- setup got a different verdict purely because one trader sized bigger. It is
-- measured in pips now, which normalises for position size on its own.
--
-- Per user, because the right scratch distance genuinely depends on what you
-- trade: 7 pips is roughly a tenth of a EURUSD daily range and a fiftieth of
-- gold's. Bounded 1–25 so it stays a calibration and cannot become a way to
-- make a losing month disappear into the break-even bucket.

alter table public.user_profiles
  add column if not exists be_pips integer not null default 7;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_profiles_be_pips_range'
  ) then
    alter table public.user_profiles
      add constraint user_profiles_be_pips_range check (be_pips between 1 and 25);
  end if;
end $$;
