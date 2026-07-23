-- =============================================================================
-- VELQUOR — RLS HARDENING (pre-external-user launch)
-- =============================================================================
-- Idempotent. Safe to run repeatedly. Goal: guarantee every user-owned table is
-- isolated by auth.uid(), remove the permissive "authenticated_only" policy that
-- (if it still exists) lets any logged-in user read/write EVERY row, and enable
-- RLS on the copy-trading tables that currently have none.
--
-- The VELQUOR bridge writes with the SERVICE ROLE key, which BYPASSES RLS — so
-- none of this affects EA sync, copy signals, or the admin console. It only
-- constrains what a browser (anon/authenticated key) can see.
--
-- Run in: Supabase → SQL Editor. Then run the VERIFY block at the bottom.
-- =============================================================================


-- ── 1. User-owned tables keyed by `user_id` ──────────────────────────────────
-- Drop the dangerous permissive policy + any duplicate, re-assert own_data only.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'trades', 'account_snapshots', 'portfolio_holdings', 'portfolio_snapshots',
    'journal_entries', 'tasks', 'macro_briefings', 'calendar_events',
    'telegram_messages', 'habits', 'habit_completions', 'weekly_reviews'
  ] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_only" ON %I', t);
      EXECUTE format('DROP POLICY IF EXISTS "own_data" ON %I', t);
      EXECUTE format(
        'CREATE POLICY "own_data" ON %I FOR ALL '
        'USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    END IF;
  END LOOP;
END $$;


-- ── 2. user_profiles — keyed by `id` (the row IS the user) ───────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "authenticated_only" ON user_profiles;
    DROP POLICY IF EXISTS "own_profile" ON user_profiles;
    CREATE POLICY "own_profile" ON user_profiles FOR ALL
      USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
  END IF;
END $$;


-- ── 3. Copy-trading tables — currently NO RLS. Close the hole. ───────────────
-- Bridge (service role) bypasses all of this; these policies only scope the
-- browser. copy_signals/copy_log are inserted by the bridge, so end users only
-- ever READ them — restrictive membership policies are correct.
DO $$
BEGIN
  -- copy_groups: owner sees their own groups
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='copy_groups') THEN
    ALTER TABLE copy_groups ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "own_groups" ON copy_groups;
    CREATE POLICY "own_groups" ON copy_groups FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- copy_accounts: owner sees their own accounts
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='copy_accounts') THEN
    ALTER TABLE copy_accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "own_copy_accounts" ON copy_accounts;
    CREATE POLICY "own_copy_accounts" ON copy_accounts FOR ALL
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;

  -- copy_signals: readable by any member of the signal's group
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='copy_signals') THEN
    ALTER TABLE copy_signals ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "group_member_read_signals" ON copy_signals;
    CREATE POLICY "group_member_read_signals" ON copy_signals FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM copy_accounts ca
        WHERE ca.group_id = copy_signals.group_id AND ca.user_id = auth.uid()
      ));
  END IF;

  -- copy_log: readable by the follower account's owner
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='copy_log') THEN
    ALTER TABLE copy_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "owner_read_copy_log" ON copy_log;
    CREATE POLICY "owner_read_copy_log" ON copy_log FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM copy_accounts ca
        WHERE ca.id = copy_log.follower_account_id AND ca.user_id = auth.uid()
      ));
  END IF;
END $$;


-- ── 4. dev_todos / admin_audit_log — must NOT be readable by normal users ────
-- These have no user scoping; lock them to service-role only by enabling RLS
-- with no permissive policy (admin console reads them via service role).
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['dev_todos', 'admin_audit_log'] LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t) THEN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS "authenticated_only" ON %I', t);
      -- no policy = deny all for anon/authenticated; service role still bypasses
    END IF;
  END LOOP;
END $$;


-- =============================================================================
-- VERIFY — run this AFTER the above and eyeball the output.
-- Every user table should show exactly ONE policy whose qual references
-- `user_id` (or `id` for user_profiles). If you see `auth.role()` or a policy
-- named `authenticated_only`, the leak is still live.
-- =============================================================================
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
--
-- And confirm RLS is actually ON everywhere (rowsecurity = true):
-- SELECT tablename, rowsecurity, forcerowsecurity
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
