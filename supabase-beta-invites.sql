-- Private beta invites.
--
-- The site sits behind one shared SITE_PASSWORD while it is being built. That
-- is fine for one person and useless for a beta: everyone holds the same
-- secret, nobody can be let go individually, and there is no way to tell who
-- actually showed up. This gives each beta tester a code of their own.
--
-- A code does three things: it opens the curtain, it identifies who came in,
-- and it decides what plan they land on. Admin-only — no user ever reads this
-- table, so RLS is on with no policies and only the service role touches it.

create table if not exists public.beta_invites (
  -- Uppercase and human-dictatable: these get sent over WhatsApp.
  code            text primary key,
  -- Marco's label for the person, e.g. 'Alex'. Not an email: at the point the
  -- code is created there may not be one yet.
  name            text not null,
  note            text,

  created_at      timestamptz not null default now(),

  -- Set the first time the code opens the gate.
  first_used_at   timestamptz,
  -- Refreshed on every gate pass, so a code that was never used is obvious.
  last_seen_at    timestamptz,
  use_count       integer not null default 0,

  -- Set when a signed-up account claims the code. One code, one account.
  redeemed_at     timestamptz,
  redeemed_by     uuid,
  redeemed_email  text,

  -- Revoking stops future redemptions and bans the linked account if there is
  -- one. It cannot retract a cookie already in someone's browser — see
  -- lib/api/site-lock.ts for why that trade is deliberate.
  revoked_at      timestamptz,

  -- What the holder lands on when they sign up. Kept per-code so a single
  -- tester can be given something different without a deploy.
  grant_tier      text not null default 'pro'
                  check (grant_tier in ('free', 'pro', 'ultra')),
  grant_days      integer not null default 90
);

create index if not exists beta_invites_redeemed_by_idx
  on public.beta_invites (redeemed_by);

-- One account cannot claim two codes.
create unique index if not exists beta_invites_redeemed_by_uniq
  on public.beta_invites (redeemed_by) where redeemed_by is not null;

alter table public.beta_invites enable row level security;
-- No policies on purpose: every read and write goes through the service role
-- behind the /dev password. A leaked anon key must not enumerate the beta.
