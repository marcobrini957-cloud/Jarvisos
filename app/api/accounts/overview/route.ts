import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

export interface AccountOverview {
  kind:      'primary' | 'copy'
  login:     number | null
  role:      'master' | 'slave' | null
  status:    'live' | 'stale' | 'offline'
  balance:   number | null
  equity:    number | null
  openCount: number
  broker:    string | null
  groupName: string | null
  lastSeen:  string | null
}

function liveness(lastSeen: string | null): 'live' | 'stale' | 'offline' {
  if (!lastSeen) return 'offline'
  const ageS = (Date.now() - new Date(lastSeen).getTime()) / 1000
  if (ageS < 60) return 'live'
  if (ageS < 600) return 'stale'
  return 'offline'
}

// All trading accounts for the account switcher: the primary (journal)
// account from its latest snapshot + every copy account with the live
// figures the bridge heartbeats onto copy_accounts.
export async function GET() {
  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [{ data: snap }, { data: profile }, { data: copyAccounts }] = await Promise.all([
    supabase
      .from('account_snapshots')
      .select('mt5_login, balance, equity, open_trades_count, snapshot_at')
      .eq('user_id', user.id)
      .order('snapshot_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('user_profiles')
      .select('ea_broker, ea_connected, ea_last_seen')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('copy_accounts')
      .select('mt5_login, role, status, balance, equity, open_trades_count, last_seen_at, copy_groups(name)')
      .eq('user_id', user.id)
      .order('role', { ascending: true }),
  ])

  const accounts: AccountOverview[] = []

  if (snap) {
    accounts.push({
      kind:      'primary',
      login:     snap.mt5_login,
      role:      null,
      status:    liveness(profile?.ea_last_seen ?? snap.snapshot_at),
      balance:   snap.balance,
      equity:    snap.equity,
      openCount: snap.open_trades_count ?? 0,
      broker:    profile?.ea_broker ?? null,
      groupName: null,
      lastSeen:  profile?.ea_last_seen ?? snap.snapshot_at,
    })
  }

  for (const acc of copyAccounts ?? []) {
    const login = acc.mt5_login ? Number(acc.mt5_login) : null
    const group = acc.copy_groups as unknown as { name: string } | { name: string }[] | null
    const groupName = (Array.isArray(group) ? group[0]?.name : group?.name) ?? null
    // The primary terminal doubles as copy master — don't list it twice,
    // just annotate the primary entry with its role.
    const primary = accounts.find(a => a.kind === 'primary' && a.login === login)
    if (primary) {
      primary.role = acc.role as 'master' | 'slave'
      primary.groupName = groupName
      continue
    }
    accounts.push({
      kind:      'copy',
      login,
      role:      acc.role as 'master' | 'slave',
      status:    liveness(acc.last_seen_at),
      balance:   acc.balance,
      equity:    acc.equity,
      openCount: acc.open_trades_count ?? 0,
      broker:    null,
      groupName,
      lastSeen:  acc.last_seen_at,
    })
  }

  return NextResponse.json({ accounts })
}
