-- =============================================================================
-- AI usage rate limiting — per user, per route, per UTC day.
-- Durable (survives serverless cold starts), atomic increment via RPC.
-- Table is service-role only (RLS on, no policy). Called by lib/api/aiRateLimit.
-- =============================================================================

create table if not exists public.ai_usage (
  user_id uuid not null,
  route   text not null,
  day     date not null default (now() at time zone 'utc')::date,
  count   int  not null default 0,
  primary key (user_id, route, day)
);

alter table public.ai_usage enable row level security;
-- no policy → only the service role (which bypasses RLS) can read/write

-- Atomically bump today's counter and report whether the caller is under cap.
-- Returns TRUE when allowed (count after increment <= cap), FALSE when over.
create or replace function public.bump_ai_usage(p_user uuid, p_route text, p_cap int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.ai_usage (user_id, route, day, count)
  values (p_user, p_route, (now() at time zone 'utc')::date, 1)
  on conflict (user_id, route, day)
  do update set count = ai_usage.count + 1
  returning count into v_count;
  return v_count <= p_cap;
end;
$$;
