import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

// Platform-wide counters for the Partners hero.
//
// These are the real rows in the database, not a time-derived animation. The
// odometer that used to sit there counted "412,000,000 real-money orders
// executed" at 11/second — a number nobody could stand behind, on a page whose
// links earn commission. If a figure is shown as fact it has to be countable,
// so this endpoint counts it.
//
// Aggregate across all users (no per-user scoping) — hence head+count only,
// which returns no row data.
export interface PlatformStats {
  orders:    number   // closed positions synced from MT5 (balance ops excluded)
  mirrored:  number   // copy-engine executions
  accounts:  number   // distinct MT5 logins that have ever synced
  syncs:     number   // account snapshots written by the bridge
}

export async function GET() {
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const [orders, mirrored, syncs] = await Promise.all([
    supabase.from('trades').select('*', { count: 'exact', head: true }).neq('symbol', 'BALANCE'),
    supabase.from('copy_log').select('*', { count: 'exact', head: true }),
    supabase.from('account_snapshots').select('*', { count: 'exact', head: true }),
  ])

  // Distinct logins needs rows; the column is small and the table is bounded by
  // snapshot volume, so pull only the newest slice and dedupe.
  const { data: logins } = await supabase
    .from('account_snapshots')
    .select('mt5_login')
    .not('mt5_login', 'is', null)
    .order('snapshot_at', { ascending: false })
    .limit(5000)

  const stats: PlatformStats = {
    orders:   orders.count   ?? 0,
    mirrored: mirrored.count ?? 0,
    syncs:    syncs.count    ?? 0,
    accounts: new Set((logins ?? []).map(r => r.mt5_login)).size,
  }

  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'private, max-age=60' },
  })
}
