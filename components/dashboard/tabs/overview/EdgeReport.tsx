'use client'

import { useMemo } from 'react'
import { computeBreakdowns, type Segment } from '@/lib/trading/breakdowns'
import { computeStats } from '@/lib/trading/stats'
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
      padding: '10px 12px', borderRadius: '9px',
      background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bd2)',
      display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0,
    }}>
      <span style={{ fontSize: '9.5px', color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: color ?? 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '10.5px', color: 'var(--t3)' }}>{sub}</span>}
    </div>
  )
}

// 'london' / 'new_york' keys → display names
function prettySession(key: string): string {
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function bestOf(segs: Segment[]): Segment | null {
  const eligible = segs.filter(s => s.trades >= 4)
  if (eligible.length === 0) return null
  return eligible.reduce((a, b) => (b.netPnl > a.netPnl ? b : a))
}
function worstOf(segs: Segment[]): Segment | null {
  const eligible = segs.filter(s => s.trades >= 4)
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
  if (bestSymbol)  facts.push({ label: 'Best instrument',  value: bestSymbol.key,  sub: `+€${bestSymbol.netPnl.toFixed(0)} · ${bestSymbol.winRate.toFixed(0)}% WR · ${bestSymbol.trades} trades`, color: 'var(--gr2)' })
  if (worstSymbol && worstSymbol.netPnl < 0) facts.push({ label: 'Worst instrument', value: worstSymbol.key, sub: `€${worstSymbol.netPnl.toFixed(0)} · ${worstSymbol.winRate.toFixed(0)}% WR · ${worstSymbol.trades} trades`, color: 'var(--re)' })
  if (bestSession) facts.push({ label: 'Best session',     value: prettySession(bestSession.key), sub: `+€${bestSession.netPnl.toFixed(0)} · ${bestSession.winRate.toFixed(0)}% WR`, color: 'var(--gr2)' })
  if (bestSetup)   facts.push({ label: 'Best setup',       value: bestSetup.key,   sub: `avg €${bestSetup.expectancy.toFixed(0)} per trade`, color: 'var(--gr2)' })
  if (s && s.totalTrades >= 5) {
    facts.push({
      label: 'Profit factor',
      value: s.profitFactor >= 99 ? '∞' : s.profitFactor.toFixed(2),
      sub:   s.profitFactor >= 1.5 ? 'Healthy edge' : s.profitFactor >= 1 ? 'Thin edge — protect it' : 'Negative edge — fix before sizing up',
      color: s.profitFactor >= 1.5 ? 'var(--gr2)' : s.profitFactor >= 1 ? 'var(--am2)' : 'var(--re)',
    })
    facts.push({
      label: 'Avg win vs avg loss',
      value: `€${s.avgWin.toFixed(0)} / €${s.avgLoss.toFixed(0)}`,
      sub:   s.avgWin >= s.avgLoss ? 'Winners outsize losers' : 'Losers outsize winners — cut sooner',
      color: s.avgWin >= s.avgLoss ? 'var(--gr2)' : 'var(--re)',
    })
    facts.push({
      label: 'Avg profit per trade',
      value: `€${s.expectancy.toFixed(2)}/trade`,
      sub:   `Across ${s.totalTrades} trades (break-evens excluded)`,
      color: s.expectancy >= 0 ? 'var(--gr2)' : 'var(--re)',
    })
    facts.push({
      label: 'Longest streaks',
      value: `${s.maxConsecWins}W / ${s.maxConsecLosses}L`,
      sub:   `Worst run = ${s.maxConsecLosses} losses in a row — plan your stop-day rule around it`,
    })
  }
  if (b.bestCombo) facts.push({ label: 'Strongest combo',  value: b.bestCombo.label, sub: `+€${b.bestCombo.netPnl.toFixed(0)} · ${b.bestCombo.winRate.toFixed(0)}% WR`, color: 'var(--gr2)' })
  if (b.worstCombo) facts.push({ label: 'Most damaging combo', value: b.worstCombo.label, sub: `€${b.worstCombo.netPnl.toFixed(0)} · ${b.worstCombo.winRate.toFixed(0)}% WR`, color: 'var(--re)' })
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
      <p style={{ color: 'var(--t3)', fontSize: '13px' }}>
        {loading ? 'Analysing your trades…' : 'Sync MT5 and log trades — your edge report builds itself from the data.'}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {edgeInsights.slice(0, 4).map(i => <InsightCard key={i.id} insight={i} compact />)}
        {edgeInsights.length === 0 && (
          <p style={{ color: 'var(--t3)', fontSize: '12px' }}>More insights unlock as you log trades with setups and emotions.</p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'start' }}>
        {facts.slice(0, 10).map((f, i) => <Fact key={i} {...f} />)}
      </div>
    </div>
  )
}
