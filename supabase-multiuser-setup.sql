-- =============================================================================
-- Jarvis OS — Multi-User Database Setup
-- Supabase Dashboard → SQL Editor → New query → Run
--
-- BEFORE RUNNING:
--   1. Replace every occurrence of 'YOUR-USER-UUID-HERE' with your real UUID.
--      Find it: Supabase Dashboard → Authentication → Users → copy your UUID.
--   2. Run the script in one shot — it is idempotent (safe to re-run).
-- =============================================================================


-- =============================================================================
-- STEP 1 — Add user_id column to all tables (safe if column already exists)
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trades', 'account_snapshots', 'portfolio_holdings', 'portfolio_snapshots',
    'journal_entries', 'tasks', 'macro_briefings', 'calendar_events',
    'telegram_messages', 'user_profile', 'habits', 'habit_completions', 'weekly_reviews'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'user_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN user_id UUID REFERENCES auth.users(id)', t);
      END IF;
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 2 — Backfill existing rows with your user UUID
--          ⚠️  REPLACE 'YOUR-USER-UUID-HERE' before running!
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trades', 'account_snapshots', 'portfolio_holdings', 'portfolio_snapshots',
    'journal_entries', 'tasks', 'macro_briefings', 'calendar_events',
    'telegram_messages', 'user_profile', 'habits', 'habit_completions', 'weekly_reviews'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('UPDATE %I SET user_id = ''d523ce95-9dfe-4495-a089-73863ae491da'' WHERE user_id IS NULL', t);
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 3 — Add NOT NULL constraint now that all rows are backfilled
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trades', 'account_snapshots', 'portfolio_holdings', 'portfolio_snapshots',
    'journal_entries', 'tasks', 'macro_briefings', 'calendar_events',
    'telegram_messages', 'habits', 'habit_completions', 'weekly_reviews'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN user_id SET NOT NULL', t);
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 4 — Drop old "authenticated_only" policies and create per-user policies
-- =============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trades', 'account_snapshots', 'portfolio_holdings', 'portfolio_snapshots',
    'journal_entries', 'tasks', 'macro_briefings', 'calendar_events',
    'telegram_messages', 'user_profile', 'habits', 'habit_completions', 'weekly_reviews'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_only" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "own_data" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "own_data" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t
      );
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- STEP 5 — Create user_profiles table (new, separate from legacy user_profile)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT        NOT NULL DEFAULT 'Trader',
  avatar_color TEXT        NOT NULL DEFAULT '#4D8FFF',
  timezone     TEXT        NOT NULL DEFAULT 'Europe/Vienna',
  currency     TEXT        NOT NULL DEFAULT 'EUR',
  created_at   TIMESTAMPTZ          DEFAULT now(),
  updated_at   TIMESTAMPTZ          DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_profile" ON user_profiles;
CREATE POLICY "own_profile" ON user_profiles
  FOR ALL
  USING     (auth.uid() = id)
  WITH CHECK (auth.uid() = id);


-- =============================================================================
-- STEP 6 — Auto-create a profile row whenever a new user signs up
-- =============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_profiles (id)
  VALUES (NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- VERIFY — Check RLS is enabled on all tables
-- =============================================================================

SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
