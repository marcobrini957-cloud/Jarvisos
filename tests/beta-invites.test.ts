import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The claim rules are the difference between a beta that works and one where
// codes quietly go missing. They only ever run against the live database, so
// these pin the decisions with the database faked out.

const rows: Record<string, unknown[]> = { beta_invites: [], user_profiles: [] }
let updates: { table: string; patch: Record<string, unknown> }[] = []

/**
 * A fake just smart enough to be honest.
 *
 * It has to distinguish the two different reads this module makes of
 * beta_invites — "find this code" and "does this user already hold one" — or
 * the second returns the first's row and the claim short-circuits for the wrong
 * reason. A mock that answers every query identically will pass a broken
 * implementation.
 */
function table(name: string) {
  let pending: Record<string, unknown> | null = null
  const filters: [string, unknown][] = []
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { filters.push([col, val]); return chain },
    is:  (col: string, val: unknown) => { filters.push([col, val]); return chain },
    update: (patch: Record<string, unknown>) => { pending = patch; return chain },
    maybeSingle: async () => {
      const byRedeemer = filters.some(([c]) => c === 'redeemed_by')
      // "has this account already spent a code?" — nothing seeded means no.
      if (name === 'beta_invites' && byRedeemer) return { data: null, error: null }
      return { data: rows[name][0] ?? null, error: null }
    },
  }
  // `update(...).eq(...)` is awaited directly, so the chain must be thenable.
  chain.then = (res: (v: unknown) => void) => {
    if (pending) updates.push({ table: name, patch: pending })
    res({ error: null })
  }
  return chain
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (t: string) => table(t) }),
}))

const { claimInvite } = await import('@/lib/beta/invites')

const NOW = '2026-07-31T12:00:00Z'
const OLD = '2026-07-14T09:00:00Z'

beforeEach(() => {
  updates = []
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service'
})
afterEach(() => { rows.beta_invites = []; rows.user_profiles = [] })

describe('claimInvite', () => {
  it('refuses an unknown code', async () => {
    rows.beta_invites = []
    expect(await claimInvite('u1', 'a@b.c', 'NOPE-1234')).toMatchObject({ claimed: false })
  })

  it('refuses a revoked code', async () => {
    rows.beta_invites = [{ code: 'A-1', created_at: NOW, revoked_at: NOW, grant_tier: 'pro', grant_days: 90 }]
    expect(await claimInvite('u1', 'a@b.c', 'A-1')).toMatchObject({ claimed: false, reason: 'revoked' })
  })

  it('is a no-op for the account that already holds it', async () => {
    rows.beta_invites = [{ code: 'A-1', created_at: NOW, revoked_at: null, redeemed_by: 'u1', grant_tier: 'pro', grant_days: 90 }]
    const r = await claimInvite('u1', 'a@b.c', 'A-1')
    expect(r).toMatchObject({ claimed: true, tier: 'pro' })
    expect(updates).toHaveLength(0)
  })

  it('does NOT let an account that predates the invite spend it', async () => {
    // Marco, signed in, clicking the link for a code he just made to test it.
    // This burned a real code the first time it happened.
    rows.beta_invites   = [{ code: 'A-1', created_at: NOW, revoked_at: null, redeemed_by: null, grant_tier: 'pro', grant_days: 90 }]
    rows.user_profiles  = [{ created_at: OLD, subscription_tier: 'ultra' }]

    const r = await claimInvite('marco', 'marco@x.com', 'A-1')

    expect(r).toMatchObject({ claimed: false, reason: 'account predates the invite' })
    expect(updates).toHaveLength(0)   // nothing written: the code stays fresh
  })

  it('still claims for an account created after the invite', async () => {
    rows.beta_invites  = [{ code: 'A-1', created_at: OLD, revoked_at: null, redeemed_by: null, grant_tier: 'pro', grant_days: 90 }]
    rows.user_profiles = [{ created_at: NOW, subscription_tier: 'free' }]

    const r = await claimInvite('newbie', 'new@x.com', 'A-1')

    expect(r).toMatchObject({ claimed: true, tier: 'pro' })
    expect(updates.some(u => u.table === 'beta_invites' && u.patch.redeemed_by === 'newbie')).toBe(true)
    expect(updates.some(u => u.table === 'user_profiles' && u.patch.subscription_tier === 'pro')).toBe(true)
  })
})
