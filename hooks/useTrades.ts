'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types'

interface TradeStats {
  monthPnl:        number
  weekPnl:         number
  winRate:         number
  totalTrades:     number
  avgRR:           number
  maxDrawdown:     number
  xauWinRate:      number
  nasWinRate:      number
  londonWinRate:   number
  nyWinRate:       number
  weeklyPnl:       number[]   // last 7 weeks
  // Professional metrics
  profitFactor:    number     // gross wins / gross losses (99 = no losses)
  expectancy:      number     // EUR expected value per trade
  avgWin:          number     // average EUR per winning trade
  avgLoss:         number     // average absolute EUR per losing trade
  maxConsecWins:   number
  maxConsecLosses: number
}

// Break-even threshold: trades within ±€10 of zero are considered break-even.
export const BE_THRESHOLD = 10

export function tradeResult(pnl: number): 'win' | 'breakeven' | 'loss' {
  if (pnl > BE_THRESHOLD)  return 'win'
  if (pnl < -BE_THRESHOLD) return 'loss'
  return 'breakeven'
}

// A real trade has a real symbol (not the 'BALANCE' sentinel) and lot_size > 0.
function isRealTrade(t: Trade) {
  return t.symbol !== 'BALANCE' && !!t.symbol && (t.lot_size ?? 0) > 0
}

export function useTrades(limit = 50) {
  const [trades,        setTrades]        = useState<Trade[]>([])
  const [allRows,       setAllRows]       = useState<Trade[]>([])
  const [openPositions, setOpenPositions] = useState<Trade[]>([])
  const [stats,         setStats]         = useState<TradeStats | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const initialized = useRef(false)

  const load = useCallback(async () => {
    // Only show loading spinner on the very first fetch.
    // Background refreshes (poll, realtime, mt5-synced) update silently.
    if (!initialized.current) setLoading(true)
    try {
      const supabase = createClient()

      // Fetch closed rows + open positions in parallel
      const [closedRes, openRes] = await Promise.all([
        supabase
          .from('trades')
          .select('*')
          .eq('status', 'closed')
          .order('close_time', { ascending: false })
          .limit(limit),
        supabase
          .from('trades')
          .select('*')
          .eq('status', 'open')
          .order('open_time', { ascending: false }),
      ])

      if (closedRes.error) throw closedRes.error

      const rows = (closedRes.data ?? []) as Trade[]
      setTrades(rows.filter(isRealTrade))
      setAllRows(rows)
      setStats(computeStats(rows))
      setOpenPositions((openRes.data ?? []).filter(isRealTrade) as Trade[])
      initialized.current = true
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load() }, [load])

  // Realtime subscription — instantly reflects any DB insert/update on the trades table
  useEffect(() => {
    const supabase = createClient()
    const channel  = supabase
      .channel('trades-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => {
        load()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [load])

  // Also reload on manual mt5-synced event (belt-and-suspenders)
  useEffect(() => {
    const handler = () => load()
    window.addEventListener('mt5-synced', handler)
    return () => window.removeEventListener('mt5-synced', handler)
  }, [load])

  return { trades, allRows, openPositions, stats, loading, error, reload: load }
}

function computeStats(allRows: Trade[]): TradeStats {
  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Real trades only — used for all stats (P&L, win-rate, R:R, symbol/session)
  // Balance ops (withdrawals/deposits) are intentionally excluded from P&L.
  const realClosed = allRows.filter(t => t.status === 'closed' && t.net_profit !== null && isRealTrade(t))

  // P&L — real trades ONLY (withdrawals do not affect trading P&L)
  const monthly  = realClosed.filter(t => t.close_time && new Date(t.close_time) >= monthStart)
  const weekly   = realClosed.filter(t => t.close_time && new Date(t.close_time) >= weekStart)
  const monthPnl = monthly.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const weekPnl  = weekly.reduce((s,  t) => s + (t.net_profit ?? 0), 0)

  // Win rate — wins/losses only, break-even trades excluded from denominator
  const wins      = realClosed.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses    = realClosed.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const decisive  = wins.length + losses.length
  const winRate   = decisive > 0 ? (wins.length / decisive) * 100 : 0

  // Professional metrics
  const grossWins    = wins.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const grossLosses  = Math.abs(losses.reduce((s, t) => s + (t.net_profit ?? 0), 0))
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 99 : 0
  const avgWin       = wins.length   > 0 ? grossWins   / wins.length   : 0
  const avgLoss      = losses.length > 0 ? grossLosses / losses.length : 0
  const wr100        = decisive > 0 ? wins.length   / decisive : 0
  const lr100        = decisive > 0 ? losses.length / decisive : 0
  const expectancy   = wr100 * avgWin - lr100 * avgLoss

  // Max consecutive wins/losses (needs chronological order)
  const chrono = [...realClosed].sort((a, b) =>
    (a.close_time ?? '').localeCompare(b.close_time ?? ''))
  let maxConsecWins = 0, maxConsecLosses = 0, curW = 0, curL = 0
  for (const t of chrono) {
    const r = tradeResult(t.net_profit ?? 0)
    if (r === 'win')  { curW++; curL = 0; if (curW > maxConsecWins)   maxConsecWins   = curW }
    if (r === 'loss') { curL++; curW = 0; if (curL > maxConsecLosses) maxConsecLosses = curL }
    // breakeven: preserve both streaks
  }

  // Avg Realized R:R — actual exit vs entry, measured in units of initial risk (entry → SL)
  // Requires SL, open price, close price. No TP needed — reflects what actually happened.
  const rrTrades = realClosed.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  const avgRR    = rrTrades.length > 0
    ? rrTrades.reduce((s, t) => {
        const dir      = t.trade_type === 'buy' ? 1 : -1
        const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? realized / risk : 0)
      }, 0) / rrTrades.length
    : 0

  // Max drawdown — worst single-day P&L (real trades only)
  const byDay = new Map<string, number>()
  for (const t of realClosed) {
    if (!t.close_time) continue
    const day = t.close_time.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + (t.net_profit ?? 0))
  }
  const maxDrawdown = Math.min(0, ...Array.from(byDay.values()))

  // Symbol win rates (BE excluded from denominator)
  const xau    = realClosed.filter(t => t.symbol?.includes('XAU'))
  const nas    = realClosed.filter(t => t.symbol?.includes('NAS') || t.symbol?.includes('US100'))
  const wrOf   = (ts: Trade[]) => { const w = ts.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length; const l = ts.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length; return (w + l) > 0 ? (w / (w + l)) * 100 : 0 }
  const xauWR  = wrOf(xau)
  const nasWR  = wrOf(nas)

  // Session win rates (BE excluded)
  const london   = realClosed.filter(t => t.session === 'london')
  const ny       = realClosed.filter(t => t.session === 'new_york')
  const londonWR = wrOf(london)
  const nyWR     = wrOf(ny)

  // Last 7 weeks P&L — aligned to calendar Mon–Sun weeks (matches MT5 weekly P&L)
  const weeklyPnl: number[] = []
  const currentMonday = new Date(now)
  const dow = currentMonday.getDay()
  currentMonday.setDate(currentMonday.getDate() - (dow === 0 ? 6 : dow - 1))
  currentMonday.setHours(0, 0, 0, 0)

  for (let i = 6; i >= 0; i--) {
    // i=6 → 6 weeks ago (oldest), i=0 → current week (newest)
    const wStart = new Date(currentMonday)
    wStart.setDate(wStart.getDate() - i * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 7)

    const wPnl = realClosed
      .filter(t => t.close_time && new Date(t.close_time) >= wStart && new Date(t.close_time) < wEnd)
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)
    weeklyPnl.push(parseFloat(wPnl.toFixed(2)))
  }

  return {
    monthPnl:        parseFloat(monthPnl.toFixed(2)),
    weekPnl:         parseFloat(weekPnl.toFixed(2)),
    winRate:         parseFloat(winRate.toFixed(1)),
    totalTrades:     realClosed.length,
    avgRR:           parseFloat(avgRR.toFixed(2)),
    maxDrawdown:     parseFloat(maxDrawdown.toFixed(2)),
    xauWinRate:      parseFloat(xauWR.toFixed(1)),
    nasWinRate:      parseFloat(nasWR.toFixed(1)),
    londonWinRate:   parseFloat(londonWR.toFixed(1)),
    nyWinRate:       parseFloat(nyWR.toFixed(1)),
    weeklyPnl,
    profitFactor:    parseFloat(profitFactor.toFixed(2)),
    expectancy:      parseFloat(expectancy.toFixed(2)),
    avgWin:          parseFloat(avgWin.toFixed(2)),
    avgLoss:         parseFloat(avgLoss.toFixed(2)),
    maxConsecWins,
    maxConsecLosses,
  }
}
