-- Owner guard.
--
-- On 2026-08-01 the owner account locked itself out of its own product. A beta
-- invite had been redeemed with it while testing the signup flow; revoking that
-- invite runs `update user_profiles set banned = true where id = redeemed_by`,
-- and the owner was the redeemer. The bridge answered 403 account_banned to
-- every sync for 19 hours and the dashboard rendered empty, with no ban reason,
-- no banned_at and nothing in the audit log naming a ban.
--
-- `is_owner` is a flag no admin action may ban. It lives in the database rather
-- than in an env var or a constant so the repo — which is public — never carries
-- the address, and so the guard cannot be defeated by a missing variable.
--
-- Already applied to production 2026-08-01.

alter table user_profiles
  add column if not exists is_owner boolean not null default false;

comment on column user_profiles.is_owner is
  'Cannot be banned by any admin path (see lib/api/owner.ts). Set by hand in SQL only.';

-- Set the owner. Re-running is safe.
update user_profiles set is_owner = true where email = 'marcobrini957@gmail.com';

-- Belt and braces: an owner can never be left banned, whatever writes the row.
create or replace function fn_owner_never_banned()
returns trigger language plpgsql as $$
begin
  if new.is_owner and new.banned then
    new.banned        := false;
    new.banned_at     := null;
    new.banned_reason := null;
    raise warning 'refused to ban owner account %', new.email;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_owner_never_banned on user_profiles;
create trigger trg_owner_never_banned
  before insert or update on user_profiles
  for each row execute function fn_owner_never_banned();
