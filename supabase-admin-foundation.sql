-- =============================================================================
-- VELQUOR — Admin & Bridge Foundation
-- Supabase Dashboard → SQL Editor → New query → paste everything → Run
--
-- Idempotent: safe to run multiple times.
-- This consolidates the never-applied pieces of supabase-bridge-setup.sql and
-- supabase-last-seen.sql, and adds everything the admin console + hardened
-- bridge need (bans, rewards, bridge settings, audit log, auto-profiles).
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. user_profiles — add every column the app + bridge + admin console expect
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email             TEXT,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT        DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS tier_expires_at   TIMESTAMPTZ,           -- reward grants expire
  ADD COLUMN IF NOT EXISTS mt5_login         TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at      TIMESTAMPTZ,
  -- bridge / EA status
  ADD COLUMN IF NOT EXISTS velquor_api_key   TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ea_connected      BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ea_last_seen      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ea_version        TEXT,
  ADD COLUMN IF NOT EXISTS ea_broker         TEXT,
  -- admin: ban / help / reward
  ADD COLUMN IF NOT EXISTS banned            BOOLEAN     DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS banned_reason     TEXT,
  ADD COLUMN IF NOT EXISTS banned_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_note        TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles (last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_api_key   ON user_profiles (velquor_api_key);
CREATE INDEX IF NOT EXISTS idx_user_profiles_banned    ON user_profiles (banned) WHERE banned;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. API keys — auto-generate on insert, backfill existing rows
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_velquor_api_key()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.velquor_api_key IS NULL THEN
    NEW.velquor_api_key := 'vq_' || replace(gen_random_uuid()::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_velquor_api_key ON user_profiles;
CREATE TRIGGER trg_set_velquor_api_key
  BEFORE INSERT ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION fn_set_velquor_api_key();

UPDATE user_profiles
SET velquor_api_key = 'vq_' || replace(gen_random_uuid()::text, '-', '')
WHERE velquor_api_key IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Auto-create a profile row for every auth signup (+ keep email in sync)
--    Without this, users exist in auth.users but are invisible to the app
--    and to the admin console (this is the case today).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, subscription_tier)
  VALUES (NEW.id, NEW.email, 'free')
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- Backfill: one profile row per existing auth user, and emails for all rows
INSERT INTO public.user_profiles (id, email, subscription_tier)
SELECT u.id, u.email, 'free'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

UPDATE user_profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email <> u.email);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. bridge_settings — single-row config the bridge polls every 30 s.
--    The bridge also writes its heartbeat here, so the admin console can show
--    live bridge health straight from the DB.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bridge_settings (
  id                 INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- admin-editable controls
  maintenance_mode   BOOLEAN     NOT NULL DEFAULT FALSE,  -- 503 everything except /health
  sync_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,   -- /sync on/off
  copy_enabled       BOOLEAN     NOT NULL DEFAULT TRUE,   -- /copy/* on/off
  rate_limit_sync    INT         NOT NULL DEFAULT 300,    -- req / 15 min / key
  rate_limit_copy    INT         NOT NULL DEFAULT 120,    -- req / 15 min / key
  min_ea_version     TEXT        NOT NULL DEFAULT '2.00', -- older EAs get upgrade_required
  broadcast_message  TEXT,                                 -- shown in admin console
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by         TEXT,
  -- bridge-written heartbeat (read-only for admins)
  bridge_last_seen   TIMESTAMPTZ,
  bridge_version     TEXT,
  bridge_started_at  TIMESTAMPTZ,
  bridge_stats       JSONB
);

INSERT INTO bridge_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. admin_audit_log — every admin action, forever
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action        TEXT        NOT NULL,          -- ban_user, unban_user, set_tier, reset_api_key, ...
  target_user_id UUID,
  target_email  TEXT,
  detail        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log (created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Lock the new tables down — service role only (no anon/authenticated access)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE bridge_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log  ENABLE ROW LEVEL SECURITY;
-- no policies on purpose: only the service role (which bypasses RLS) may touch them

-- ─────────────────────────────────────────────────────────────────────────────
-- Done. Verify:
--   SELECT email, subscription_tier, velquor_api_key IS NOT NULL AS has_key,
--          banned FROM user_profiles;
--   SELECT * FROM bridge_settings;
-- =============================================================================
