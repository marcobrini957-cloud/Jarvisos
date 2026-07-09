-- ─────────────────────────────────────────────────────────────────────────────
-- VELQUOR Bridge Setup — run this in Supabase SQL Editor
-- Adds API key + EA status columns to user_profiles
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add bridge columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS velquor_api_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS ea_connected     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ea_last_seen     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ea_version       TEXT,
  ADD COLUMN IF NOT EXISTS ea_broker        TEXT;

-- 2. Backfill existing users with unique API keys
UPDATE user_profiles
SET velquor_api_key = 'vq_' || replace(gen_random_uuid()::text, '-', '')
WHERE velquor_api_key IS NULL;

-- 3. Auto-generate key for new signups via trigger
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

-- 4. Index for fast API key lookups (bridge does this on every request)
CREATE INDEX IF NOT EXISTS idx_user_profiles_api_key
  ON user_profiles (velquor_api_key);

-- 5. Mark EA offline if not seen for >5 min (optional scheduled job via pg_cron)
-- If you have pg_cron enabled in Supabase:
-- SELECT cron.schedule('mark-ea-offline', '*/5 * * * *', $$
--   UPDATE user_profiles
--   SET ea_connected = FALSE
--   WHERE ea_connected = TRUE
--     AND ea_last_seen < NOW() - INTERVAL '5 minutes';
-- $$);

-- Verify
SELECT id, velquor_api_key, ea_connected FROM user_profiles LIMIT 5;
