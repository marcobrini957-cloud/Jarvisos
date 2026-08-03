-- Broker credit is not the trader's money.
--
-- MT5 reports ACCOUNT_CREDIT separately from ACCOUNT_BALANCE: a bonus or credit
-- line the broker lends you. It is included in ACCOUNT_EQUITY, so any product
-- that answers "how much money do I have" with raw equity overstates the
-- trader's own capital by exactly the credit.
--
-- The EA has sent account.credit since 2.24; the bridge dropped it on the way
-- into account_snapshots. This adds the column so the split can be shown.
--
-- NULL = we never recorded it (historical rows), which is different from 0.00
-- = the broker confirmed there is no credit. The app treats NULL as "unknown,
-- show equity as-is" so old rows are never silently rewritten.

alter table account_snapshots
  add column if not exists credit numeric;

comment on column account_snapshots.credit is
  'Broker credit/bonus included in equity but NOT the trader''s money (MT5 ACCOUNT_CREDIT). NULL = not recorded.';

-- The daily net-worth series has to carry credit too, or the curve keeps
-- drawing the inflated figure under a corrected headline.
drop function if exists account_networth_daily(uuid, timestamptz, timestamptz);

create function account_networth_daily(
  p_user_id uuid, p_from timestamptz, p_to timestamptz
)
returns table(day date, balance numeric, equity numeric, credit numeric)
language sql
stable
security definer
set search_path to 'public'
as $$
  select distinct on (snapshot_at::date)
         snapshot_at::date as day, balance, equity, credit
  from account_snapshots
  where user_id = p_user_id
    and snapshot_at >= p_from
    and snapshot_at <  p_to
  order by snapshot_at::date, snapshot_at desc
$$;
