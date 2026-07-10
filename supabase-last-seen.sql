-- Add last_seen_at to user_profiles for "Online Now" tracking in dev console
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles (last_seen_at DESC);
