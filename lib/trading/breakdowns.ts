// Conditional trading analytics — the "truth layer".
// Pure functions, no React/Supabase. Unit-tested in tests/breakdowns.test.ts.
//
// These break performance down by the behavioral + contextual dimensions the
// trades carry (setup, emotion, session, time, discipline, plan-adherence).
// The AI coaching layer READS this output and narrates it — it never computes
// numbers itself. Every figure a user ever sees originates here.

import type { Trade } from '@/types'
import { BE_THRESHOLD, isRealTrade, tradeResult } from './stats'

export interface Segment {
  key:         string   // the bucket value, e.g. 'anxious', 'london', 'Mon'
  trades:      number   // decisive + breakeven count in this bucket
  wins:        number
  losses:      number
  winRate:     number   // % over decisive (wins+losses), BE excluded
  netPnl:      number   // total EUR
  expectancy:  number   // EUR per trade (decisive)
  avgR:        number   // average realized R multiple (0 if not computable)
}

export interface Breakdowns {
  bySetup:      Segment[]
  byEmotion:    Segment[]
  bySession:    Segment[]
  byDayOfWeek:  Segment[]
  byHour:       Segment[]   // entry hour (account/close TZ), 0–23
  bySymbol:     Segment[]
  byPlan:       Segment[]   // followed_plan true/false
  byDiscipline: Segment[]   // discipline_score bucketed high/mid/low
  // Cross-tab: the single most damaging behavioral combo the data supports.
  worstCombo:   { label: string; winRate: number; netPnl: number; trades: number } | null
  bestCombo:    { label: string; winRate: number; netPnl: number; trades: number } | null
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function realizedR(t: Trade): number | null {
  if (!t.stop_loss || !t.open_price || !t.close_price || !t.trade_type) return null
  const dir      = t.trade_type === 'buy' ? 1 : -1
  const realized = dir * (t.close_price - t.open_price)
  const risk     = Math.abs(t.open_price - t.stop_loss)
  return risk > 0 ? realized / risk : null
}

function segment(key: string, ts: Trade[]): Segment {
  const wins   = ts.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses = ts.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const dec    = wins.length + losses.length
  const netPnl = ts.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const rs     = ts.map(realizedR).filter((r): r is number => r !== null)
  return {
    key,
    trades:     ts.length,
    wins:       wins.length,
    losses:     losses.length,
    winRate:    dec > 0 ? +(wins.length / dec * 100).toFixed(1) : 0,
    netPnl:     +netPnl.toFixed(2),
    expectancy: dec > 0 ? +(netPnl / dec).toFixed(2) : 0,
    avgR:       rs.length > 0 ? +(rs.reduce((s, r) => s + r, 0) / rs.length).toFixed(2) : 0,
  }
}

// Group by a key extractor, drop null keys and thin buckets, sort worst→best PnL.
function groupBy(
  rows: Trade[],
  keyOf: (t: Trade) => string | null,
  minTrades = 3,
): Segment[] {
  const buckets = new Map<string, Trade[]>()
  for (const t of rows) {
    const k = keyOf(t)
    if (k == null) continue
    if (!buckets.has(k)) buckets.set(k, [])
    buckets.get(k)!.push(t)
  }
  return Array.from(buckets.entries())
    .map(([k, ts]) => segment(k, ts))
    .filter(s => s.trades >= minTrades)
    .sort((a, b) => a.netPnl - b.netPnl)
}

function disciplineBucket(score: number | null): string | null {
  if (score == null) return null
  if (score >= 8) return 'high (8-10)'
  if (score >= 5) return 'mid (5-7)'
  return 'low (0-4)'
}

export function computeBreakdowns(allRows: Trade[]): Breakdowns {
  const rows = allRows.filter(
    t => t.status === 'closed' && t.net_profit !== null && isRealTrade(t),
  )

  const bySetup      = groupBy(rows, t => (t.setup_type?.trim() || null))
  const byEmotion    = groupBy(rows, t => t.emotion_pre ?? null)
  const bySession    = groupBy(rows, t => t.session ?? null)
  const byDayOfWeek  = groupBy(rows, t => (t.close_time ? DOW[new Date(t.close_time).getDay()] : null))
  const byHour       = groupBy(rows, t => (t.open_time ? String(new Date(t.open_time).getHours()) : null))
  const bySymbol     = groupBy(rows, t => t.symbol ?? null)
  const byPlan       = groupBy(rows, t => (t.followed_plan == null ? null : t.followed_plan ? 'followed plan' : 'broke plan'))
  const byDiscipline = groupBy(rows, t => disciplineBucket(t.discipline_score))

  // Cross-tab emotion × setup — surface the single worst / best combo with
  // enough samples to be worth mentioning. This is the "aha" the AI leans on.
  const comboMap = new Map<string, Trade[]>()
  for (const t of rows) {
    if (!t.emotion_pre || !t.setup_type?.trim()) continue
    const k = `${t.emotion_pre} · ${t.setup_type.trim()}`
    if (!comboMap.has(k)) comboMap.set(k, [])
    comboMap.get(k)!.push(t)
  }
  const combos = Array.from(comboMap.entries())
    .map(([k, ts]) => ({ seg: segment(k, ts) }))
    .filter(c => c.seg.trades >= 4)
    .map(c => ({
      label:   c.seg.key,
      winRate: c.seg.winRate,
      netPnl:  c.seg.netPnl,
      trades:  c.seg.trades,
    }))
  const worstCombo = combos.length ? combos.reduce((a, b) => (b.netPnl < a.netPnl ? b : a)) : null
  const bestCombo  = combos.length ? combos.reduce((a, b) => (b.netPnl > a.netPnl ? b : a)) : null

  return {
    bySetup, byEmotion, bySession, byDayOfWeek, byHour, bySymbol,
    byPlan, byDiscipline, worstCombo, bestCombo,
  }
}
