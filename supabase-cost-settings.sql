-- Admin cost model.
--
-- The /dev Costs tab attributes running costs to individual users. The prices
-- live here rather than in the code so Marco can put his real invoice figures
-- in from the admin console without a deploy.
--
-- Applied to production 2026-07-28.

create table if not exists public.admin_cost_settings (
  id                   integer primary key default 1,
  server_monthly_eur   numeric not null default 4.35,   -- bridge box (cloud terminals)
  hosting_monthly_eur  numeric not null default 0,      -- web app hosting
  database_monthly_eur numeric not null default 0,      -- database + storage plan
  domain_monthly_eur   numeric not null default 1.00,   -- annual ÷ 12
  terminal_capacity    integer not null default 4,      -- slots the box holds
  ai_cost_per_call_eur numeric not null default 0,      -- 0 while on a free tier
  price_pro_eur        numeric not null default 15.99,
  price_ultra_eur      numeric not null default 30.99,
  updated_at           timestamptz not null default now(),
  constraint admin_cost_settings_single_row check (id = 1)
);

insert into public.admin_cost_settings (id) values (1) on conflict (id) do nothing;

-- Reached only through the service role behind the /dev password; no user-facing
-- policy is granted, so RLS on with no policies denies everyone else.
alter table public.admin_cost_settings enable row level security;
