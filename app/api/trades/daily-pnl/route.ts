import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'
import { BE_THRESHOLD } from '@/lib/trading/stats'

// Returns daily P&L for bar chart (last 60 days of closed trades)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const days = Math.min(parseInt(searchParams.get('days') ?? '60', 10), 365)

  const supabase = await createClient()
  const user = await getAuthUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const since = new Date(Date.now() - days * 86_400_000).toISOString()

  const { data, error } = await supabase
    .from('trades')
    .select('net_profit, close_time, symbol')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    // Deposits and withdrawals ride in the trades table as symbol='BALANCE'.
    // They are funding, not performance — counting them here once turned a
    // +€109.84 trading month into a +€359.18 "profit" (a €249.34 deposit).
    .neq('symbol', 'BALANCE')
    .gte('close_time', since)
    .order('close_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ bars: [] })

  // Group by day. Break-evens (|P&L| <= BE_THRESHOLD) count as neither a win
  // nor a loss, matching how the rest of the app decides win rate.
  const byDay = new Map<string, { date: string; pnl: number; wins: number; losses: number; breakEven: number }>()
  for (const t of data) {
    const d = t.close_time.slice(0, 10)
    const existing = byDay.get(d) ?? { date: d, pnl: 0, wins: 0, losses: 0, breakEven: 0 }
    const pnl = t.net_profit ?? 0
    existing.pnl += pnl
    if      (pnl >  BE_THRESHOLD) existing.wins      += 1
    else if (pnl < -BE_THRESHOLD) existing.losses    += 1
    else                          existing.breakEven += 1
    byDay.set(d, existing)
  }

  const bars = Array.from(byDay.values())
  return NextResponse.json({ bars })
}
