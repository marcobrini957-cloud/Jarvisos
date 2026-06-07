'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Trade } from '@/types'

interface TradeStats {
  monthPnl:      number
  weekPnl:       number
  winRate:       number
  totalTrades:   number
  avgRR:         number
  maxDrawdown:   number
  xauWinRate:    number
  nasWinRate:    number
  londonWinRate: number
  nyWinRate:     number
  weeklyPnl:     number[]   // last 7 weeks
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
  const [trades,  setTrades]  = useState<Trade[]>([])
  const [allRows, setAllRows] = useState<Trade[]>([])
  const [stats, setStats]     = useState<TradeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      // Fetch ALL closed rows — including balance/withdrawal ops (lot_size=0, symbol=null)
      // so that P&L correctly reflects deposits and withdrawals.
      const { data, error: err } = await supabase
        .from('trades')
        .select('*')
        .eq('status', 'closed')
        .order('close_time', { ascending: false })
        .limit(limit)

      if (err) throw err
      const rows = (data ?? []) as Trade[]

      // trades = real trades only (for the trade log / win-rate / R:R)
      setTrades(rows.filter(isRealTrade))
      // allRows used by P&L period calculations — includes balance/withdrawal ops
      setAllRows(rows)
      // stats P&L uses ALL rows so withdrawals/deposits are counted
      setStats(computeStats(rows))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { load() }, [load])

  return { trades, allRows, stats, loading, error, reload: load }
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

  // Avg R:R — real trades with SL and TP
  const rrTrades = realClosed.filter(t => t.stop_loss && t.take_profit && t.open_price)
  const avgRR    = rrTrades.length > 0
    ? rrTrades.reduce((s, t) => {
        const risk   = Math.abs((t.open_price ?? 0) - (t.stop_loss  ?? 0))
        const reward = Math.abs((t.take_profit ?? 0) - (t.open_price ?? 0))
        return s + (risk > 0 ? reward / risk : 0)
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

  // Last 7 weeks P&L — real trades only
  const weeklyPnl: number[] = []
  for (let i = 6; i >= 0; i--) {
    const wEnd   = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const wStart = new Date(wEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
    const wPnl   = realClosed
      .filter(t => t.close_time && new Date(t.close_time) >= wStart && new Date(t.close_time) < wEnd)
      .reduce((s, t) => s + (t.net_profit ?? 0), 0)
    weeklyPnl.push(parseFloat(wPnl.toFixed(2)))
  }

  return {
    monthPnl:      parseFloat(monthPnl.toFixed(2)),
    weekPnl:       parseFloat(weekPnl.toFixed(2)),
    winRate:       parseFloat(winRate.toFixed(1)),
    totalTrades:   realClosed.length,
    avgRR:         parseFloat(avgRR.toFixed(2)),
    maxDrawdown:   parseFloat(maxDrawdown.toFixed(2)),
    xauWinRate:    parseFloat(xauWR.toFixed(1)),
    nasWinRate:    parseFloat(nasWR.toFixed(1)),
    londonWinRate: parseFloat(londonWR.toFixed(1)),
    nyWinRate:     parseFloat(nyWR.toFixed(1)),
    weeklyPnl,
  }
}
