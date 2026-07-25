'use client'

import { useMemo } from 'react'
import { computeBreakdowns, type Segment } from '@/lib/trading/breakdowns'
import { computeStats } from '@/lib/trading/stats'
import { eurSigned } from '@/lib/utils/formatting'
import { Label } from '@/components/ui/vq'
import type { Trade } from '@/types'
import type { VelquorInsight } from '@/lib/intelligence'
import InsightCard from '@/components/ui/InsightCard'

export interface EdgeFact {
  label:  string
  value:  string
  sub?:   string
  color?: string
}

export function Fact({ label, value, sub, color }: EdgeFact) {
  return (
    <div style={{
      padding: '9px 11px', borderRadius: 'var(--radius-sm)',
      background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
      display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0,
    }}>
      <Label>{label}</Label>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
        color: color ?? 'var(--color-ink-1)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {value}
      </span>
      {sub && <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>{sub}</span>}
    </div>
  )
}

// 'london' / 'new_york' keys → display names
function prettySession(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

/** Top segment by net P&L — but only if it actually made money. Ranking a
 *  losing segment "best" (a setup averaging −€15/trade was once labelled
 *  "Best setup") tells the trader to do more of what is costing them. */
function bestOf(segs: Segment[], minTrades = 4): Segment | null {
  const eligible = segs.filter(s => s.trades >= minTrades && s.netPnl > 0)
  if (eligible.length === 0) return null
  return eligible.reduce((a, b) => (b.netPnl > a.netPnl ? b : a))
}
function worstOf(segs: Segment[], minTrades = 4): Segment | null {
  const eligible = segs.filter(s => s.trades >= minTrades && s.netPnl < 0)
  if (eligible.length === 0) return null
  return eligible.reduce((a, b) => (b.netPnl < a.netPnl ? b : a))
}

// Hard numbers from the trade database — shared by the desktop Edge Report
// and the mobile overview's Edge Report section.
export function buildEdgeFacts(allRows: Trade[]): EdgeFact[] {
  const b = computeBreakdowns(allRows)
  const s = computeStats(allRows)

  const bestSymbol  = bestOf(b.bySymbol)
  const worstSymbol = worstOf(b.bySymbol)
  const bestSession = bestOf(b.bySession)
  const bestSetup   = bestOf(b.bySetup)

  const facts: EdgeFact[] = []
  if (bestSymbol)  facts.push({ label: 'Best instrument',  value: bestSymbol.key,  sub: `${eurSigned(bestSymbol.netPnl)} · ${bestSymbol.winRate.toFixed(0)}% WR · ${bestSymbol.trades} trades`, color: 'var(--color-up)' })
  if (worstSymbol) facts.push({ label: 'Worst instrument', value: worstSymbol.key, sub: `${eurSigned(worstSymbol.netPnl)} · ${worstSymbol.winRate.toFixed(0)}% WR · ${worstSymbol.trades} trades`, color: 'var(--color-down)' })
  if (bestSession) facts.push({ label: 'Best session',     value: prettySession(bestSession.key), sub: `${eurSigned(bestSession.netPnl)} · ${bestSession.winRate.toFixed(0)}% WR`, color: 'var(--color-up)' })
  if (bestSetup)   facts.push({ label: 'Best setup',       value: bestSetup.key,   sub: `${eurSigned(bestSetup.expectancy)} per trade · ${bestSetup.trades} trades`, color: 'var(--color-up)' })
  if (s && s.totalTrades >= 5) {
    facts.push({
      label: 'Profit factor',
      value: s.profitFactor >= 99 ? '∞' : s.profitFactor.toFixed(2),
      sub:   s.profitFactor >= 1.5 ? 'Healthy edge' : s.profitFactor >= 1 ? 'Thin edge — protect it' : 'Negative edge — fix before sizing up',
      color: s.profitFactor >= 1.5 ? 'var(--color-up)' : s.profitFactor >= 1 ? 'var(--color-warn)' : 'var(--color-down)',
    })
    facts.push({
      label: 'Avg win vs avg loss',
      value: `€${s.avgWin.toFixed(0)} / €${s.avgLoss.toFixed(0)}`,
      sub:   s.avgWin >= s.avgLoss ? 'Winners outsize losers' : 'Losers outsize winners — cut sooner',
      color: s.avgWin >= s.avgLoss ? 'var(--color-up)' : 'var(--color-down)',
    })
    facts.push({
      label: 'Avg profit per trade',
      value: `${eurSigned(s.expectancy, 2)}/trade`,
      // Expectancy is measured per DECIDED trade — break-evens are excluded
      // from both sides, so quoting the full trade count here was wrong.
      sub:   `Across ${s.decidedTrades} decided trades${s.totalTrades > s.decidedTrades ? ` · ${s.totalTrades - s.decidedTrades} break-evens excluded` : ''}`,
      color: s.expectancy >= 0 ? 'var(--color-up)' : 'var(--color-down)',
    })
    facts.push({
      label: 'Longest streaks',
      value: `${s.maxConsecWins}W / ${s.maxConsecLosses}L`,
      sub:   `Worst run = ${s.maxConsecLosses} losses in a row — plan your stop-day rule around it`,
    })
  }
  if (b.bestCombo)  facts.push({ label: 'Strongest combo',      value: b.bestCombo.label,  sub: `${eurSigned(b.bestCombo.netPnl)} · ${b.bestCombo.winRate.toFixed(0)}% WR`,  color: 'var(--color-up)' })
  if (b.worstCombo) facts.push({ label: 'Most damaging combo', value: b.worstCombo.label, sub: `${eurSigned(b.worstCombo.netPnl)} · ${b.worstCombo.winRate.toFixed(0)}% WR`, color: 'var(--color-down)' })
  return facts
}

// Edge Report — the old "VELQUOR Intelligence" panel, rebuilt around hard
// numbers from the trade database next to the generated insights.
export function EdgeReport({ allRows, insights, loading }: {
  allRows:  Trade[]
  insights: VelquorInsight[]
  loading:  boolean
}) {
  const facts = useMemo(() => buildEdgeFacts(allRows), [allRows])

  // Day-trading only — anything derived from portfolio holdings, journal
  // streaks, or tasks stays in its own tab.
  const edgeInsights = insights.filter(i => i.source === 'trades')

  const hasAnything = facts.length > 0 || edgeInsights.length > 0

  if (!hasAnything) {
    return (
      <p style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)', fontSize: 'var(--text-base)' }}>
        {loading ? 'Analysing your trades…' : 'Sync MT5 and log trades — your edge report builds itself from the data.'}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {edgeInsights.slice(0, 4).map(i => <InsightCard key={i.id} insight={i} compact />)}
        {edgeInsights.length === 0 && (
          <p style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)', fontSize: 'var(--text-sm)' }}>More insights unlock as you log trades with setups and emotions.</p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'start' }}>
        {facts.slice(0, 10).map((f, i) => <Fact key={i} {...f} />)}
      </div>
    </div>
  )
}
