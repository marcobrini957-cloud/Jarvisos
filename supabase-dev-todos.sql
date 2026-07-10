CREATE TABLE IF NOT EXISTS dev_todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  done BOOLEAN NOT NULL DEFAULT FALSE,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pre-seed with the full backlog
INSERT INTO dev_todos (title, category, done) VALUES
  ('Set up Cloudflare email routing → support@velquor.app forwards to Gmail', 'email', false),
  ('Configure Gmail Send As so replies show from support@velquor.app', 'email', false),
  ('Create Resend account + add API key to Vercel env vars', 'email', false),
  ('Build transactional email templates (welcome, weekly report, MT5 disconnect)', 'email', false),
  ('Create Stripe account + Free / Pro / Ultra products and prices', 'billing', false),
  ('Add subscription_tier + stripe_customer_id columns to user_profiles', 'billing', false),
  ('Build Stripe webhook handler → updates tier in Supabase on payment events', 'billing', false),
  ('Build feature gating middleware — block features by subscription tier', 'billing', false),
  ('Build billing portal page — users can upgrade, downgrade, cancel', 'billing', false),
  ('Run supabase-last-seen.sql migration (adds last_seen_at column)', 'infra', false),
  ('Add DEV_SECRET to Vercel environment variables', 'infra', true),
  ('Update EA (MQL5) — add MASTER / SLAVE mode for copy trading', 'copy-trading', false),
  ('Hetzner WebSocket server — add copy group routing (master → slaves)', 'copy-trading', false),
  ('Supabase schema — copy_groups + linked_accounts tables', 'copy-trading', false),
  ('Settings UI — let users designate master account and add slave accounts', 'copy-trading', false),
  ('Lot sizing config — fixed lots or % of balance per slave', 'copy-trading', false),
  ('Copy activity log in dashboard', 'copy-trading', false),
  ('Privacy Policy page', 'legal', false),
  ('Terms of Service page', 'legal', false),
  ('GDPR cookie consent banner (required in Austria)', 'legal', false),
  ('Set up PostHog — product analytics, see what users use inside the app', 'growth', false),
  ('Set up Sentry — error tracking before users report bugs', 'growth', false),
  ('Set up UptimeRobot — alerts if site or Hetzner goes down', 'growth', false),
  ('Connect Stripe to dev console revenue section', 'growth', false);
