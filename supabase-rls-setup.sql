-- ─────────────────────────────────────────────────────────────────────────────
-- Jarvis OS — Row Level Security
-- Supabase Dashboard → SQL Editor → New query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on every table (IF EXISTS so it won't error on missing tables)
ALTER TABLE IF EXISTS trades                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS account_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolio_holdings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS portfolio_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS journal_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS macro_briefings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS calendar_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS telegram_messages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profile          ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS habits                ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS habit_completions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS weekly_reviews        ENABLE ROW LEVEL SECURITY;

-- Create "authenticated only" policy on every table that exists.
-- Any logged-in Supabase user can read/write all rows.
-- Since you are the sole user and middleware blocks unauthenticated access,
-- this is the correct security level.
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
      EXECUTE format(
        'CREATE POLICY "authenticated_only" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t
      );
    END IF;
  END LOOP;
END $$;

-- Verify — every table listed above should show rowsecurity = true
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
