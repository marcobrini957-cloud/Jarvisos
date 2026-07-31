-- Has this account been walked through setup yet?
--
-- The four-step /onboarding flow has existed since launch and nothing ever
-- linked to it. A new account went straight to an empty dashboard: no trades,
-- no MT5 connection, no prompt to make one, and a modal that said "Welcome
-- back" to someone who had never been there. This column is what lets the
-- dashboard tell a first visit from a return.
--
-- Backfilled from created_at so nobody who is already using the product gets
-- sent back through a setup wizard.

alter table public.user_profiles
  add column if not exists onboarded_at timestamptz;

update public.user_profiles
   set onboarded_at = coalesce(created_at, now())
 where onboarded_at is null;
