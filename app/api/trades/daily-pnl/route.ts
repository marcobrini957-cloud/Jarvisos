import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthUser } from '@/lib/api/auth'

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
    .select('net_profit, close_time')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .gte('close_time', since)
    .order('close_time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data?.length) return NextResponse.json({ bars: [] })

  // Group by day
  const byDay = new Map<string, { date: string; pnl: number; wins: number; losses: number }>()
  for (const t of data) {
    const d = t.close_time.slice(0, 10)
    const existing = byDay.get(d) ?? { date: d, pnl: 0, wins: 0, losses: 0 }
    existing.pnl    += t.net_profit ?? 0
    if ((t.net_profit ?? 0) >= 0) existing.wins   += 1
    else                          existing.losses  += 1
    byDay.set(d, existing)
  }

  const bars = Array.from(byDay.values())
  return NextResponse.json({ bars })
}
