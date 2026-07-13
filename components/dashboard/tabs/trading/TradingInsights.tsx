'use client'

import { useMemo } from 'react'
import { BE_THRESHOLD } from '@/hooks/useTrades'
import { generateInsights } from '@/lib/intelligence'
import InsightCard from '@/components/ui/InsightCard'
import Panel from '@/components/ui/Panel'
import type { Trade } from '@/types'
import { StatRow, TableHeader } from './analytics-shared'
import { TraderRadar } from './TraderRadar'

// ── Full analytics panel ──────────────────────────────────────────────────────

export function TradingInsights({ trades, allRows }: { trades: Trade[]; allRows: Trade[] }) {
  const closed = useMemo(() =>
    trades.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE'),
  [trades])

  const insights = useMemo(() => generateInsights({
    trades:         [...trades, ...allRows.filter(t => t.symbol === 'BALANCE')],
    holdings:       [],
    journal:        [],
    tasks:          [],
    accountBalance: 0,
    portfolioValue: 0,
  }).filter(i => i.category === 'trading' || i.category === 'warning' || i.category === 'habits'),
  [trades, allRows])

  // Helper: group trades into { label, trades[] } for StatRow
  type Group = { label: string; trades: Trade[] }

  const avgPnl = (ts: Trade[]) => ts.length > 0 ? ts.reduce((a, t) => a + (t.net_profit ?? 0), 0) / ts.length : 0

  // ── Day of week ────────────────────────────────────────────────────────────
  const dayData = useMemo((): Group[] => {
    const map: Record<number, Trade[]> = {}
    for (const t of closed) {
      if (!t.close_time) continue
      const d = new Date(t.close_time).getDay()
      if (d === 0 || d === 6) continue
      ;(map[d] ??= []).push(t)
    }
    return [1, 2, 3, 4, 5].map(d => ({
      label:  ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][d],
      trades: map[d] ?? [],
    }))
  }, [closed])

  // ── Session ────────────────────────────────────────────────────────────────
  const sessionData = useMemo((): Group[] => [
    { key: 'london',   label: 'London'   },
    { key: 'overlap',  label: 'Overlap'  },
    { key: 'new_york', label: 'New York' },
    { key: 'asian',    label: 'Asian'    },
  ].map(s => ({ label: s.label, trades: closed.filter(t => t.session === s.key) }))
  , [closed])

  // ── Emotion ────────────────────────────────────────────────────────────────
  const emotionData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.emotion_pre)) {
      ;(map.get(t.emotion_pre!) ?? map.set(t.emotion_pre!, []).get(t.emotion_pre!)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => {
        const wrOf = (ts: Trade[]) => { const w = ts.filter(t => (t.net_profit ?? 0) > BE_THRESHOLD).length; const l = ts.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length; return (w + l) > 0 ? w / (w + l) : 0 }
        return wrOf(b.trades) - wrOf(a.trades)
      })
  }, [closed])

  // ── Setup type ─────────────────────────────────────────────────────────────
  const setupData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.setup_type)) {
      ;(map.get(t.setup_type!) ?? map.set(t.setup_type!, []).get(t.setup_type!)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => avgPnl(b.trades) - avgPnl(a.trades))
  }, [closed])

  // ── Setup: total P&L per setup (for horizontal bar chart) ─────────────────
  const setupPnlChart = useMemo(() =>
    setupData
      .map(g => ({ label: g.label, total: g.trades.reduce((s, t) => s + (t.net_profit ?? 0), 0) }))
      .sort((a, b) => b.total - a.total)
  , [setupData])

  // ── Setup: avg realized R:R per setup ─────────────────────────────────────
  const setupRRChart = useMemo(() => {
    return setupData.map(g => {
      const rrTrades = g.trades.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
      if (rrTrades.length === 0) return null
      const sum = rrTrades.reduce((s, t) => {
        const dir      = t.trade_type === 'buy' ? 1 : -1
        const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? realized / risk : 0)
      }, 0)
      return { label: g.label, avgRR: sum / rrTrades.length }
    })
    .filter((x): x is { label: string; avgRR: number } => x !== null)
    .sort((a, b) => b.avgRR - a.avgRR)
  }, [setupData])

  // ── Tags ──────────────────────────────────────────────────────────────────
  const tagData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed.filter(t => t.tags?.length)) {
      for (const tag of t.tags!) {
        ;(map.get(tag) ?? map.set(tag, []).get(tag)!).push(t)
      }
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => avgPnl(a.trades) - avgPnl(b.trades)) // worst first
  }, [closed])

  // ── Followed plan ──────────────────────────────────────────────────────────
  const planData = useMemo((): Group[] => [
    { label: 'Followed plan', trades: closed.filter(t => t.followed_plan === true)  },
    { label: 'Broke plan',    trades: closed.filter(t => t.followed_plan === false) },
  ].filter(r => r.trades.length > 0)
  , [closed])

  // ── Symbol ────────────────────────────────────────────────────────────────
  const symbolData = useMemo((): Group[] => {
    const map = new Map<string, Trade[]>()
    for (const t of closed) {
      const sym = t.symbol?.includes('XAU') ? 'XAUUSD'
        : (t.symbol?.includes('NAS') || t.symbol?.includes('US100')) ? 'NAS100'
        : t.symbol ?? 'Other'
      ;(map.get(sym) ?? map.set(sym, []).get(sym)!).push(t)
    }
    return [...map.entries()]
      .map(([label, trades]) => ({ label, trades }))
      .sort((a, b) => b.trades.length - a.trades.length)
  }, [closed])

  if (closed.length === 0) return null

  const subHead = (title: string) => (
    <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '4px', marginTop: '4px' }}>
      {title}
    </p>
  )

  const noData = (msg: string) => (
    <p style={{ color: 'var(--t3)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>{msg}</p>
  )

  return (
    <Panel title={`Statistical Analysis — ${closed.length} trades`}>

      {/* ── Trader Radar (FIFA-style) ── */}
      <div style={{ marginBottom: '28px', paddingBottom: '24px', borderBottom: '1px solid var(--bd)' }}>
        <TraderRadar closed={closed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Day of week */}
          <div>
            {subHead('Win rate by day of week')}
            <TableHeader />
            {dayData.filter(d => d.trades.length > 0).map(d => (
              <StatRow key={d.label} label={d.label} trades={d.trades} avgPnl={avgPnl(d.trades)} />
            ))}
            {dayData.every(d => d.trades.length === 0) && noData('No trades yet.')}
          </div>

          {/* Session */}
          <div>
            {subHead('Win rate by session')}
            <TableHeader />
            {sessionData.filter(s => s.trades.length > 0).map(s => (
              <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} />
            ))}
          </div>

          {/* Symbol */}
          <div>
            {subHead('Win rate by instrument')}
            <TableHeader />
            {symbolData.map(s => (
              <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} />
            ))}
          </div>

        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Emotion */}
          <div>
            {subHead('Win rate by pre-trade emotion')}
            {emotionData.length > 0 ? (
              <>
                <TableHeader />
                {emotionData.map((e, i) => (
                  <StatRow key={e.label} label={e.label} trades={e.trades} avgPnl={avgPnl(e.trades)} highlight={i === 0} />
                ))}
              </>
            ) : noData('Annotate trades with emotion to see this analysis.')}
          </div>

          {/* Followed plan */}
          <div>
            {subHead('Followed trading plan')}
            {planData.length > 0 ? (
              <>
                <TableHeader />
                {planData.map(p => (
                  <StatRow key={p.label} label={p.label} trades={p.trades} avgPnl={avgPnl(p.trades)} highlight={p.label === 'Followed plan'} />
                ))}
              </>
            ) : noData('Annotate trades with plan tracking to see this analysis.')}
          </div>

          {/* Setup type */}
          <div>
            {subHead('Win rate by setup type')}
            {setupData.length > 0 ? (
              <>
                <TableHeader />
                {setupData.map((s, i) => (
                  <StatRow key={s.label} label={s.label} trades={s.trades} avgPnl={avgPnl(s.trades)} highlight={i === 0} />
                ))}
              </>
            ) : noData('Annotate trades with setup type to see this analysis.')}
          </div>

          {/* Tags / mistake labels */}
          <div>
            {subHead('Mistake & pattern tags')}
            {tagData.length > 0 ? (
              <>
                <TableHeader />
                {tagData.map((t, i) => (
                  <StatRow key={t.label} label={t.label} trades={t.trades} avgPnl={avgPnl(t.trades)} highlight={i === tagData.length - 1} />
                ))}
              </>
            ) : noData('Tag trades (e.g. FOMO, revenge, early exit) to see the cost of each pattern.')}
          </div>

        </div>
      </div>

      {/* ── Visual setup charts ───────────────────────────────────────────── */}
      {setupPnlChart.length > 0 && (() => {
        const ROW_H   = 36
        const LABEL_W = 160
        const BAR_MAX = 180
        const PAD_R   = 56
        const W       = LABEL_W + BAR_MAX * 2 + PAD_R
        const fmt     = (v: number) => `€${v >= 0 ? '+' : ''}${v.toFixed(0)}`
        const fmtRR   = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`
        const pnlMax  = Math.max(...setupPnlChart.map(d => Math.abs(d.total)), 0.01)
        const rrMax   = setupRRChart.length > 0 ? Math.max(...setupRRChart.map(d => Math.abs(d.avgRR)), 0.01) : 1

        const HorizBar = ({ data, formatVal, maxAbs, id }: {
          data: { label: string; value: number }[]
          formatVal: (v: number) => string
          maxAbs: number
          id: string
        }) => {
          const H = data.length * ROW_H
          return (
            <svg key={id} width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
              {/* zero line */}
              <line x1={LABEL_W + BAR_MAX} y1={0} x2={LABEL_W + BAR_MAX} y2={H}
                stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
              {data.map((d, i) => {
                const barW  = Math.max(2, (Math.abs(d.value) / maxAbs) * BAR_MAX)
                const isPos = d.value >= 0
                const y     = i * ROW_H
                const barColor = isPos ? '#22c55e' : '#ef4444'
                const barX  = isPos ? LABEL_W + BAR_MAX : LABEL_W + BAR_MAX - barW
                return (
                  <g key={d.label}>
                    {/* Row bg on hover handled via CSS — skip for now */}
                    <text
                      x={LABEL_W - 8} y={y + ROW_H / 2 + 4}
                      textAnchor="end" fontSize="11" fill="rgba(255,255,255,0.65)"
                      fontFamily="system-ui, sans-serif"
                    >
                      {d.label}
                    </text>
                    <rect x={barX} y={y + 8} width={barW} height={ROW_H - 16} rx="3" fill={barColor} opacity="0.85" />
                    <text
                      x={isPos ? barX + barW + 5 : barX - 5}
                      y={y + ROW_H / 2 + 4}
                      textAnchor={isPos ? 'start' : 'end'}
                      fontSize="10" fill={barColor}
                      fontFamily="monospace"
                      fontWeight="600"
                    >
                      {formatVal(d.value)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )
        }

        return (
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Setup Performance (Grouped) */}
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Setup Performance (Grouped)
                </p>
                <HorizBar
                  id="setup-pnl"
                  data={setupPnlChart.map(d => ({ label: d.label, value: d.total }))}
                  formatVal={fmt}
                  maxAbs={pnlMax}
                />
              </div>

              {/* Avg R:R by Setup */}
              <div>
                <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
                  Avg R:R by Setup
                </p>
                {setupRRChart.length > 0 ? (
                  <HorizBar
                    id="setup-rr"
                    data={setupRRChart.map(d => ({ label: d.label, value: d.avgRR }))}
                    formatVal={fmtRR}
                    maxAbs={rrMax}
                  />
                ) : (
                  <p style={{ color: 'var(--t3)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
                    Add stop loss to trades to see R:R by setup.
                  </p>
                )}
              </div>

            </div>
          </div>
        )
      })()}

      {/* Insight cards — warnings + key findings */}
      {insights.length > 0 && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--bd)' }}>
          <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
            Key findings
          </p>
          <div className="flex flex-col gap-3">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} compact />
            ))}
          </div>
        </div>
      )}

      {/* Data summary footer */}
      {(() => {
        const emotionCount = closed.filter(t => t.emotion_pre).length
        const setupCount   = closed.filter(t => t.setup_type).length
        const planCount    = closed.filter(t => t.followed_plan !== null && t.followed_plan !== undefined).length
        const tagCount     = closed.filter(t => t.tags?.length).length
        const uniqueTags   = new Set(closed.flatMap(t => t.tags ?? [])).size
        const oldest       = closed.reduce((a, t) => !a || (t.open_time ?? '') < (a.open_time ?? '') ? t : a, closed[0])
        const newest       = closed.reduce((a, t) => !a || (t.open_time ?? '') > (a.open_time ?? '') ? t : a, closed[0])
        const dateRange    = oldest && newest && oldest !== newest
          ? `${new Date(oldest.open_time!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(newest.open_time!).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
          : null

        return (
          <div style={{
            marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--bd)',
            display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          }}>
            <span style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: '4px' }}>
              Analyzing
            </span>
            {[
              { label: `${closed.length} trades`, always: true },
              { label: `${emotionCount} with emotion`, always: false, active: emotionCount > 0 },
              { label: `${setupCount} with setup type`, always: false, active: setupCount > 0 },
              { label: `${planCount} with plan data`, always: false, active: planCount > 0 },
              { label: `${tagCount} tagged · ${uniqueTags} unique tag${uniqueTags !== 1 ? 's' : ''}`, always: false, active: tagCount > 0 },
            ].map(chip => (
              <span key={chip.label} style={{
                fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                background: (!chip.always && !chip.active) ? 'var(--s2)' : 'var(--s3)',
                color: (!chip.always && !chip.active) ? 'var(--t3)' : 'var(--t2)',
                border: '1px solid var(--bd)',
              }}>
                {chip.label}
              </span>
            ))}
            {dateRange && (
              <span style={{ fontSize: '11px', color: 'var(--t3)', marginLeft: 'auto' }}>
                {dateRange}
              </span>
            )}
          </div>
        )
      })()}
    </Panel>
  )
}
