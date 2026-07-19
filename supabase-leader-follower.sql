-- ── Copy-trading terminology migration: master/slave → leader/follower ────────
-- Paste into Supabase SQL editor and run once. Safe to re-run (each step is
-- guarded). Coordinated with site/bridge/EA code that expects the new names —
-- run this BEFORE deploying that code.

begin;

-- 1. copy_signals: master_* → leader_*
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'copy_signals' and column_name = 'master_account_id') then
    alter table copy_signals rename column master_account_id to leader_account_id;
    alter table copy_signals rename column master_ticket     to leader_ticket;
  end if;
end $$;

-- 2. copy_log: slave_* → follower_*
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_name = 'copy_log' and column_name = 'slave_account_id') then
    alter table copy_log rename column slave_account_id to follower_account_id;
    alter table copy_log rename column slave_ticket     to follower_ticket;
    alter table copy_log rename column slave_lots       to follower_lots;
  end if;
end $$;

-- 3. copy_accounts.role: drop old check, migrate values, add new check
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    where rel.relname = 'copy_accounts' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%role%'
  loop
    execute format('alter table copy_accounts drop constraint %I', c.conname);
  end loop;
end $$;

update copy_accounts set role = 'leader'   where role = 'master';
update copy_accounts set role = 'follower' where role = 'slave';

alter table copy_accounts
  add constraint copy_accounts_role_check check (role in ('leader','follower'));

-- 4. Rename any indexes that carry the old terms
do $$
declare i record;
begin
  for i in
    select indexname from pg_indexes
    where schemaname = 'public'
      and (indexname ilike '%master%' or indexname ilike '%slave%')
  loop
    execute format('alter index %I rename to %I', i.indexname,
      replace(replace(i.indexname, 'master', 'leader'), 'slave', 'follower'));
  end loop;
end $$;

-- 5. Data hygiene: user-visible text that carries the old terms
update copy_accounts set nickname = 'Follower acc' where nickname = 'slave acc';
update dev_todos set title = replace(replace(replace(replace(title,
  'MASTER', 'LEADER'), 'SLAVE', 'FOLLOWER'), 'master', 'leader'), 'slave', 'follower')
  where title ilike '%master%' or title ilike '%slave%';

commit;

-- PostgREST picks up renamed columns immediately on Supabase, but nudge it:
notify pgrst, 'reload schema';
