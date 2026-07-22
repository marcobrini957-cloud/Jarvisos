'use client'

import { useState } from 'react'
import { useTrades, tradeResult } from '@/hooks/useTrades'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import PeriodMetricCard, { type Period } from '@/components/ui/PeriodMetricCard'
import { LogoMark } from '@/components/ui/LogoMark'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import ScreenshotGallery from '@/components/ui/ScreenshotGallery'
import SessionAnalyticsChart from '@/components/ui/SessionAnalyticsChart'
import type { Trade } from '@/types'
import { BE_THRESHOLD } from '@/lib/trading/stats'
import {
  filterByPeriod, calcPnl, calcWinRate, calcMaxDrawdown,
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
import { WinRing } from './overview/WinRing'
import { PnlDonut } from './trading/PnlDonut'
import { MetricRing } from './trading/MetricRing'

// ── Component ─────────────────────────────────────────────────────────────────

// Timeframe wording for the personalised info popovers.
const PERIOD_PHRASE: Record<Period, string> = {
  D: 'today', W: 'this week', M: 'this month', Q: 'this quarter', Y: 'this year',
}
const eur = (v: number) => `€${Math.abs(v).toFixed(2)}`

// Consistency = share of trading days that closed in profit (style-agnostic).
function calcConsistency(trades: Trade[]): { green: number; totalDays: number; pct: number } {
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

export default function TradingTab() {
  const { trades, allRows, openPositions, stats, loading } = useTrades(2000)
  const { snapshot } = useAccountSnapshot()
  const currentBalance = snapshot?.balance ?? 0
  const balanceOps = allRows.filter(t => t.symbol === 'BALANCE')
  // Cash flow (all-time) — an account fact, kept out of the performance KPI row.
  const totalWithdrawn = balanceOps.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).reduce((s, t) => s + Math.abs(t.net_profit ?? 0), 0)
  const totalDeposited = balanceOps.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).reduce((s, t) => s + (t.net_profit ?? 0), 0)
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
          getInfo={(p) => {
            const t      = filterByPeriod(trades, p)
            const profit = t.reduce((s, x) => s + Math.max(0, x.net_profit ?? 0), 0)
            const loss   = Math.abs(t.reduce((s, x) => s + Math.min(0, x.net_profit ?? 0), 0))
            const pnl    = profit - loss
            const pf     = loss > 0 ? profit / loss : profit > 0 ? Infinity : 0
            const phrase = PERIOD_PHRASE[p]
            if (t.length === 0) return <>You have no closed trades {phrase} yet, so there&apos;s nothing to show here for this timeframe.</>
            return <>Across your {t.length} trade{t.length !== 1 ? 's' : ''} {phrase}, you&apos;re {pnl >= 0 ? 'up' : 'down'} <strong style={{ color: pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{eur(pnl)}</strong>. The donut splits that into <strong style={{ color: 'var(--gr2)' }}>{eur(profit)} won</strong> (green) and <strong style={{ color: 'var(--re)' }}>{eur(loss)} lost</strong> (red). The centre number is your profit factor, <strong style={{ color: 'var(--t1)' }}>{pf === Infinity ? '∞' : pf.toFixed(2)}</strong>{pf === Infinity ? <> — you have no losing trades {phrase}.</> : <> — you made €{pf.toFixed(2)} for every €1 you lost.</>}</>
          }}
          getValue={(p) => {
            const t   = filterByPeriod(trades, p)
            const pnl = calcPnl(t)
            return { value: fmtPnl(pnl), change: `${t.length} trade${t.length !== 1 ? 's' : ''}`, changePositive: pnl >= 0 ? true : false }
          }}
          getVisual={(p) => {
            const t      = filterByPeriod(trades, p)
            const profit = t.reduce((s, x) => s + Math.max(0, x.net_profit ?? 0), 0)
            const loss   = Math.abs(t.reduce((s, x) => s + Math.min(0, x.net_profit ?? 0), 0))
            return <PnlDonut profit={profit} loss={loss} />
          }}
        />
        <PeriodMetricCard
          title="Win Rate"
          barColor="var(--ac)"
          getInfo={(p) => {
            const { rate, wins, losses, breakeven, total } = calcWinRate(filterByPeriod(trades, p))
            const phrase = PERIOD_PHRASE[p]
            if (total === 0) return <>No closed trades {phrase} yet — take some trades in this timeframe and your win rate will appear here.</>
            const decisive = wins + losses
            const quality  = rate >= 65 ? 'That’s a strong hit-rate.' : rate >= 50 ? 'That’s a solid, positive hit-rate.' : 'That’s below 50% — you’re relying on your winners being bigger than your losers.'
            return <>Of your {decisive} decisive trade{decisive !== 1 ? 's' : ''} {phrase}, <strong style={{ color: 'var(--t1)' }}>{wins} won and {losses} lost</strong>{breakeven > 0 ? <> ({breakeven} broke even, which don&apos;t count)</> : null} — a win rate of <strong style={{ color: rate >= 50 ? 'var(--gr2)' : 'var(--re)' }}>{rate.toFixed(0)}%</strong>. {quality}</>
          }}
          getValue={(p) => {
            const { rate, wins, losses, breakeven, total } = calcWinRate(filterByPeriod(trades, p))
            const label = breakeven > 0 ? `${wins}W · ${breakeven}BE · ${losses}L` : `${wins}W · ${losses}L`
            return { value: total > 0 ? `${rate.toFixed(0)}%` : '—', change: label, changePositive: rate >= 50 ? true : rate === 0 ? null : false }
          }}
          getVisual={(p) => {
            const { rate, total } = calcWinRate(filterByPeriod(trades, p))
            return total > 0 ? <WinRing wr={rate} /> : null
          }}
        />
        <PeriodMetricCard
          title="Expectancy"
          barColor="var(--am)"
          getInfo={(p) => {
            const t      = filterByPeriod(trades, p)
            const phrase = PERIOD_PHRASE[p]
            if (t.length === 0) return <>No closed trades {phrase} yet, so there&apos;s no expectancy to show for this timeframe.</>
            const exp = calcPnl(t) / t.length
            return <>Expectancy is what you earn on an <strong style={{ color: 'var(--t1)' }}>average trade</strong> — it blends your win rate and your win/loss sizes into one honest number, so it&apos;s fair to every style. Across your {t.length} trade{t.length !== 1 ? 's' : ''} {phrase}, you {exp >= 0 ? 'made' : 'lost'} <strong style={{ color: exp >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{eur(exp)}</strong> per trade on average. {exp >= 0 ? 'Positive means you have a real edge — a wide stop with a high win rate counts just as much as a tight stop with a low one.' : 'Negative means the average trade is currently costing you money.'}</>
          }}
          getValue={(p) => {
            const t = filterByPeriod(trades, p)
            if (t.length === 0) return { value: '—', change: 'No trades', changePositive: null }
            const exp = calcPnl(t) / t.length
            return { value: `${exp >= 0 ? '+' : '-'}€${Math.abs(exp).toFixed(2)}`, change: `avg per trade · ${t.length}`, changePositive: exp > 0 ? true : exp < 0 ? false : null }
          }}
          getVisual={(p) => {
            const t       = filterByPeriod(trades, p)
            const wins    = t.filter(x => (x.net_profit ?? 0) >  BE_THRESHOLD)
            const losses  = t.filter(x => (x.net_profit ?? 0) < -BE_THRESHOLD)
            const avgWin  = wins.length   ? wins.reduce((s, x) => s + (x.net_profit ?? 0), 0) / wins.length : 0
            const avgLoss = losses.length ? Math.abs(losses.reduce((s, x) => s + (x.net_profit ?? 0), 0)) / losses.length : 0
            const tot     = avgWin + avgLoss
            if (tot === 0) return null
            // Green slice = average win size, red = average loss size (the payoff balance).
            return <MetricRing pct={(avgWin / tot) * 100} color="var(--gr2)" glow="rgba(0,232,122,0.45)" track="var(--re)" />
          }}
        />
        <PeriodMetricCard
          title="Max Drawdown"
          barColor="var(--re)"
          getInfo={(p) => {
            const dd     = calcMaxDrawdown(filterByPeriod(trades, p))
            const phrase = PERIOD_PHRASE[p]
            if (dd >= 0) return <>You had no losing days {phrase} — no drawdown to show for this timeframe. Nice.</>
            return <>Your worst single day {phrase} lost <strong style={{ color: 'var(--re)' }}>{eur(dd)}</strong>. This is the most your account dropped in one day — a gut-check on how much heat you took at your worst.</>
          }}
          getValue={(p) => {
            const dd = calcMaxDrawdown(filterByPeriod(trades, p))
            return { value: dd < 0 ? `€${Math.abs(dd).toFixed(2)}` : '€0.00', change: dd < 0 ? 'Worst single day' : 'No losing days', changePositive: dd === 0 ? true : false }
          }}
          getVisual={(p) => {
            const dd = calcMaxDrawdown(filterByPeriod(trades, p))
            if (dd >= 0) return <MetricRing pct={100} color="var(--gr2)" glow="rgba(0,232,122,0.45)" center="0%" sub="of bal" />
            const pct = currentBalance > 0 ? Math.abs(dd) / currentBalance * 100 : null
            return <MetricRing pct={pct != null ? Math.min(100, pct) : 30} color="var(--re)" glow="rgba(255,61,80,0.45)" center={pct != null ? `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%` : '—'} sub="of bal" />
          }}
        />
        <PeriodMetricCard
          title="Consistency"
          barColor="var(--ac)"
          getInfo={(p) => {
            const { green, totalDays, pct } = calcConsistency(filterByPeriod(trades, p))
            const phrase = PERIOD_PHRASE[p]
            if (totalDays === 0) return <>You have no closed trades {phrase} yet, so there are no trading days to measure here.</>
            const cap = phrase.charAt(0).toUpperCase() + phrase.slice(1)
            return <>This looks only at the <strong style={{ color: 'var(--t1)' }}>days you actually traded</strong> — not every calendar day. {cap} you closed trades on <strong style={{ color: 'var(--t1)' }}>{totalDays}</strong> separate day{totalDays !== 1 ? 's' : ''}, and <strong style={{ color: pct >= 50 ? 'var(--gr2)' : 'var(--re)' }}>{green}</strong> of them finished in profit — a day counts as green when that day&apos;s trades add up to a net gain. That&apos;s <strong style={{ color: pct >= 50 ? 'var(--gr2)' : 'var(--re)' }}>{pct.toFixed(0)}%</strong>. It rewards being green regularly rather than letting one big day carry everything. (Days you didn&apos;t trade are ignored.)</>
          }}
          getValue={(p) => {
            const { green, totalDays, pct } = calcConsistency(filterByPeriod(trades, p))
            return {
              value:          totalDays > 0 ? `${pct.toFixed(0)}%` : '—',
              change:         totalDays > 0 ? `${green}/${totalDays} traded days green` : 'No trading days',
              changePositive: totalDays === 0 ? null : pct >= 50 ? true : false,
            }
          }}
          getVisual={(p) => {
            const { totalDays, pct } = calcConsistency(filterByPeriod(trades, p))
            if (totalDays === 0) return null
            const [color, glow] = pct >= 60 ? ['var(--gr2)', 'rgba(0,232,122,0.45)'] : pct >= 40 ? ['var(--am2)', 'rgba(240,168,64,0.45)'] : ['var(--re)', 'rgba(255,61,80,0.45)']
            return <MetricRing pct={pct} color={color} glow={glow} center={`${pct.toFixed(0)}%`} sub="green" />
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

              {/* Cash flow — deposits / withdrawals (account fact, not performance) */}
              {(totalWithdrawn > 0 || totalDeposited > 0) && (
                <>
                  <div style={{ height:'1px', background:'var(--bd)' }}/>
                  <div>
                    <p style={{ color:'var(--t3)', fontSize:'11px', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>Cash Flow (all-time)</p>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color:'var(--t2)', fontSize:'12px' }}>Deposited</span>
                      <span className="num" style={{ color:'var(--gr2)', fontSize:'13px', fontWeight:600 }}>€{totalDeposited.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color:'var(--t2)', fontSize:'12px' }}>Withdrawn</span>
                      <span className="num" style={{ color:'var(--am2)', fontSize:'13px', fontWeight:600 }}>€{totalWithdrawn.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
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
