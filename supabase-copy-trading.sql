-- VELQUOR Copy Trading Schema
-- Run this in Supabase SQL Editor

-- ── copy_groups: one "cluster" of master + slave accounts ──────────────────────
CREATE TABLE IF NOT EXISTS copy_groups (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Copy Group 1',
  lot_mode       TEXT NOT NULL DEFAULT 'proportional' CHECK (lot_mode IN ('fixed','proportional')),
  lot_fixed      NUMERIC(10,2)  DEFAULT 0.01,
  lot_multiplier NUMERIC(10,4)  DEFAULT 1.0,
  max_lot        NUMERIC(10,2)  DEFAULT 10.0,
  active         BOOLEAN        DEFAULT TRUE,
  created_at     TIMESTAMPTZ    DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    DEFAULT NOW()
);

-- ── copy_accounts: individual MT5 accounts inside a group ─────────────────────
CREATE TABLE IF NOT EXISTS copy_accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES copy_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('master','slave')),
  nickname     TEXT DEFAULT '',
  mt5_login    TEXT NOT NULL,
  mt5_server   TEXT DEFAULT '',
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','active','paused','error')),
  last_seen_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── copy_signals: trade signals broadcast by a master account ─────────────────
CREATE TABLE IF NOT EXISTS copy_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES copy_groups(id) ON DELETE CASCADE,
  master_account_id UUID NOT NULL REFERENCES copy_accounts(id),
  signal_type       TEXT NOT NULL CHECK (signal_type IN ('open','close','modify')),
  master_ticket     BIGINT NOT NULL,
  symbol            TEXT NOT NULL,
  trade_type        TEXT NOT NULL CHECK (trade_type IN ('buy','sell')),
  lot_size          NUMERIC(10,2),
  open_price        NUMERIC(20,8),
  stop_loss         NUMERIC(20,8) DEFAULT 0,
  take_profit       NUMERIC(20,8) DEFAULT 0,
  close_price       NUMERIC(20,8),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── copy_log: per-slave execution result ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS copy_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id        UUID NOT NULL REFERENCES copy_signals(id) ON DELETE CASCADE,
  slave_account_id UUID NOT NULL REFERENCES copy_accounts(id),
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','executed','failed','skipped')),
  slave_ticket     BIGINT,
  slave_lots       NUMERIC(10,2),
  error_message    TEXT,
  executed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_copy_groups_user        ON copy_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_accounts_group     ON copy_accounts(group_id, role);
CREATE INDEX IF NOT EXISTS idx_copy_accounts_user      ON copy_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_copy_signals_group      ON copy_signals(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_copy_log_slave_pending  ON copy_log(slave_account_id, status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_copy_log_signal         ON copy_log(signal_id);

-- ── RLS: disabled (service role access only, same as dev_todos) ───────────────
ALTER TABLE copy_groups   DISABLE ROW LEVEL SECURITY;
ALTER TABLE copy_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE copy_signals  DISABLE ROW LEVEL SECURITY;
ALTER TABLE copy_log      DISABLE ROW LEVEL SECURITY;
