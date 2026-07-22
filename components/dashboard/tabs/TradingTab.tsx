'use client'

import { useState } from 'react'
import { useTrades, tradeResult } from '@/hooks/useTrades'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import PeriodMetricCard from '@/components/ui/PeriodMetricCard'
import { LogoMark } from '@/components/ui/LogoMark'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import ScreenshotGallery from '@/components/ui/ScreenshotGallery'
import SessionAnalyticsChart from '@/components/ui/SessionAnalyticsChart'
import type { Trade } from '@/types'
import { BE_THRESHOLD } from '@/lib/trading/stats'
import {
  filterByPeriod, calcPnl, calcWinRate, calcAvgRR, calcMaxDrawdown,
  fmtPnl, fmtPips, fmtDate, fmtTime, MON, buildHeatmap, heatColor,
} from './trading/helpers'
import { TradeAnnotationModal } from './trading/TradeAnnotationModal'
import { TradeLogTable } from './trading/TradeLogTable'
import { TradingInsights } from './trading/TradingInsights'
import { YourEdge } from './trading/YourEdge'
import { EquityCurve } from './trading/EquityCurve'
import { ReportDownloadBar } from './trading/ReportDownloadBar'
import { AdvancedChart } from '@/components/widgets/TradingViewWidget'
import { TradeCalendar } from './overview/TradeCalendar'

// ── Component ─────────────────────────────────────────────────────────────────

export default function TradingTab() {
  const { trades, allRows, openPositions, stats, loading } = useTrades(2000)
  const { snapshot } = useAccountSnapshot()
  const currentBalance = snapshot?.balance ?? 0
  const balanceOps = allRows.filter(t => t.symbol === 'BALANCE')
  const [annotating,       setAnnotating]       = useState<Trade | null>(null)
  const [screenshotViewing, setScreenshotViewing] = useState<string | null>(null)

  const heatmap    = buildHeatmap(trades)
  const maxAbsPnl  = Math.max(1, ...( stats?.weeklyPnl.map(Math.abs) ?? [1]))

  // Best/worst setup from tags
  const tagStats = new Map<string, { wins: number; total: number }>()
  for (const t of trades) {
    for (const tag of t.tags ?? []) {
      const s = tagStats.get(tag) ?? { wins: 0, total: 0 }
      s.total++
      if ((t.net_profit ?? 0) > BE_THRESHOLD) s.wins++
      tagStats.set(tag, s)
    }
  }
  const tagArr = Array.from(tagStats.entries())
    .filter(([, s]) => s.total >= 3)
    .map(([tag, s]) => ({ tag, wr: s.wins / s.total, total: s.total }))
  const bestSetup  = tagArr.sort((a, b) => b.wr - a.wr)[0]
  const worstSetup = tagArr.sort((a, b) => a.wr - b.wr)[0]

  // Generate actual Mon-date labels for the last 7 weeks (oldest → newest)
  // Manual format (not toLocaleDateString) — avoids Node.js / browser Intl divergence
  const weekLabels = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - (6 - i) * 7)
    return `${d.getDate()} ${MON[d.getMonth()]}`
  })

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          border: '2px solid var(--bd2)',
          borderTopColor: 'var(--ac)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--t3)', fontSize: '13px' }}>Loading trades…</p>
      </div>
    )
  }

  // ── Empty state — no trades yet ────────────────────────────────────────────
  if (!loading && trades.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '20px', padding: '40px 20px', textAlign: 'center' }}>
        {/* Icon */}
        <LogoMark size={72} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ color: 'var(--t1)', fontSize: '18px', fontWeight: 600 }}>No trades yet</p>
          <p style={{ color: 'var(--t3)', fontSize: '13px', maxWidth: '320px', lineHeight: 1.6 }}>
            Connect your MT5 account to start syncing trades automatically. VELQUOR will analyse your performance in real time.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--s2)', border: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>1</span>
            <span style={{ color: 'var(--t2)', fontSize: '13px' }}>Click the MT5 button in the top bar</span>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--s2)', border: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>2</span>
            <span style={{ color: 'var(--t2)', fontSize: '13px' }}>Enter your account ID &amp; investor password</span>
          </div>
          <div style={{ padding: '12px 16px', borderRadius: '10px', background: 'var(--s2)', border: '1px solid var(--bd2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>3</span>
            <span style={{ color: 'var(--t2)', fontSize: '13px' }}>Trades sync automatically every 30 seconds</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Report download bar ── */}
      <ReportDownloadBar />

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <Panel title={
          <span className="flex items-center gap-2">
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: 'var(--gr2)',
              boxShadow: '0 0 6px var(--gr)',
              display: 'inline-block',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            Live Positions ({openPositions.length})
          </span>
        } noPadding>
          {openPositions.map(pos => {
            const unrealised = pos.net_profit ?? 0
            const isUp = unrealised >= 0
            return (
              <div key={pos.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: '1px solid var(--bd)' }}>
                <div className="flex flex-col gap-0.5" style={{ minWidth: '80px' }}>
                  <span style={{ color: 'var(--t1)', fontWeight: 600, fontSize: '13px' }}>{pos.symbol}</span>
                  <Badge variant={pos.trade_type as 'buy' | 'sell'}>{pos.trade_type.toUpperCase()}</Badge>
                </div>
                <div className="flex flex-col gap-0.5" style={{ minWidth: '80px' }}>
                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                    {pos.lot_size} lot{(pos.lot_size ?? 0) !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: '11px' }}>
                    @ {pos.open_price}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5 flex-1">
                  {pos.stop_loss && (
                    <span style={{ color: 'var(--re)', fontSize: '11px' }}>SL {pos.stop_loss}</span>
                  )}
                  {pos.take_profit && (
                    <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>TP {pos.take_profit}</span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span style={{
                    color: isUp ? 'var(--gr2)' : 'var(--re)',
                    fontWeight: 700, fontSize: '14px', letterSpacing: '-0.02em',
                  }}>
                    {isUp ? '+' : '-'}€{Math.abs(unrealised).toFixed(2)}
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: '10px' }}>
                    {pos.open_time ? fmtDate(pos.open_time) + ' · ' + fmtTime(pos.open_time) : '—'}
                  </span>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {/* Live chart — official TradingView embed */}
      <Panel title="Live Chart" noPadding>
        <div className="tv-chart-wrap">
          <AdvancedChart symbol="OANDA:XAUUSD" height="100%" />
        </div>
      </Panel>

      {/* Metrics with period selectors */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <PeriodMetricCard
          title="P&L"
          barColor="var(--gr)"
          getValue={(p) => {
            const t   = filterByPeriod(trades, p)
            const pnl = calcPnl(t)
            return { value: fmtPnl(pnl), change: `${t.length} trade${t.length !== 1 ? 's' : ''}`, changePositive: pnl >= 0 ? true : false }
          }}
        />
        <PeriodMetricCard
          title="Win Rate"
          barColor="var(--ac)"
          getValue={(p) => {
            const { rate, wins, losses, breakeven, total } = calcWinRate(filterByPeriod(trades, p))
            const label = breakeven > 0 ? `${wins}W · ${breakeven}BE · ${losses}L` : `${wins}W · ${losses}L`
            return { value: total > 0 ? `${rate.toFixed(1)}%` : '—', change: label, changePositive: rate >= 50 ? true : rate === 0 ? null : false }
          }}
        />
        <PeriodMetricCard
          title="Real R:R"
          barColor="var(--am)"
          getValue={(p) => {
            const rr = calcAvgRR(filterByPeriod(trades, p))
            const hasData = trades.filter(t => t.stop_loss && t.open_price && t.close_price).length > 0
            return {
              value:          hasData ? rr.toFixed(2) : '—',
              change:         !hasData ? 'No SL data' : rr >= 1.5 ? 'Above target' : rr >= 0 ? 'Below 1.5 target' : 'Negative — cutting losses short',
              changePositive: !hasData ? null : rr >= 1.5 ? true : false,
            }
          }}
        />
        <PeriodMetricCard
          title="Max Drawdown"
          barColor="var(--re)"
          getValue={(p) => {
            const dd = calcMaxDrawdown(filterByPeriod(trades, p))
            return { value: dd < 0 ? `€${Math.abs(dd).toFixed(2)}` : '€0.00', change: dd < 0 ? 'Worst single day' : 'No losing days', changePositive: dd === 0 ? true : false }
          }}
        />
        <PeriodMetricCard
          title="Withdrawn"
          barColor="var(--am)"
          getValue={(p) => {
            const ops = filterByPeriod(balanceOps, p)
            const withdrawn = ops
              .filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
              .reduce((s, t) => s + Math.abs(t.net_profit ?? 0), 0)
            const deposited = ops
              .filter(t => (t.net_profit ?? 0) > BE_THRESHOLD)
              .reduce((s, t) => s + (t.net_profit ?? 0), 0)
            const label = deposited > 0
              ? `+€${deposited.toFixed(2)} deposited`
              : ops.length === 0 ? 'No activity' : 'Trading profits only'
            return {
              value: withdrawn > 0 ? `€${withdrawn.toFixed(2)}` : '€0.00',
              change: label,
              changePositive: null,
            }
          }}
        />
      </div>

      {/* Equity Curve + Daily P&L Calendar — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <EquityCurve trades={trades} />
        <Panel title="Daily P&L Calendar" accent="var(--gr)" className="h-full">
          <TradeCalendar allRows={allRows} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Trade Log */}
        <div className="lg:col-span-3">
          <TradeLogTable trades={trades} loading={loading} onAnnotate={setAnnotating} onViewScreenshot={setScreenshotViewing} />
        </div>

        {/* Stats + Position Size */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Panel title="Performance Stats">
            <div className="flex flex-col gap-3">

              {/* Professional Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  {
                    label: 'Profit Factor',
                    value: !stats ? '—' : stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2),
                    color: !stats ? 'var(--t3)' : stats.profitFactor >= 1.5 ? 'var(--gr2)' : stats.profitFactor >= 1 ? 'var(--am2)' : 'var(--re)',
                    sub:   !stats ? '' : stats.profitFactor >= 1.5 ? 'Strong edge' : stats.profitFactor >= 1 ? 'Breakeven+' : 'Losing',
                  },
                  {
                    label: 'Expectancy',
                    value: !stats ? '—' : `${stats.expectancy >= 0 ? '+' : ''}€${stats.expectancy.toFixed(2)}`,
                    color: !stats ? 'var(--t3)' : stats.expectancy > 0 ? 'var(--gr2)' : 'var(--re)',
                    sub:   'per trade',
                  },
                  {
                    label: 'Avg Win',
                    value: !stats ? '—' : `€${stats.avgWin.toFixed(2)}`,
                    color: 'var(--gr2)',
                    sub:   `${stats?.maxConsecWins ?? 0} max streak`,
                  },
                  {
                    label: 'Avg Loss',
                    value: !stats ? '—' : `€${stats.avgLoss.toFixed(2)}`,
                    color: 'var(--re)',
                    sub:   `${stats?.maxConsecLosses ?? 0} max streak`,
                  },
                ].map(m => (
                  <div key={m.label} style={{
                    padding: '10px 12px', borderRadius: '8px',
                    background: 'var(--s2)', border: '1px solid var(--bd)',
                  }}>
                    <p style={{ color: 'var(--t3)', fontSize: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</p>
                    <p style={{ color: m.color, fontSize: '17px', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '3px' }}>{m.value}</p>
                    <p style={{ color: 'var(--t3)', fontSize: '10px' }}>{m.sub}</p>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--bd)' }} />

              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Win Rate by Pair</p>
                {[
                  { label:'XAUUSD', wr: stats?.xauWinRate ?? 0, color:'var(--go2)' },
                  { label:'NAS100', wr: stats?.nasWinRate ?? 0, color:'var(--ac)'  },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'56px' }}>{item.label}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height:'4px', background:'var(--s3)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background:item.color, borderRadius:'4px' }}/>
                    </div>
                    <span className="num" style={{ color:'var(--t1)', fontSize:'13px', fontWeight:700, minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Win Rate by Session</p>
                {[
                  { label:'London',   wr: stats?.londonWinRate ?? 0, color:'var(--ac)'  },
                  { label:'New York', wr: stats?.nyWinRate     ?? 0, color:'var(--am2)' },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'64px' }}>{item.label}</span>
                    <div className="flex-1 rounded-full overflow-hidden" style={{ height:'4px', background:'var(--s3)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background:item.color, borderRadius:'4px' }}/>
                    </div>
                    <span className="num" style={{ color:'var(--t1)', fontSize:'13px', fontWeight:700, minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div className="flex flex-col gap-2">
                {bestSetup && (
                  <div className="flex items-start justify-between">
                    <span style={{ color:'var(--t3)', fontSize:'11px' }}>Best tag</span>
                    <div className="text-right">
                      <p style={{ color:'var(--gr2)', fontSize:'12px', fontWeight:500 }}>#{bestSetup.tag}</p>
                      <p style={{ color:'var(--t3)', fontSize:'11px' }}>{(bestSetup.wr*100).toFixed(0)}% win · {bestSetup.total} trades</p>
                    </div>
                  </div>
                )}
                {worstSetup && worstSetup.tag !== bestSetup?.tag && (
                  <div className="flex items-start justify-between">
                    <span style={{ color:'var(--t3)', fontSize:'11px' }}>Worst tag</span>
                    <div className="text-right">
                      <p style={{ color:'var(--re)', fontSize:'12px', fontWeight:500 }}>#{worstSetup.tag}</p>
                      <p style={{ color:'var(--t3)', fontSize:'11px' }}>{(worstSetup.wr*100).toFixed(0)}% win · {worstSetup.total} trades</p>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              {/* Weekly P&L — bidirectional bar chart */}
              <div>
                <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Last 7 Weeks P&L</p>
                {/* Chart area: 40px above zero + 40px below zero */}
                <div style={{ position:'relative', height:'88px' }}>
                  {/* Zero line */}
                  <div style={{
                    position:'absolute', top:'50%', left:0, right:0,
                    height:'1px', background:'var(--bd2)', zIndex:1,
                  }} />
                  <div className="flex items-stretch gap-1" style={{ height:'100%' }}>
                    {(stats?.weeklyPnl ?? Array(7).fill(0)).map((pnl, i) => {
                      const pct  = Math.abs(pnl) / maxAbsPnl           // 0–1
                      const barH = Math.max(3, pct * 40)               // max 40px each side
                      const isPos = pnl >= 0
                      const color = isPos ? 'var(--gr2)' : 'var(--re)'
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-center" style={{ gap:0 }}
                          title={`${weekLabels[i]}: ${pnl >= 0 ? '+' : ''}€${pnl.toFixed(2)}`}>
                          {/* Upper half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-end', width:'100%' }}>
                            {isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color, borderRadius:'3px 3px 0 0',
                                opacity: 0.85,
                              }} />
                            )}
                          </div>
                          {/* Lower half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-start', width:'100%' }}>
                            {!isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color, borderRadius:'0 0 3px 3px',
                                opacity: 0.85,
                              }} />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Week date labels */}
                <div className="flex gap-1" style={{ marginTop:'6px' }}>
                  {weekLabels.map((label, i) => (
                    <div key={i} className="flex-1 text-center">
                      <span style={{ fontSize:'9px', color:'var(--t3)', whiteSpace:'nowrap' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* Trade Annotation Modal */}
      {annotating && (
        <TradeAnnotationModal
          trade={annotating}
          onClose={() => setAnnotating(null)}
        />
      )}

      {/* Screenshot Lightbox */}
      {screenshotViewing && (
        <>
          <div
            onClick={() => setScreenshotViewing(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', cursor: 'zoom-out' }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', pointerEvents: 'none' }}>
            <img
              src={screenshotViewing}
              alt="Trade screenshot"
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '12px', boxShadow: '0 32px 80px rgba(0,0,0,0.8)', pointerEvents: 'auto' }}
            />
          </div>
          <button
            onClick={() => setScreenshotViewing(null)}
            style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 52, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: 'white', fontSize: '18px', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </>
      )}

      {/* Your Edge */}
      <YourEdge trades={trades} />

      {/* Statistical Analysis — full analytics panel */}
      <TradingInsights trades={trades} allRows={allRows} />

      {/* Session Heatmap — kept for visual quick reference */}
      {/* Analytics — session / symbol / direction breakdown */}
      <Panel title="Analytics Breakdown" accent="var(--ac)">
        <SessionAnalyticsChart />
      </Panel>

      <Panel title="Session Heatmap — Win Rate (from your real trades)">
        <div className="flex flex-col gap-2">
          {['London','Overlap','NY'].map(session => (
            <div key={session} className="flex items-center gap-2">
              <span style={{ color:'var(--t2)', fontSize:'12px', minWidth:'56px' }}>{session}</span>
              <div className="flex gap-1.5 flex-1">
                {heatmap.filter(h => h.session === session).map(h => {
                  const c = heatColor(h.winRate, h.trades)
                  return (
                    <div key={h.day}
                      className="flex-1 flex flex-col items-center justify-center rounded-md py-2 gap-0.5"
                      style={{ background:c.bg, minHeight:'52px' }}
                      title={`${session} ${h.day}: ${Math.round(h.winRate*100)}% (${h.trades} trades)`}>
                      <span style={{ fontSize:'11px', color:'var(--t3)' }}>{h.day}</span>
                      {h.trades > 0 ? (
                        <>
                          <span style={{ fontSize:'13px', fontWeight:500, color:c.color }}>{Math.round(h.winRate*100)}%</span>
                          <span style={{ fontSize:'10px', color:'var(--t3)' }}>{h.trades}t</span>
                        </>
                      ) : (
                        <span style={{ fontSize:'11px', color:'var(--t3)' }}>—</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Screenshot Gallery */}
      <Panel title={`Screenshot Gallery (${trades.filter(t => t.screenshot_close_url || t.screenshot_open_url || t.screenshot_user_url).length})`} accent="var(--cy2)">
        <ScreenshotGallery trades={trades} />
      </Panel>

    </div>
  )
}
