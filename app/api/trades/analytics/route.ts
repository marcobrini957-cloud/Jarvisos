import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Returns session breakdown + symbol breakdown for analytics charts
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: trades, error } = await supabase
    .from('trades')
    .select('symbol, session, net_profit, pips, trade_type, close_time, lot_size')
    .eq('user_id', user.id)
    .eq('status', 'closed')
    .order('close_time', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!trades?.length) return NextResponse.json({ sessions: [], symbols: [], directions: [] })

  // ── Session breakdown ──────────────────────────────────────────────────────
  const sessionMap = new Map<string, { wins: number; losses: number; be: number; pnl: number; pips: number }>()
  for (const t of trades) {
    const s = t.session ?? 'unknown'
    const cur = sessionMap.get(s) ?? { wins: 0, losses: 0, be: 0, pnl: 0, pips: 0 }
    const p = t.net_profit ?? 0
    if (p > 0.5)       cur.wins++
    else if (p < -0.5) cur.losses++
    else               cur.be++
    cur.pnl  += p
    cur.pips += t.pips ?? 0
    sessionMap.set(s, cur)
  }
  const sessions = Array.from(sessionMap.entries()).map(([name, v]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    key:  name,
    wins:   v.wins,
    losses: v.losses,
    be:     v.be,
    total:  v.wins + v.losses + v.be,
    pnl:    parseFloat(v.pnl.toFixed(2)),
    pips:   parseFloat(v.pips.toFixed(1)),
    wr:     v.wins + v.losses > 0 ? parseFloat((v.wins / (v.wins + v.losses) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.total - a.total)

  // ── Symbol breakdown ───────────────────────────────────────────────────────
  const symMap = new Map<string, { wins: number; losses: number; be: number; pnl: number; pips: number }>()
  for (const t of trades) {
    const s = t.symbol ?? 'UNKNOWN'
    const cur = symMap.get(s) ?? { wins: 0, losses: 0, be: 0, pnl: 0, pips: 0 }
    const p = t.net_profit ?? 0
    if (p > 0.5)       cur.wins++
    else if (p < -0.5) cur.losses++
    else               cur.be++
    cur.pnl  += p
    cur.pips += t.pips ?? 0
    symMap.set(s, cur)
  }
  const symbols = Array.from(symMap.entries()).map(([sym, v]) => ({
    symbol: sym,
    wins:   v.wins,
    losses: v.losses,
    total:  v.wins + v.losses + v.be,
    pnl:    parseFloat(v.pnl.toFixed(2)),
    pips:   parseFloat(v.pips.toFixed(1)),
    wr:     v.wins + v.losses > 0 ? parseFloat((v.wins / (v.wins + v.losses) * 100).toFixed(1)) : 0,
  })).sort((a, b) => b.total - a.total).slice(0, 10)

  // ── Buy vs Sell ────────────────────────────────────────────────────────────
  const dirMap = new Map<string, { wins: number; losses: number; pnl: number }>()
  for (const t of trades) {
    const d = t.trade_type ?? 'unknown'
    const cur = dirMap.get(d) ?? { wins: 0, losses: 0, pnl: 0 }
    const p = t.net_profit ?? 0
    if (p > 0.5)       cur.wins++
    else if (p < -0.5) cur.losses++
    cur.pnl += p
    dirMap.set(d, cur)
  }
  const directions = Array.from(dirMap.entries()).map(([dir, v]) => ({
    dir,
    wins:   v.wins,
    losses: v.losses,
    total:  v.wins + v.losses,
    pnl:    parseFloat(v.pnl.toFixed(2)),
    wr:     v.wins + v.losses > 0 ? parseFloat((v.wins / (v.wins + v.losses) * 100).toFixed(1)) : 0,
  }))

  return NextResponse.json({ sessions, symbols, directions })
}
