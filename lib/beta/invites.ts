import { createClient as createServiceClient } from '@supabase/supabase-js'
import { normalizeBetaCode } from '@/lib/api/site-lock'

/**
 * Private beta invites — one code per person.
 *
 * A code is the whole onboarding contract in one string: it opens the site
 * lockdown, it records that a specific person showed up, and it decides which
 * plan their account lands on. Everything here runs with the service role;
 * nothing in this file is reachable by a signed-in user directly.
 */

export interface BetaInvite {
  code:           string
  name:           string
  note:           string | null
  created_at:     string
  first_used_at:  string | null
  last_seen_at:   string | null
  use_count:      number
  redeemed_at:    string | null
  redeemed_by:    string | null
  redeemed_email: string | null
  revoked_at:     string | null
  grant_tier:     'free' | 'pro' | 'ultra'
  grant_days:     number
}

function service() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/**
 * Codes read as `NAME-XXXX`: the name so Marco knows whose it is at a glance in
 * a WhatsApp thread, the suffix so they cannot be guessed from the name alone.
 * Ambiguous glyphs are left out — these get read aloud.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateCode(name: string): string {
  const stem = normalizeBetaCode(name).replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'BETA'
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  const suffix = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('')
  return `${stem}-${suffix}`
}

/**
 * Is this code good enough to open the curtain? Revoked codes fail; already
 * redeemed ones do not — the holder has to be able to come back tomorrow.
 */
export async function lookupInvite(raw: string): Promise<BetaInvite | null> {
  const code = normalizeBetaCode(raw)
  if (!code) return null
  const { data } = await service()
    .from('beta_invites')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (!data || data.revoked_at) return null
  return data as BetaInvite
}

/** Record that the code was used to get in. Best-effort: never block the gate. */
export async function markInviteSeen(code: string): Promise<void> {
  const now = new Date().toISOString()
  try {
    const db = service()
    const { data } = await db
      .from('beta_invites')
      .select('use_count, first_used_at')
      .eq('code', code)
      .maybeSingle()
    await db
      .from('beta_invites')
      .update({
        last_seen_at:  now,
        first_used_at: data?.first_used_at ?? now,
        use_count:     (data?.use_count ?? 0) + 1,
      })
      .eq('code', code)
  } catch {
    /* the gate is more important than the analytics */
  }
}

export interface ClaimResult {
  claimed: boolean
  tier?:   'free' | 'pro' | 'ultra'
  reason?: string
}

/**
 * Bind a signed-up account to the invite it arrived on and put it on the plan
 * the invite promises.
 *
 * Idempotent by design — it runs on the auth callback and again on the first
 * dashboard load, because no single hook catches every way in (email confirm,
 * password sign-in, Google). Re-running for the same user is a no-op.
 */
export async function claimInvite(
  userId: string,
  email: string | null,
  rawCode: string,
): Promise<ClaimResult> {
  const code = normalizeBetaCode(rawCode)
  if (!code) return { claimed: false, reason: 'no code' }

  const db = service()
  const { data: invite } = await db
    .from('beta_invites')
    .select('*')
    .eq('code', code)
    .maybeSingle()

  if (!invite)            return { claimed: false, reason: 'unknown code' }
  if (invite.revoked_at)  return { claimed: false, reason: 'revoked' }

  // Already settled for this user — nothing to do, and not an error.
  if (invite.redeemed_by === userId) return { claimed: true, tier: invite.grant_tier }

  // An invite is for someone who has not signed up yet. An account that already
  // existed when the code was created passes the gate with it but must not
  // spend it — otherwise Marco testing his own invite link burns the code he
  // was about to send, which is exactly what happened the first time he tried.
  const { data: account } = await db
    .from('user_profiles')
    .select('created_at')
    .eq('id', userId)
    .maybeSingle()
  if (account?.created_at && new Date(account.created_at) < new Date(invite.created_at)) {
    return { claimed: false, reason: 'account predates the invite' }
  }
  // Someone else got here first. The gate cookie is shared-able; the plan grant
  // is not.
  if (invite.redeemed_by)  return { claimed: false, reason: 'already redeemed' }

  // One account, one code: a user who already redeemed something else does not
  // get to stack another grant.
  const { data: existing } = await db
    .from('beta_invites')
    .select('code')
    .eq('redeemed_by', userId)
    .maybeSingle()
  if (existing) return { claimed: false, reason: 'account already on a code' }

  const expires = new Date(Date.now() + invite.grant_days * 24 * 60 * 60 * 1000).toISOString()

  // Claim the invite first. If the tier write fails we would rather have an
  // invite marked used and a plan to fix by hand than a code two people can
  // spend.
  const { error: claimErr } = await db
    .from('beta_invites')
    .update({ redeemed_at: new Date().toISOString(), redeemed_by: userId, redeemed_email: email })
    .eq('code', code)
    .is('redeemed_by', null)
  if (claimErr) return { claimed: false, reason: claimErr.message }

  // Never demote: Marco is ultra and must not be knocked down to pro by opening
  // his own invite link.
  const { data: profile } = await db
    .from('user_profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .maybeSingle()
  const rank = { free: 0, pro: 1, ultra: 2 } as const
  const current = (profile?.subscription_tier ?? 'free') as 'free' | 'pro' | 'ultra'
  if (rank[current] >= rank[invite.grant_tier as 'free' | 'pro' | 'ultra']) {
    return { claimed: true, tier: current }
  }

  await db
    .from('user_profiles')
    .update({ subscription_tier: invite.grant_tier, tier_expires_at: expires })
    .eq('id', userId)

  return { claimed: true, tier: invite.grant_tier }
}
