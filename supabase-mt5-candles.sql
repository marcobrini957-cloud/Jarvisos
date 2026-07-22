-- ── MT5 candles ───────────────────────────────────────────────────────────────
-- OHLC bars streamed from the EA (CopyRates) via the bridge, so the Trade Map can
-- render your broker's real candles behind your trades. Small + disposable: kept
-- per (user, symbol, timeframe, bar-time) and pruned to a rolling window.

create table if not exists public.mt5_candles (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  symbol     text        not null,
  timeframe  text        not null,          -- 'M15' | 'H1' | 'D1'
  ts         bigint      not null,          -- bar open time, unix seconds (UTC)
  open       double precision not null,
  high       double precision not null,
  low        double precision not null,
  close      double precision not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, symbol, timeframe, ts)
);

create index if not exists mt5_candles_lookup
  on public.mt5_candles (user_id, symbol, timeframe, ts desc);

-- RLS: a user reads only their own candles; the bridge writes with the service
-- role, which bypasses RLS.
alter table public.mt5_candles enable row level security;

drop policy if exists "read own candles" on public.mt5_candles;
create policy "read own candles" on public.mt5_candles
  for select using (auth.uid() = user_id);

-- Optional housekeeping: prune bars older than ~120 days. Run manually or via a
-- scheduled job (pg_cron). Storage is tiny, so this is only hygiene.
-- delete from public.mt5_candles where ts < extract(epoch from now() - interval '120 days');
