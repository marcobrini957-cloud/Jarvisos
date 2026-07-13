
import type { Trade } from '@/types'
import type { Period } from '@/components/ui/PeriodMetricCard'
import { tradeResult, BE_THRESHOLD } from '@/hooks/useTrades'

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
  const wins      = closed.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses    = closed.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const breakeven = closed.filter(t => Math.abs(t.net_profit ?? 0) <= BE_THRESHOLD)
  const decisive  = wins.length + losses.length
  return {
    rate:      decisive > 0 ? (wins.length / decisive) * 100 : 0,
    wins:      wins.length,
    losses:    losses.length,
    breakeven: breakeven.length,
    total:     closed.length,
  }
}

export function calcAvgRR(trades: Trade[]): number {
  const valid = trades.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  if (valid.length === 0) return 0
  const sum = valid.reduce((s, t) => {
    const dir      = t.trade_type === 'buy' ? 1 : -1
    const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
    const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
    return s + (risk > 0 ? realized / risk : 0)
  }, 0)
  return sum / valid.length
}

export function calcMaxDrawdown(trades: Trade[]): number {
  const byDay = new Map<string, number>()
  for (const t of trades) {
    if (!t.close_time) continue
    const day = t.close_time.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + (t.net_profit ?? 0))
  }
  const vals = Array.from(byDay.values())
  return vals.length > 0 ? Math.min(0, ...vals) : 0
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
      const wins    = filtered.filter(t => (t.net_profit ?? 0) > 0)
      const winRate = filtered.length > 0 ? wins.length / filtered.length : 0
      cells.push({ session: label, day, winRate, trades: filtered.length })
    }
  }
  return cells
}

export function heatColor(wr: number, count: number) {
  if (count === 0) return { bg: 'var(--s3)', color: 'var(--t3)' }
  if (wr >= 0.65)  return { bg: 'rgba(99,153,34,0.30)',   color: 'var(--gr2)' }
  if (wr >= 0.45)  return { bg: 'rgba(186,117,23,0.22)',  color: 'var(--am2)' }
  return              { bg: 'rgba(226,75,74,0.20)',  color: 'var(--re)' }
}
