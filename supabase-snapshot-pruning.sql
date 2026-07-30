-- ═══════════════════════════════════════════════════════════════════════════
-- account_snapshots retention
-- ═══════════════════════════════════════════════════════════════════════════
--
-- The EA posts an account snapshot every ~10 seconds per connected terminal.
-- Measured on the live database 2026-07-30: 8,700 rows a day from a single
-- login, 122,538 rows since May. That is per user, forever, and none of it is
-- read at full resolution — the equity curve draws from hourly points and the
-- dashboard only ever reads the newest row.
--
-- Three windows:
--   · last 48h        every row, untouched. This is what "live" means, and
--                     the intraday equity curve reads it.
--   · 48h → 90 days   one row per hour per account — the last one in the hour,
--                     so the point carries the balance the hour closed on.
--   · beyond 90 days  deleted.
--
-- Run daily from /api/cron/prune-snapshots (see vercel.json). Idempotent: a
-- second run inside the same hour deletes nothing.

create or replace function prune_account_snapshots(
  raw_hours int default 48,
  keep_days int default 90
)
returns table (thinned bigint, expired bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thinned bigint;
  v_expired bigint;
begin
  -- 1. Past the horizon.
  with del as (
    delete from account_snapshots
     where snapshot_at < now() - make_interval(days => keep_days)
    returning 1
  )
  select count(*) into v_expired from del;

  -- 2. Thin what is left of the older window to hourly. row_number() over the
  --    hour bucket keeps the newest and marks the rest; the index this needs
  --    (user_id, mt5_login, snapshot_at desc) already exists as
  --    idx_snapshots_login. mt5_login is null for rows written by the old
  --    MetaAPI sync path, and nulls partition together, which is what we want:
  --    they are all the same account.
  with ranked as (
    select id,
           row_number() over (
             partition by user_id, mt5_login, date_trunc('hour', snapshot_at)
             order by snapshot_at desc, id desc
           ) as rn
      from account_snapshots
     where snapshot_at < now() - make_interval(hours => raw_hours)
  ),
  del as (
    delete from account_snapshots a
     using ranked r
     where a.id = r.id
       and r.rn > 1
    returning 1
  )
  select count(*) into v_thinned from del;

  return query select v_thinned, v_expired;
end;
$$;

-- Only the service role calls this. It is security definer, so leaving it
-- executable by `authenticated` would hand every logged-in user a delete.
revoke all on function prune_account_snapshots(int, int) from public;
revoke all on function prune_account_snapshots(int, int) from anon;
revoke all on function prune_account_snapshots(int, int) from authenticated;
grant execute on function prune_account_snapshots(int, int) to service_role;
