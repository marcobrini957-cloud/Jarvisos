import { createClient } from '@supabase/supabase-js'

/**
 * The owner account cannot be banned.
 *
 * On 2026-08-01 it banned itself. A beta invite had been redeemed with the owner
 * account while testing the signup flow, and revoking an invite runs
 * `update user_profiles set banned = true where id = redeemed_by`. The bridge
 * answered 403 `account_banned` to every sync for 19 hours; the dashboard just
 * rendered empty. Nothing said "banned" anywhere a person would look — the
 * revoke path writes no `banned_reason`, no `banned_at`, and logs itself as
 * `beta_invite_revoked` rather than as a ban.
 *
 * There are two layers now, because one is not enough for something that takes
 * the whole product down:
 *   · this check, so an admin action fails loudly and says why, and
 *   · a database trigger (`supabase-owner-guard.sql`), which un-bans the owner
 *     no matter what writes the row — including SQL run by hand.
 *
 * The flag lives in the database rather than an env var or a constant: the repo
 * is public, so it must not carry the address, and a guard that depends on a
 * variable being set is a guard that is off the day someone forgets.
 */
export async function isOwner(userId: string): Promise<boolean> {
  if (!userId) return false
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await sb
    .from('user_profiles')
    .select('is_owner')
    .eq('id', userId)
    .maybeSingle()
  return data?.is_owner === true
}

/** The message every ban path gives back when the target is the owner. */
export const OWNER_BAN_REFUSED =
  'That is the owner account — it cannot be banned. Banning it would lock you out ' +
  'of your own dashboard and stop MT5 sync, which is exactly what happened on 2026-08-01.'
