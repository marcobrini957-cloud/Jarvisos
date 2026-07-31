-- Beta feedback.
--
-- Five testers with no way to report a bug is five testers who hit one, shrug,
-- and stop opening the app. The legal pages carry a support@velquor.app
-- address, which is not a channel anyone uses mid-session — this is a button
-- in the product that captures what they were looking at when it broke.

create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  created_at  timestamptz not null default now(),

  kind        text not null default 'bug'
              check (kind in ('bug', 'idea', 'confusing', 'praise')),
  message     text not null,

  -- Captured automatically, because a tester will not think to mention any of
  -- it and every one of these has cost a debugging session before.
  tab         text,           -- which dashboard tab was on screen
  path        text,           -- the URL
  user_agent  text,
  viewport    text,           -- "390x844" — mobile bugs read differently
  app_version text,           -- git sha of the deploy they were on

  -- Marco's side.
  status      text not null default 'new'
              check (status in ('new', 'triaged', 'done', 'wontfix')),
  admin_note  text
);

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx  on public.feedback (status);

alter table public.feedback enable row level security;

-- Users may file their own and read their own back; nobody can read anyone
-- else's, and nobody can edit one after the fact. Everything Marco does goes
-- through the service role behind the /dev password.
drop policy if exists feedback_insert_own on public.feedback;
create policy feedback_insert_own on public.feedback
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists feedback_select_own on public.feedback;
create policy feedback_select_own on public.feedback
  for select to authenticated using (auth.uid() = user_id);
