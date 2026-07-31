'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTrades, tradeResult } from '@/hooks/useTrades'
import { useAccountSnapshot } from '@/hooks/useAccountSnapshot'
import PeriodMetricCard, { type Period } from '@/components/ui/PeriodMetricCard'
import { LogoMark } from '@/components/ui/LogoMark'
import Panel from '@/components/ui/Panel'
import Badge from '@/components/ui/Badge'
import ScreenshotGallery from '@/components/ui/ScreenshotGallery'
import SessionAnalyticsChart from '@/components/ui/SessionAnalyticsChart'
import type { Trade } from '@/types'
import { periodReturnPct, type ReturnEvent } from '@/lib/trading/returns'
import {
  filterByPeriod, calcPnl, calcWinRate, calcPips,
  fmtPnl, fmtPips, fmtDate, fmtTime, MON, buildHeatmap, heatColor,
} from './trading/helpers'
import { TradeAnnotationModal } from './trading/TradeAnnotationModal'
import { TradeLogTable } from './trading/TradeLogTable'
import { TradingInsights } from './trading/TradingInsights'
import { YourEdge } from './trading/YourEdge'
import { EquityCurve } from './trading/EquityCurve'
import { ReportDownloadBar } from './trading/ReportDownloadBar'
import { LiveChart } from './trading/LiveChart'
import { TradeCalendar } from './overview/TradeCalendar'
import { WinRing } from './overview/WinRing'
import { PnlDonut } from './trading/PnlDonut'
import { MetricRing } from './trading/MetricRing'
import { Label, Num } from '@/components/ui/vq'
import { useClassifier } from '@/context/UserProfileContext'

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
  const { isWin } = useClassifier()
  const { trades, allRows, openPositions, stats, loading } = useTrades(2000)
  const { snapshot } = useAccountSnapshot()
  const balance = snapshot?.balance ?? 0
  const balanceOps = allRows.filter(t => t.symbol === 'BALANCE')
  // Cash flow (all-time) — an account fact, kept out of the performance KPI row.
  // Deliberately a plain sign test, NOT the trade win/loss rule: a deposit is
  // not a trade. Balance rows carry no lot size and no pips, so classifying
  // them with tradeResult would call every transfer a break-even and this
  // would read €0.
  const totalWithdrawn = balanceOps.filter(t => (t.net_profit ?? 0) < 0).reduce((s, t) => s + Math.abs(t.net_profit ?? 0), 0)
  const totalDeposited = balanceOps.filter(t => (t.net_profit ?? 0) > 0).reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const [annotating,       setAnnotating]       = useState<Trade | null>(null)
  const [screenshotViewing, setScreenshotViewing] = useState<string | null>(null)

  const heatmap    = buildHeatmap(trades)
  const maxAbsPnl  = Math.max(1, ...( stats?.weeklyPnl.map(Math.abs) ?? [1]))

  // Percent return for a period, time-weighted so deposits and withdrawals move
  // the capital base without ever counting as performance. This is what makes
  // the figure agree with the Growth line in MetaTrader's own report.
  const returnPctFor = (p: Period): number => {
    const periodTrades = filterByPeriod(trades, p)
    if (periodTrades.length === 0 || balance <= 0) return 0
    const earliest = periodTrades
      .map(t => t.close_time ?? '')
      .filter(Boolean)
      .sort()[0]
    if (!earliest) return 0

    const events: ReturnEvent[] = [
      ...periodTrades.map(t => ({ at: t.close_time!, amount: t.net_profit ?? 0, kind: 'trade' as const })),
      ...balanceOps
        .filter(t => t.close_time && t.close_time >= earliest)
        .map(t => ({ at: t.close_time!, amount: t.net_profit ?? 0, kind: 'funding' as const })),
    ]
    return periodReturnPct({ endBalance: balance, events })
  }

  // Best/worst setup from tags
  const tagStats = new Map<string, { wins: number; total: number }>()
  for (const t of trades) {
    for (const tag of t.tags ?? []) {
      const s = tagStats.get(tag) ?? { wins: 0, total: 0 }
      s.total++
      if (isWin(t)) s.wins++
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
          width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid var(--color-line-1)',
          borderTopColor: 'var(--color-ink-1)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <Label>Loading trades</Label>
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
          <p style={{ color: 'var(--color-ink-1)', fontSize: 'var(--text-lg)' }}>No trades yet</p>
          <p style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-base)', maxWidth: '320px', lineHeight: 1.6 }}>
            Connect your MT5 account to start syncing trades automatically. VELQUOR will analyse your performance in real time.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '280px' }}>
          {[
            'Install the VELQUOR EA in your MetaTrader 5',
            'Paste your API key into the EA inputs',
            'Every trade syncs by itself from then on',
          ].map((text, i) => (
            <div key={text} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <Num size="sm" tone="muted">{i + 1}</Num>
              <span style={{ color: 'var(--color-ink-2)', fontSize: 'var(--text-base)' }}>{text}</span>
            </div>
          ))}
          <Link
            href="/connect"
            style={{
              marginTop: '6px', padding: '11px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--color-ink-1)', color: 'var(--color-void)', fontSize: 'var(--text-base)',
              textAlign: 'center',
            }}
          >
            Connect MetaTrader 5 →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ── Report download bar ── */}
      <ReportDownloadBar />

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <Panel title={
          <span className="flex items-center gap-2">
            <span className="vq-num" style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--color-up)', display: 'inline-block',
              animation: 'pulse-dot 1.5s ease-in-out infinite',
            }} />
            Live positions ({openPositions.length})
          </span>
        } noPadding>
          {openPositions.map(pos => {
            const unrealised = pos.net_profit ?? 0
            const isUp = unrealised >= 0
            return (
              <div key={pos.id}
                className="flex items-center gap-3"
                style={{ padding: '8px 14px', borderBottom: '1px solid var(--color-line-1)' }}>
                <div className="flex items-center gap-2" style={{ minWidth: '120px' }}>
                  <Num size="sm" tone="neutral">{pos.symbol}</Num>
                  <Badge variant={pos.trade_type as 'buy' | 'sell'}>{pos.trade_type}</Badge>
                </div>
                <Num size="xs" tone="muted" style={{ minWidth: '112px' }}>
                  {pos.lot_size} lot @ {pos.open_price}
                </Num>
                <div className="flex items-center gap-3 flex-1">
                  {pos.stop_loss   ? <Num size="xs" tone="down">SL {pos.stop_loss}</Num> : null}
                  {pos.take_profit ? <Num size="xs" tone="up">TP {pos.take_profit}</Num> : null}
                </div>
                <div className="flex items-center gap-3">
                  <Num size="2xs" tone="muted">
                    {pos.open_time ? fmtDate(pos.open_time) + ' · ' + fmtTime(pos.open_time) : '—'}
                  </Num>
                  <Num size="md" value={unrealised} tone="auto">
                    {isUp ? '+' : '-'}€{Math.abs(unrealised).toFixed(2)}
                  </Num>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {/* Live chart — real-time TradingView data, follows your instrument, all timeframes */}
      <Panel title="Live chart" noPadding>
        <LiveChart trades={trades} openPositions={openPositions} />
      </Panel>

      {/* Metrics with period selectors */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
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
            return { value: fmtPnl(pnl), change: `${t.length} trade${t.length !== 1 ? 's' : ''}`, changePositive: null }
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
            return { value: total > 0 ? `${rate.toFixed(0)}%` : '—', change: label, changePositive: null }
          }}
          getVisual={(p) => {
            const { rate, total } = calcWinRate(filterByPeriod(trades, p))
            return total > 0 ? <WinRing wr={rate} /> : null
          }}
        />
        <PeriodMetricCard
          title="Return"
          barColor="var(--am)"
          getInfo={(p) => {
            const t      = filterByPeriod(trades, p)
            const phrase = PERIOD_PHRASE[p]
            if (t.length === 0) return <>No closed trades {phrase} yet, so there&apos;s no return to show for this timeframe.</>
            const pnl = calcPnl(t)
            if (balance <= 0) return <>Across your {t.length} trade{t.length !== 1 ? 's' : ''} {phrase} you {pnl >= 0 ? 'made' : 'lost'} <strong style={{ color: pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{eur(pnl)}</strong>. Connect your MT5 account so we know your balance and can show this as a percentage return.</>
            const pct = returnPctFor(p)
            return <>Return is your net P&amp;L over this period as a <strong style={{ color: 'var(--t1)' }}>percentage of the capital you were actually trading</strong> — money you paid in or took out never counts as profit, so this matches the Growth figure in MetaTrader&apos;s own report. Across your {t.length} trade{t.length !== 1 ? 's' : ''} {phrase}, you {pnl >= 0 ? 'made' : 'lost'} <strong style={{ color: pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{eur(pnl)}</strong> — a <strong style={{ color: pct >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{pct >= 0 ? '+' : ''}{pct.toFixed(2)}%</strong> return.</>
          }}
          getValue={(p) => {
            const t = filterByPeriod(trades, p)
            if (t.length === 0) return { value: '—', change: 'No trades', changePositive: null }
            const pnl = calcPnl(t)
            if (balance <= 0) return { value: fmtPnl(pnl), change: `${t.length} trade${t.length !== 1 ? 's' : ''} · connect MT5 for %`, changePositive: pnl > 0 ? true : pnl < 0 ? false : null }
            const pct = returnPctFor(p)
            return { value: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, change: `${fmtPnl(pnl)} · ${t.length} trade${t.length !== 1 ? 's' : ''}`, changePositive: pct > 0 ? true : pct < 0 ? false : null }
          }}
        />
        <PeriodMetricCard
          title="Overall Pips"
          barColor="var(--cy)"
          getInfo={(p) => {
            const t      = filterByPeriod(trades, p)
            const phrase = PERIOD_PHRASE[p]
            const sized  = t.filter(x => x.lot_size && x.net_profit != null)
            if (sized.length === 0) return <>No sized trades {phrase} yet, so there are no pips to tally for this timeframe.</>
            const pips = calcPips(t)
            return <>Pips here are <strong style={{ color: 'var(--t1)' }}>size-normalised</strong> and work the same on any instrument — EURUSD, Nasdaq, gold, whatever. The rule: <strong style={{ color: 'var(--t1)' }}>€100 on a 0.10 lot = 100 pips</strong> (i.e. €10 per pip on a full lot). Across your {sized.length} trade{sized.length !== 1 ? 's' : ''} {phrase}, you banked <strong style={{ color: pips >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{pips >= 0 ? '+' : ''}{pips.toFixed(1)} pips</strong>. It strips out position size so a big lot and a small lot are judged on the move you caught, not the euros.</>
          }}
          getValue={(p) => {
            const t     = filterByPeriod(trades, p)
            const sized = t.filter(x => x.lot_size && x.net_profit != null)
            if (sized.length === 0) return { value: '—', change: 'No sized trades', changePositive: null }
            const pips = calcPips(t)
            return { value: fmtPips(pips), change: `across ${sized.length} trade${sized.length !== 1 ? 's' : ''}`, changePositive: null }
          }}
          getVisual={(p) => {
            const t         = filterByPeriod(trades, p)
            const sized     = t.filter(x => x.lot_size && x.net_profit != null)
            if (sized.length === 0) return null
            const wonPips   = sized.reduce((s, x) => s + Math.max(0, (x.net_profit ?? 0) / (x.lot_size! * 10)), 0)
            const lostPips  = sized.reduce((s, x) => s + Math.abs(Math.min(0, (x.net_profit ?? 0) / (x.lot_size! * 10))), 0)
            const tot       = wonPips + lostPips
            if (tot === 0) return null
            const net       = wonPips - lostPips
            // Green arc = pips won, red = pips given back — the pip payoff balance.
            return <MetricRing pct={(wonPips / tot) * 100} color="var(--color-up)" track="var(--color-down)" center={`${net >= 0 ? '+' : ''}${Math.round(net)}`} sub="pips" />
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
              changePositive: null,
            }
          }}
          getVisual={(p) => {
            const { totalDays, pct } = calcConsistency(filterByPeriod(trades, p))
            if (totalDays === 0) return null
            const color = pct >= 60 ? 'var(--color-up)' : pct >= 40 ? 'var(--color-ink-2)' : 'var(--color-down)'
            return <MetricRing pct={pct} color={color} center={`${pct.toFixed(0)}%`} sub="green" />
          }}
        />
      </div>

      {/* Equity Curve + Daily P&L Calendar — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
        <EquityCurve trades={trades} />
        <Panel title="Trading calendar" className="h-full">
          <TradeCalendar allRows={allRows} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Trade Log */}
        <div className="lg:col-span-3">
          <TradeLogTable trades={trades} loading={loading} onAnnotate={setAnnotating} onViewScreenshot={setScreenshotViewing} />
        </div>

        {/* Stats + Position Size */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Panel title="Performance stats">
            <div className="flex flex-col gap-3">

              {/* Professional Key Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  {
                    label: 'Profit factor',
                    value: !stats ? '—' : stats.profitFactor >= 99 ? '∞' : stats.profitFactor.toFixed(2),
                    color: !stats ? 'var(--color-ink-3)' : stats.profitFactor >= 1.5 ? 'var(--color-ink-1)' : stats.profitFactor >= 1 ? 'var(--color-ink-2)' : 'var(--color-down)',
                    sub:   !stats ? '' : stats.profitFactor >= 1.5 ? 'Strong edge' : stats.profitFactor >= 1 ? 'Breakeven+' : 'Losing',
                  },
                  {
                    label: 'Expectancy',
                    value: !stats ? '—' : `${stats.expectancy >= 0 ? '+' : ''}€${stats.expectancy.toFixed(2)}`,
                    color: !stats ? 'var(--color-ink-3)' : stats.expectancy > 0 ? 'var(--color-up)' : 'var(--color-down)',
                    sub:   'per trade',
                  },
                  {
                    label: 'Avg win',
                    value: !stats ? '—' : `€${stats.avgWin.toFixed(2)}`,
                    color: 'var(--color-up)',
                    sub:   `${stats?.maxConsecWins ?? 0} max streak`,
                  },
                  {
                    label: 'Avg loss',
                    value: !stats ? '—' : `€${stats.avgLoss.toFixed(2)}`,
                    color: 'var(--color-down)',
                    sub:   `${stats?.maxConsecLosses ?? 0} max streak`,
                  },
                ].map(m => (
                  <div key={m.label} style={{
                    padding: '9px 12px', borderRadius: 'var(--radius-md)',
                    background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
                  }}>
                    <Label>{m.label}</Label>
                    <div style={{ margin: '4px 0 2px' }}>
                      <Num size="lg" style={{ color: m.color }}>{m.value}</Num>
                    </div>
                    <Label>{m.sub}</Label>
                  </div>
                ))}
              </div>

              <div style={{ height: '1px', background: 'var(--bd)' }} />

              <div>
                <div style={{ marginBottom: '6px' }}><Label>Win rate by pair</Label></div>
                {[
                  { label:'XAUUSD', wr: stats?.xauWinRate ?? 0 },
                  { label:'NAS100', wr: stats?.nasWinRate ?? 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--color-ink-2)', fontSize:'var(--text-base)', minWidth:'56px' }}>{item.label}</span>
                    <div className="flex-1 overflow-hidden" style={{ height:'3px', background:'var(--color-surface-2)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background: item.wr >= 50 ? 'var(--color-ink-1)' : 'var(--color-down)' }}/>
                    </div>
                    <Num size="sm" tone="neutral" style={{ minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</Num>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div>
                <div style={{ marginBottom: '6px' }}><Label>Win rate by session</Label></div>
                {[
                  { label:'London',   wr: stats?.londonWinRate ?? 0 },
                  { label:'New York', wr: stats?.nyWinRate     ?? 0 },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2 mb-2">
                    <span style={{ color:'var(--color-ink-2)', fontSize:'var(--text-base)', minWidth:'64px' }}>{item.label}</span>
                    <div className="flex-1 overflow-hidden" style={{ height:'3px', background:'var(--color-surface-2)' }}>
                      <div style={{ width:`${item.wr}%`, height:'100%', background: item.wr >= 50 ? 'var(--color-ink-1)' : 'var(--color-down)' }}/>
                    </div>
                    <Num size="sm" tone="neutral" style={{ minWidth:'40px', textAlign:'right' }}>{item.wr.toFixed(1)}%</Num>
                  </div>
                ))}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              <div className="flex flex-col gap-2">
                {bestSetup && (
                  <div className="flex items-center justify-between">
                    <Label>Best tag</Label>
                    <div className="flex items-center gap-3">
                      <span style={{ color:'var(--color-up)', fontSize:'var(--text-base)' }}>#{bestSetup.tag}</span>
                      <Num size="xs" tone="muted">{(bestSetup.wr*100).toFixed(0)}% win · {bestSetup.total} trades</Num>
                    </div>
                  </div>
                )}
                {worstSetup && worstSetup.tag !== bestSetup?.tag && (
                  <div className="flex items-center justify-between">
                    <Label>Worst tag</Label>
                    <div className="flex items-center gap-3">
                      <span style={{ color:'var(--color-down)', fontSize:'var(--text-base)' }}>#{worstSetup.tag}</span>
                      <Num size="xs" tone="muted">{(worstSetup.wr*100).toFixed(0)}% win · {worstSetup.total} trades</Num>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ height:'1px', background:'var(--bd)' }}/>

              {/* Weekly P&L — bidirectional bar chart */}
              <div>
                <div style={{ marginBottom: '10px' }}><Label>Last 7 weeks P&L</Label></div>
                {/* Chart area: 40px above zero + 40px below zero */}
                <div style={{ position:'relative', height:'88px' }}>
                  {/* Zero line */}
                  <div style={{
                    position:'absolute', top:'50%', left:0, right:0,
                    height:'1px', background:'var(--color-line-1)', zIndex:1,
                  }} />
                  <div className="flex items-stretch gap-1" style={{ height:'100%' }}>
                    {(stats?.weeklyPnl ?? Array(7).fill(0)).map((pnl, i) => {
                      const pct  = Math.abs(pnl) / maxAbsPnl           // 0–1
                      const barH = Math.max(3, pct * 40)               // max 40px each side
                      const isPos = pnl >= 0
                      const color = isPos ? 'var(--color-up)' : 'var(--color-down)'
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-center" style={{ gap:0 }}
                          title={`${weekLabels[i]}: ${pnl >= 0 ? '+' : ''}€${pnl.toFixed(2)}`}>
                          {/* Upper half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-end', width:'100%' }}>
                            {isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color,
                              }} />
                            )}
                          </div>
                          {/* Lower half */}
                          <div style={{ height:'40px', display:'flex', alignItems:'flex-start', width:'100%' }}>
                            {!isPos && (
                              <div style={{
                                width:'100%', height:`${barH}px`,
                                background: color,
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
                      <span className="vq-num" style={{ fontSize:'var(--text-2xs)', color:'var(--color-ink-4)', whiteSpace:'nowrap' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash flow — deposits / withdrawals (account fact, not performance) */}
              {(totalWithdrawn > 0 || totalDeposited > 0) && (
                <>
                  <div style={{ height:'1px', background:'var(--bd)' }}/>
                  <div>
                    <div style={{ marginBottom: '6px' }}><Label>Cash flow (all-time)</Label></div>
                    <div className="flex items-center justify-between mb-1">
                      <span style={{ color:'var(--color-ink-2)', fontSize:'var(--text-base)' }}>Deposited</span>
                      <Num size="sm" tone="neutral">€{totalDeposited.toFixed(2)}</Num>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color:'var(--color-ink-2)', fontSize:'var(--text-base)' }}>Withdrawn</span>
                      <Num size="sm" tone="muted">€{totalWithdrawn.toFixed(2)}</Num>
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
            style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.9)', cursor: 'zoom-out' }}
          />
          <div style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', pointerEvents: 'none' }}>
            <img
              src={screenshotViewing}
              alt="Trade screenshot"
              style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-line-1)', pointerEvents: 'auto' }}
            />
          </div>
          <button
            onClick={() => setScreenshotViewing(null)}
            style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 52, background: 'var(--color-surface-2)', border: '1px solid var(--color-line-2)', borderRadius: 'var(--radius-sm)', color: 'var(--color-ink-1)', fontSize: 'var(--text-lg)', width: '30px', height: '30px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
      <Panel title="Analytics breakdown">
        <SessionAnalyticsChart />
      </Panel>

      <Panel title="Session heatmap — win rate from your real trades">
        <div className="flex flex-col gap-2">
          {['London','Overlap','NY'].map(session => (
            <div key={session} className="flex items-center gap-2">
              <span style={{ color:'var(--color-ink-2)', fontSize:'var(--text-base)', minWidth:'56px' }}>{session}</span>
              <div className="flex gap-1.5 flex-1">
                {heatmap.filter(h => h.session === session).map(h => {
                  const c = heatColor(h.winRate, h.trades)
                  return (
                    <div key={h.day}
                      className="flex-1 flex flex-col items-center justify-center gap-0.5"
                      style={{ background:c.bg, minHeight:'46px', borderRadius:'var(--radius-xs)', padding:'6px 0' }}
                      title={`${session} ${h.day}: ${Math.round(h.winRate*100)}% (${h.trades} trades)`}>
                      <Label>{h.day}</Label>
                      {h.trades > 0 ? (
                        <>
                          <Num size="sm" style={{ color:c.color }}>{Math.round(h.winRate*100)}%</Num>
                          <Num size="2xs" tone="muted">{h.trades}t</Num>
                        </>
                      ) : (
                        <Num size="xs" tone="muted">—</Num>
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
      <Panel title={`Screenshot gallery (${trades.filter(t => t.screenshot_close_url || t.screenshot_open_url || t.screenshot_user_url).length})`} >
        <ScreenshotGallery trades={trades} />
      </Panel>

    </div>
  )
}
