'use client'

import { useMemo } from 'react'
import { computeBreakdowns, type Segment } from '@/lib/trading/breakdowns'
import type { Trade } from '@/types'
import type { VelquorInsight } from '@/lib/intelligence'
import InsightCard from '@/components/ui/InsightCard'

function Fact({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
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

// Edge Report — the old "VELQUOR Intelligence" panel, rebuilt around hard
// numbers from the trade database next to the generated insights.
export function EdgeReport({ allRows, insights, loading }: {
  allRows:  Trade[]
  insights: VelquorInsight[]
  loading:  boolean
}) {
  const b = useMemo(() => computeBreakdowns(allRows), [allRows])

  const bestSymbol  = bestOf(b.bySymbol)
  const worstSymbol = worstOf(b.bySymbol)
  const bestSession = bestOf(b.bySession)
  const bestSetup   = bestOf(b.bySetup)

  const facts: { label: string; value: string; sub?: string; color?: string }[] = []
  if (bestSymbol)  facts.push({ label: 'Best instrument',  value: bestSymbol.key,  sub: `+€${bestSymbol.netPnl.toFixed(0)} · ${bestSymbol.winRate.toFixed(0)}% WR · ${bestSymbol.trades} trades`, color: 'var(--gr2)' })
  if (worstSymbol && worstSymbol.netPnl < 0) facts.push({ label: 'Worst instrument', value: worstSymbol.key, sub: `€${worstSymbol.netPnl.toFixed(0)} · ${worstSymbol.winRate.toFixed(0)}% WR · ${worstSymbol.trades} trades`, color: 'var(--re)' })
  if (bestSession) facts.push({ label: 'Best session',     value: bestSession.key, sub: `+€${bestSession.netPnl.toFixed(0)} · ${bestSession.winRate.toFixed(0)}% WR`, color: 'var(--gr2)' })
  if (bestSetup)   facts.push({ label: 'Best setup',       value: bestSetup.key,   sub: `€${bestSetup.expectancy.toFixed(0)}/trade expectancy`, color: 'var(--gr2)' })
  if (b.bestCombo) facts.push({ label: 'Strongest combo',  value: b.bestCombo.label, sub: `+€${b.bestCombo.netPnl.toFixed(0)} · ${b.bestCombo.winRate.toFixed(0)}% WR`, color: 'var(--gr2)' })
  if (b.worstCombo) facts.push({ label: 'Most damaging combo', value: b.worstCombo.label, sub: `€${b.worstCombo.netPnl.toFixed(0)} · ${b.worstCombo.winRate.toFixed(0)}% WR`, color: 'var(--re)' })

  const hasAnything = facts.length > 0 || insights.length > 0

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
        {insights.slice(0, 3).map(i => <InsightCard key={i.id} insight={i} compact />)}
        {insights.length === 0 && (
          <p style={{ color: 'var(--t3)', fontSize: '12px' }}>More insights unlock as you log trades with setups and emotions.</p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', alignContent: 'start' }}>
        {facts.slice(0, 6).map((f, i) => <Fact key={i} {...f} />)}
      </div>
    </div>
  )
}
