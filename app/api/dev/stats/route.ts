import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isAuthed(req: NextRequest) {
  const secret = process.env.DEV_SECRET
  if (!secret) return false
  const cookie = req.cookies.get('__dev_session')
  return !!cookie?.value && cookie.value === secret
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const now = new Date()
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  const [
    { count: totalUsers },
    { count: onlineNow },
    { count: newToday },
    { count: newThisWeek },
    { count: totalTrades },
    { count: tradesToday },
    { count: usersWithMt5 },
    { count: usersWithTrades },
    { count: inactiveWeek },
    { count: neverConnected },
    { data: recentSignups },
    { data: tierRows },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('last_seen_at', ago(10 * 60 * 1000)),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('created_at', ago(24 * 60 * 60 * 1000)),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('created_at', ago(7 * 24 * 60 * 60 * 1000)),
    supabase.from('trades').select('*', { count: 'exact', head: true }),
    supabase.from('trades').select('*', { count: 'exact', head: true })
      .gt('created_at', ago(24 * 60 * 60 * 1000)),
    // Funnel: users who connected MT5 (have velquor_api_key or mt5_login)
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .not('mt5_login', 'is', null),
    // Funnel: users who have at least one trade
    supabase.from('trades').select('user_id').limit(1000).then(async ({ data }) => {
      const unique = new Set((data ?? []).map(r => r.user_id)).size
      return { count: unique }
    }),
    // At risk: haven't logged in for 7+ days (but registered before that)
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .lt('last_seen_at', ago(7 * 24 * 60 * 60 * 1000))
      .lt('created_at', ago(7 * 24 * 60 * 60 * 1000)),
    // Never connected: no mt5_login and older than 1 day
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .is('mt5_login', null)
      .lt('created_at', ago(24 * 60 * 60 * 1000)),
    // Recent signups
    supabase.from('user_profiles')
      .select('id, email, created_at, last_seen_at, subscription_tier, mt5_login')
      .order('created_at', { ascending: false })
      .limit(12),
    // Tier breakdown
    supabase.from('user_profiles')
      .select('subscription_tier'),
  ])

  // Tier counts
  const tiers = { free: 0, pro: 0, ultra: 0, unknown: 0 }
  for (const r of tierRows ?? []) {
    const t = (r.subscription_tier ?? 'free').toLowerCase()
    if (t in tiers) tiers[t as keyof typeof tiers]++
    else tiers.free++
  }

  // Bridge health
  let bridgeStatus = 'unknown'
  let bridgeConnections = 0
  const bridgeUrl = process.env.BRIDGE_URL
  if (bridgeUrl) {
    try {
      const res = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        bridgeStatus = 'online'
        const body = await res.json().catch(() => ({}))
        bridgeConnections = body.connections ?? 0
      } else {
        bridgeStatus = 'error'
      }
    } catch {
      bridgeStatus = 'offline'
    }
  } else {
    bridgeStatus = 'not_configured'
  }

  const total = totalUsers ?? 0
  const withMt5 = usersWithMt5 ?? 0
  const withTrades = usersWithTrades ?? 0

  // ── Suppliers ───────────────────────────────────────────────────────────────
  // The Settings panel used to name these to every user. Which services we buy
  // is our supply chain, not the customer's business, and it tells them nothing
  // about whether their app is working — so the vendor names live here instead,
  // where knowing that "prices are down" means "Yahoo is down" is actionable.
  // The console auto-refreshes every 30s. An uncached probe would therefore hit
  // each supplier 120 times an hour from one open tab — the calendar feed
  // already answers 429 to us, and hammering it would degrade the News tab for
  // real users. So the probe is cached for five minutes and sends the same
  // User-Agent the app does; a rate-limit answer is reported as its own state
  // rather than as an outage, because they mean different things.
  async function probe(url: string): Promise<'online' | 'rate_limited' | 'offline'> {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 300 },
      })
      clearTimeout(t)
      if (res.ok) return 'online'
      return res.status === 429 ? 'rate_limited' : 'offline'
    } catch {
      return 'offline'
    }
  }

  const [pricesStatus, calendarStatus] = await Promise.all([
    probe('https://query2.finance.yahoo.com/v8/finance/chart/AAPL?range=1d&interval=1d'),
    probe('https://nfs.faireconomy.media/ff_calendar_thisweek.json'),
  ])

  const integrations = [
    { name: 'Supabase',       role: 'Database · auth · screenshot storage',  status: 'online',
      note: 'bucket: trade-screenshots' },
    { name: 'Hetzner bridge', role: 'MT5 sync · copy trading · cloud terminals', status: bridgeStatus,
      note: process.env.BRIDGE_URL ?? 'BRIDGE_URL not set' },
    { name: 'Groq',           role: 'Analyst chat · Whisper dictation',
      status: process.env.GROQ_API_KEY?.startsWith('gsk_') ? 'online' : 'not_configured', note: 'llama-3.3-70b' },
    { name: 'Anthropic',      role: 'Coach notes · Trader DNA focus (paid tiers)',
      status: process.env.ANTHROPIC_API_KEY?.startsWith('sk-ant') ? 'online' : 'not_configured',
      note: 'claude-haiku-4-5 / claude-sonnet-4-6' },
    { name: 'Yahoo Finance',  role: 'Portfolio & metals prices · EUR/USD FX', status: pricesStatus,
      note: 'query2.finance.yahoo.com' },
    { name: 'Forex Factory',  role: 'Economic calendar (red folders)',        status: calendarStatus,
      note: 'nfs.faireconomy.media' },
  ]

  return NextResponse.json({
    totalUsers: total,
    onlineNow: onlineNow ?? 0,
    newToday: newToday ?? 0,
    newThisWeek: newThisWeek ?? 0,
    totalTrades: totalTrades ?? 0,
    tradesToday: tradesToday ?? 0,
    tiers,
    funnel: {
      signedUp: total,
      connectedMt5: withMt5,
      loggedTrade: withTrades,
      signedUpPct: 100,
      connectedPct: total > 0 ? Math.round((withMt5 / total) * 100) : 0,
      tradedPct: total > 0 ? Math.round((withTrades / total) * 100) : 0,
    },
    atRisk: {
      inactiveWeek: inactiveWeek ?? 0,
      neverConnected: neverConnected ?? 0,
    },
    recentSignups: recentSignups ?? [],
    bridgeStatus,
    bridgeConnections,
    supabaseStatus: 'online',
    integrations,
    serverTime: now.toISOString(),
    env: {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      groq: !!process.env.GROQ_API_KEY,
      bridge: !!process.env.BRIDGE_URL,
      devSecret: !!process.env.DEV_SECRET,
    },
  })
}
