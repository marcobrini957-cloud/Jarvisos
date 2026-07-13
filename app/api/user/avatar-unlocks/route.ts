import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import { getAuthUser } from '@/lib/api/auth'

export async function GET() {
  try {
    const supabase = await createClient()
    const user = await getAuthUser()
    if (!user) return NextResponse.json({ unlocked: [] })

    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const BE = 10

    const [tradesRes, journalRes] = await Promise.all([
      supabase
        .from('trades')
        .select('net_profit, close_time, status')
        .eq('user_id', user.id)
        .eq('status', 'closed')
        .neq('symbol', 'BALANCE')
        .order('close_time', { ascending: false }),
      supabase
        .from('journal_entries')
        .select('entry_date')
        .eq('user_id', user.id)
        .order('entry_date', { ascending: false })
        .limit(14),
    ])

    const trades = tradesRes.data ?? []

    // Total trade count
    const totalTrades = trades.length

    // Win rate (min 50 trades)
    const wins   = trades.filter(t => (t.net_profit ?? 0) >  BE).length
    const losses = trades.filter(t => (t.net_profit ?? 0) < -BE).length
    const winRate = totalTrades > 0 ? wins / totalTrades : 0

    // Monthly P&L
    const monthlyPnl = trades
      .filter(t => t.close_time && t.close_time >= since30)
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)

    // Best single day P&L
    const dayMap = new Map<string, number>()
    for (const t of trades) {
      if (!t.close_time) continue
      const day = t.close_time.split('T')[0]
      dayMap.set(day, (dayMap.get(day) ?? 0) + (t.net_profit ?? 0))
    }
    const bestDay = Math.max(0, ...Array.from(dayMap.values()))

    // Current win streak (wins + BEs in a row, no real loss)
    let winStreak = 0
    for (const t of trades) {
      if ((t.net_profit ?? 0) < -BE) break
      winStreak++
    }

    // Journal streak
    const entries = journalRes.data ?? []
    let journalStreak = 0
    const d = new Date()
    for (let i = 0; i < 14; i++) {
      const key = d.toISOString().split('T')[0]
      if (entries.some(e => e.entry_date === key)) { journalStreak++; d.setDate(d.getDate() - 1) }
      else break
    }

    const unlocked: string[] = []
    if (winStreak   >= 5)   unlocked.push('🔥')
    if (monthlyPnl  >= 500) unlocked.push('💎')
    if (totalTrades >= 100) unlocked.push('👑')
    if (winRate     >= 0.65 && totalTrades >= 50) unlocked.push('🏆')
    if (bestDay     >= 200) unlocked.push('🚀')
    if (journalStreak >= 7) unlocked.push('🌟')

    return NextResponse.json({ unlocked })
  } catch {
    return NextResponse.json({ unlocked: [] })
  }
}
