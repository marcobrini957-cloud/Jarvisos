-- Affiliate click tracking. One row per outbound partner click (via /api/go/[id]).
-- user_id is nullable: logged-out clicks (e.g. from a public offer link) still count.
CREATE TABLE IF NOT EXISTS partner_clicks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  user_id    UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  slot       TEXT,                        -- where it was clicked: 'tab' | 'rail' | 'ad'
  referer    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_partner ON partner_clicks (partner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_created ON partner_clicks (created_at DESC);

-- Writes happen only through the service-role key in /api/go/[id]; the table is
-- not exposed to end users. Enable RLS with no client policies (deny-by-default)
-- so anon/authenticated keys can never read or write it.
ALTER TABLE partner_clicks ENABLE ROW LEVEL SECURITY;
