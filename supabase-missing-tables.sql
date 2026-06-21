-- ─────────────────────────────────────────────────────────────────────────────
-- Jarvis OS — Missing tables: habits, habit_completions, weekly_reviews
-- Supabase Dashboard → SQL Editor → New query → paste all → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- ── habits ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name         TEXT        NOT NULL,
  icon         TEXT        NOT NULL DEFAULT '📌',
  category     TEXT        NOT NULL DEFAULT 'general',
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0
);

-- ── habit_completions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habit_completions (
  id              UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  habit_id        UUID  REFERENCES habits(id) ON DELETE CASCADE NOT NULL,
  user_id         UUID  REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date  DATE  NOT NULL,
  UNIQUE (habit_id, completed_date, user_id)
);

-- ── weekly_reviews ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_reviews (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start        DATE        NOT NULL,
  overall_mood      TEXT,
  energy_level      INTEGER,
  wins              TEXT,
  losses            TEXT,
  lessons           TEXT,
  next_week_goals   TEXT,
  trading_grade     TEXT,
  life_grade        TEXT,
  ai_analysis       TEXT,
  tags              TEXT[],
  UNIQUE (user_id, week_start)
);

-- ── RLS on new tables ────────────────────────────────────────────────────────
ALTER TABLE habits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_reviews     ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_only" ON habits;
DROP POLICY IF EXISTS "authenticated_only" ON habit_completions;
DROP POLICY IF EXISTS "authenticated_only" ON weekly_reviews;

CREATE POLICY "authenticated_only" ON habits
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_only" ON habit_completions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_only" ON weekly_reviews
  FOR ALL USING (auth.role() = 'authenticated');

-- ── Enable Realtime on trades (fixes live sync in TradingTab) ────────────────
-- Run this AFTER creating the tables above.
-- Then go to Supabase Dashboard → Database → Replication → add 'trades' to
-- the supabase_realtime publication if it's not already there.
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE habits;
ALTER PUBLICATION supabase_realtime ADD TABLE habit_completions;
ALTER PUBLICATION supabase_realtime ADD TABLE weekly_reviews;

-- Verify
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('trades','habits','habit_completions','weekly_reviews')
ORDER BY tablename;
