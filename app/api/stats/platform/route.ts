import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

// Platform-wide counters for the Partners hero.
//
// This is Velquor's own database — no partner API, no external feed. Every
// figure is a row count in our own tables, filled by our own pipeline:
// MT5 terminal → VelquorBridge EA → bridge.velquor.app → Supabase.
//
// It exists because the odometer that used to sit in the hero counted
// "412,000,000 real-money orders executed" at 11/second from a hardcoded base.
// If a number is shown as fact on a page whose links earn commission, it has to
// be countable — so this counts it.
//
// Aggregate across all users (deliberately not user-scoped), hence head+count.
export interface PlatformStats {
  /** Closed positions synced from MT5. Excludes deposits/withdrawals, which
      arrive as `symbol = 'BALANCE'` rows and are not orders. */
  orders:   number
  /** Copy-engine executions — one row per signal delivered to a follower. */
  mirrored: number
  /** Distinct MT5 logins that have either traded or are wired as copy
      accounts. Snapshot rows are not used for this: followers heartbeat onto
      copy_accounts, so counting snapshot logins alone reported 1. */
  accounts: number
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const [orders, mirrored, tradeLogins, copyLogins] = await Promise.all([
    supabase.from('trades').select('*', { count: 'exact', head: true }).neq('symbol', 'BALANCE'),
    supabase.from('copy_log').select('*', { count: 'exact', head: true }),
    // Both of these are small, bounded tables — no need for a distinct-count
    // round trip the JS client cannot express anyway.
    supabase.from('trades').select('mt5_login').not('mt5_login', 'is', null),
    supabase.from('copy_accounts').select('mt5_login').not('mt5_login', 'is', null),
  ])

  const logins = new Set<string>()
  for (const r of tradeLogins.data ?? []) logins.add(String(r.mt5_login))
  for (const r of copyLogins.data  ?? []) logins.add(String(r.mt5_login))

  const stats: PlatformStats = {
    orders:   orders.count   ?? 0,
    mirrored: mirrored.count ?? 0,
    accounts: logins.size,
  }

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
