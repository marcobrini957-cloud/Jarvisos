import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get('__dev_session')
  return cookie?.value === process.env.DEV_SECRET
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

  const [
    { count: totalUsers },
    { count: onlineNow },
    { count: newToday },
    { count: newThisWeek },
    { count: totalTrades },
    { count: tradesToday },
    { data: recentSignups },
    { data: recentTrades },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('last_seen_at', new Date(now.getTime() - 10 * 60 * 1000).toISOString()),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('trades').select('*', { count: 'exact', head: true }),
    supabase.from('trades').select('*', { count: 'exact', head: true })
      .gt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    supabase.from('user_profiles')
      .select('id, email, created_at, last_seen_at, subscription_tier')
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('trades')
      .select('id, symbol, net_profit, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  // Check bridge health
  let bridgeStatus = 'unknown'
  const bridgeUrl = process.env.BRIDGE_URL
  if (bridgeUrl) {
    try {
      const res = await fetch(`${bridgeUrl}/health`, { signal: AbortSignal.timeout(3000) })
      bridgeStatus = res.ok ? 'online' : 'error'
    } catch {
      bridgeStatus = 'offline'
    }
  } else {
    bridgeStatus = 'not_configured'
  }

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    onlineNow: onlineNow ?? 0,
    newToday: newToday ?? 0,
    newThisWeek: newThisWeek ?? 0,
    totalTrades: totalTrades ?? 0,
    tradesToday: tradesToday ?? 0,
    recentSignups: recentSignups ?? [],
    recentTrades: recentTrades ?? [],
    bridgeStatus,
    supabaseStatus: 'online',
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
