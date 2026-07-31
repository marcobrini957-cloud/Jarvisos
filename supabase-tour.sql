-- First-run product tour state.
--
-- A new account lands on a dashboard with no trades, no holdings and ten tabs,
-- and nothing explains which of them matters or in what order. The four-step
-- /onboarding wizard runs before this and covers setup; this is the walkthrough
-- of the product itself.
--
-- Two columns rather than one boolean: `shown_count` so it can appear on the
-- first couple of logins rather than exactly once (people dismiss things by
-- reflex on day one), and `completed_at` so finishing it — or explicitly
-- skipping — stops it for good.

alter table public.user_profiles
  add column if not exists tour_shown_count integer not null default 0;

alter table public.user_profiles
  add column if not exists tour_completed_at timestamptz;

-- Existing accounts have already found their way around; only new signups
-- should meet it.
update public.user_profiles
   set tour_completed_at = coalesce(tour_completed_at, now())
 where created_at < now() - interval '1 day';
