
import type { Trade } from '@/types'
import type { Period } from '@/components/ui/PeriodMetricCard'
import { tradeResult } from '@/hooks/useTrades'
import { isWin, isLoss, isBreakeven } from '@/lib/trading/stats'

// ── Helpers ───────────────────────────────────────────────────────────────────

export function periodStart(p: Period): Date {
  const now = new Date()
  switch (p) {
    case 'D': return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    case 'W': {
      // Monday 00:00 of the current week
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      const day = d.getDay() // 0=Sun
      d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      return d
    }
    case 'M': return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
    case 'Q': return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1, 0, 0, 0, 0)
    case 'Y': return new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
  }
}

export function periodEnd(p: Period): Date {
  const now = new Date()
  switch (p) {
    case 'D': return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    case 'W': {
      const start = periodStart('W')
      return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999)
    }
    case 'M': return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    case 'Q': {
      const qStart = Math.floor(now.getMonth() / 3) * 3
      return new Date(now.getFullYear(), qStart + 3, 0, 23, 59, 59, 999)
    }
    case 'Y': return new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
  }
}

export function filterByPeriod(trades: Trade[], p: Period): Trade[] {
  const start = periodStart(p)
  const end   = periodEnd(p)
  return trades.filter(t => {
    if (!t.close_time) return false
    const d = new Date(t.close_time)
    return d >= start && d <= end
  })
}

export function calcPnl(trades: Trade[]): number {
  return trades.reduce((s, t) => s + (t.net_profit ?? 0), 0)
}

export function calcWinRate(trades: Trade[]): { rate: number; wins: number; losses: number; breakeven: number; total: number } {
  const closed    = trades.filter(t => t.net_profit !== null)
  const wins      = closed.filter(t => isWin(t))
  const losses    = closed.filter(t => isLoss(t))
  const breakeven = closed.filter(t => isBreakeven(t))
  const decisive  = wins.length + losses.length
  return {
    rate:      decisive > 0 ? (wins.length / decisive) * 100 : 0,
    wins:      wins.length,
    losses:    losses.length,
    breakeven: breakeven.length,
    total:     closed.length,
  }
}

// Universal, instrument-agnostic pips.
// Marco's mental model: €100 profit on a 0.10 lot = 100 pips. That's exactly a
// dollar-per-pip of €1 at 0.10 lots, i.e. €10 per pip on a full 1.00 lot — the
// standard-lot convention. So pips = net_profit / (lot_size × 10). This makes a
// pip mean the same thing on EURUSD, Nasdaq, gold or anything else: it's how many
// "€10-per-full-lot" units you banked, size-normalised. No per-symbol pip tables.
export function tradePips(t: Trade): number | null {
  if (t.net_profit == null || !t.lot_size) return null
  return t.net_profit / (t.lot_size * 10)
}

// Sum of size-normalised pips across a set of trades (skips ones we can't size).
export function calcPips(trades: Trade[]): number {
  return trades.reduce((s, t) => s + (tradePips(t) ?? 0), 0)
}

// Consistency = share of trading days that closed in profit.
//
// Style-agnostic on purpose: a scalper and a swing trader can both score 100,
// which is why it belongs on the radar where a graded R:R never did. Lives here
// rather than in TradingTab so the KPI card and the radar grade it identically.
export function calcConsistency(trades: Trade[]): { green: number; totalDays: number; pct: number } {
  const byDay = new Map<string, number>()
  for (const t of trades) {
    if (!t.close_time) continue
    const d = t.close_time.split('T')[0]
    byDay.set(d, (byDay.get(d) ?? 0) + (t.net_profit ?? 0))
  }
  const totalDays = byDay.size
  const green     = [...byDay.values()].filter(v => v > 0).length
  return { green, totalDays, pct: totalDays > 0 ? (green / totalDays) * 100 : 0 }
}

export function fmtPnl(n: number | null): string {
  if (n === null) return '—'
  return `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(2)}`
}

export function fmtPips(p: number | null): string {
  if (p === null) return '—'
  return `${p > 0 ? '+' : ''}${p.toFixed(1)}p`
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-AT', { day: '2-digit', month: 'short', timeZone: 'Europe/Vienna' })
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('de-AT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Vienna' })
}

// Month abbreviations — locale-independent, same output on Node.js and browser
export const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Heatmap data from trades ──────────────────────────────────────────────────

export function buildHeatmap(trades: Trade[]) {
  const days     = ['Mon','Tue','Wed','Thu','Fri']
  const sessions = [
    { label: 'London',  keys: ['london'] },
    { label: 'Overlap', keys: ['overlap'] },
    { label: 'NY',      keys: ['new_york'] },
  ]
  const cells: { session: string; day: string; winRate: number; trades: number }[] = []

  for (const { label, keys } of sessions) {
    for (const day of days) {
      const dayIndex = days.indexOf(day) + 1 // JS: 1=Mon...5=Fri
      const filtered = trades.filter(t => {
        if (!keys.includes(t.session ?? '')) return false
        if (!t.open_time) return false
        const d = new Date(t.open_time).getDay()
        return d === dayIndex
      })
      const wins    = filtered.filter(t => isWin(t))
      const winRate = filtered.length > 0 ? wins.length / filtered.length : 0
      cells.push({ session: label, day, winRate, trades: filtered.length })
    }
  }
  return cells
}

export function heatColor(wr: number, count: number) {
  if (count === 0) return { bg: 'var(--s3)', color: 'var(--t3)' }
  if (wr >= 0.65)  return { bg: 'rgba(0,196,106,0.30)',   color: 'var(--gr2)' }
  if (wr >= 0.45)  return { bg: 'rgba(255,255,255,0.22)',  color: 'var(--am2)' }
  return              { bg: 'rgba(240,80,75,0.20)',  color: 'var(--re)' }
}
