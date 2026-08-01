import React from 'react'
import {
  Document, Page, View, Text, Image, Svg, Path, Line, Rect,
} from '@react-pdf/renderer'
import type { Trade } from '@/types'
import { isWin, isLoss, tradeResult } from '@/lib/trading/stats'
import { registerReportFonts, C, WORDS, MONO, MARK_PNG, label, figure } from './theme'

registerReportFonts()





function realTrades(all: Trade[]) {
  return all.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE' && (t.lot_size ?? 0) > 0)
}

function computeStats(trades: Trade[]) {
  const real    = realTrades(trades)
  const sorted  = [...real].sort((a, b) => (a.close_time ?? '') < (b.close_time ?? '') ? -1 : 1)
  const wins    = real.filter(t => isWin(t))
  const losses  = real.filter(t => isLoss(t))
  const netPnl  = real.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const decisive = wins.length + losses.length
  const winRate  = decisive > 0 ? (wins.length / decisive) * 100 : 0
  const gw       = wins.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const gl       = Math.abs(losses.reduce((s, t) => s + (t.net_profit ?? 0), 0))
  const pf       = gl > 0 ? gw / gl : gw > 0 ? 99 : 0
  const avgWin   = wins.length   > 0 ? gw / wins.length   : 0
  const avgLoss  = losses.length > 0 ? gl / losses.length : 0
  const wr100    = decisive > 0 ? wins.length   / decisive : 0
  const lr100    = decisive > 0 ? losses.length / decisive : 0
  const expectancy = wr100 * avgWin - lr100 * avgLoss

  const bestTrade  = sorted.reduce<Trade | null>((b, t) => !b || (t.net_profit ?? 0) > (b.net_profit ?? 0) ? t : b, null)
  const worstTrade = sorted.reduce<Trade | null>((w, t) => !w || (t.net_profit ?? 0) < (w.net_profit ?? 0) ? t : w, null)

  const byDay = new Map<string, number>()
  for (const t of real) {
    if (!t.close_time) continue
    const day = t.close_time.split('T')[0]
    byDay.set(day, (byDay.get(day) ?? 0) + (t.net_profit ?? 0))
  }
  const dayVals = Array.from(byDay.values())
  const maxDD   = dayVals.length > 0 ? Math.min(0, ...dayVals) : 0

  const chrono = [...real].sort((a, b) => (a.close_time ?? '').localeCompare(b.close_time ?? ''))
  let maxCW = 0, maxCL = 0, curW = 0, curL = 0
  for (const t of chrono) {
    const r = tradeResult(t)
    if (r === 'win')  { curW++; curL = 0; if (curW > maxCW) maxCW = curW }
    if (r === 'loss') { curL++; curW = 0; if (curL > maxCL) maxCL = curL }
  }

  const rrArr = real.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  const avgRR = rrArr.length > 0
    ? rrArr.reduce((s, t) => {
        const dir      = t.trade_type === 'buy' ? 1 : -1
        const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? realized / risk : 0)
      }, 0) / rrArr.length
    : null

  let cum = 0
  const equity = sorted.map(t => { cum += (t.net_profit ?? 0); return cum })

  // Setup breakdown — sorted by absolute P&L, top 5
  const setupMap = new Map<string, { pnl: number; count: number; wins: number }>()
  for (const t of real) {
    const key = t.setup_type ?? 'Unknown'
    const cur = setupMap.get(key) ?? { pnl: 0, count: 0, wins: 0 }
    setupMap.set(key, {
      pnl:   cur.pnl   + (t.net_profit ?? 0),
      count: cur.count + 1,
      wins:  cur.wins  + (isWin(t) ? 1 : 0),
    })
  }
  const setupBreakdown = Array.from(setupMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5)

  // Instrument breakdown — every symbol traded, biggest contribution first.
  const symMap = new Map<string, { pnl: number; count: number; wins: number }>()
  for (const t of real) {
    const cur = symMap.get(t.symbol) ?? { pnl: 0, count: 0, wins: 0 }
    symMap.set(t.symbol, {
      pnl:   cur.pnl   + (t.net_profit ?? 0),
      count: cur.count + 1,
      wins:  cur.wins  + (isWin(t) ? 1 : 0),
    })
  }
  const symBreakdown = Array.from(symMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 6)

  // The five that moved the account most in each direction.
  const byPnl   = [...real].sort((a, b) => (b.net_profit ?? 0) - (a.net_profit ?? 0))
  const topWins = byPnl.filter(t => (t.net_profit ?? 0) > 0).slice(0, 5)
  const topLoss = byPnl.filter(t => (t.net_profit ?? 0) < 0).slice(-5).reverse()

  // Day-of-week P&L (Mon–Fri)
  const dowMap = new Map<number, number>()
  for (const t of real) {
    if (!t.close_time) continue
    const dow = new Date(t.close_time).getDay()
    dowMap.set(dow, (dowMap.get(dow) ?? 0) + (t.net_profit ?? 0))
  }
  const dayPnl = [1, 2, 3, 4, 5].map((d, i) => ({
    day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
    pnl: dowMap.get(d) ?? 0,
  }))

  // Radar scores
  const pfScore    = Math.min(100, (pf / 3) * 100)
  const rrScore    = avgRR !== null ? Math.min(100, Math.max(0, (avgRR + 1) / 3 * 100)) : 50
  const planTrades = real.filter(t => t.followed_plan !== null && t.followed_plan !== undefined)
  const discScore  = planTrades.length > 0 ? (planTrades.filter(t => t.followed_plan).length / planTrades.length) * 100 : 50
  const slTrades   = real.filter(t => (t.stop_loss ?? 0) > 0)
  const badRisk    = real.filter(t => t.tags?.some(g => ['No SL', 'Oversize'].includes(g)))
  const riskScore  = Math.min(100, Math.max(0, (slTrades.length / Math.max(real.length, 1)) * 70 + (1 - badRisk.length / Math.max(real.length, 1)) * 30))
  const emoTrades  = real.filter(t => t.emotion_pre)
  const tilt       = emoTrades.filter(t => ['fomo', 'anxious', 'tired'].includes(t.emotion_pre!))
  const revenge    = real.filter(t => t.tags?.some(g => ['Revenge trade', 'FOMO', 'Emotional'].includes(g)))
  const mindScore  = Math.min(100, Math.max(0, 100 - (
    (emoTrades.length > 0 ? tilt.length / emoTrades.length : 0) * 60 +
    (real.length > 0 ? revenge.length / real.length : 0) * 40
  ) * 100))
  const ovr = Math.round([winRate, pfScore, rrScore, discScore, riskScore, mindScore].reduce((a, b) => a + b, 0) / 6)

  return {
    sorted, real, wins, losses, netPnl, winRate, pf, avgWin, avgLoss,
    expectancy, bestTrade, worstTrade, maxDD, maxCW, maxCL,
    avgRR, equity, setupBreakdown, dayPnl, symBreakdown, topWins, topLoss,
    pfScore, rrScore, discScore, riskScore, mindScore, ovr, planTrades, emoTrades,
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt     = (n: number) => `${n >= 0 ? '+' : '-'}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtS    = (n: number) => `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(0)}`
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
/** Money only. A scratch is ink, not amber — it did not move the account. */
const pnlCol = (t: Trade) => {
  const r = tradeResult(t)
  return r === 'win' ? C.up : r === 'loss' ? C.down : C.ink3
}


// ── Primitives ────────────────────────────────────────────────────────────────

/** A hairline. The report's only divider — no boxes inside boxes. */
const Rule = ({ mt = 0, mb = 0 }: { mt?: number; mb?: number }) => (
  <View style={{ height: 0.6, backgroundColor: C.line, marginTop: mt, marginBottom: mb }} />
)

/** Section opener: a tracked label over a rule, the way each page block starts. */
function SectionHead({ title, note }: { title: string; note?: string }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ ...label, fontSize: 7.5, color: C.ink2 }}>{title}</Text>
        {note ? <Text style={{ ...label, fontSize: 6.5 }}>{note}</Text> : null}
      </View>
      <Rule mt={4} />
    </View>
  )
}

/**
 * One figure with its name under it. `money` is the only way colour enters the
 * report — pass it for anything denominated in currency, leave it off for
 * counts, ratios and percentages.
 */
interface Fig { name: string; value: string; money?: number | null; size?: number; sub?: string }

/**
 * A row of figures, evenly divided, hairline-separated.
 *
 * Written as one flat row of cells rather than a Figure component nested inside
 * a wrapper: two levels of `flex: 1` collapsed the cell's height in yoga and
 * every value and sub-line rendered blank while the label above it survived —
 * a report of nothing but field names. The divider is a left border on the cell
 * for the same reason, instead of a zero-width sibling View.
 */
function FigureRow({ items }: { items: Fig[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      {items.map((f, i) => (
        <View
          key={f.name}
          style={{
            flexGrow: 1, flexShrink: 1, flexBasis: 0,
            paddingLeft: i > 0 ? 12 : 0,
            paddingRight: 8,
            borderLeftWidth: i > 0 ? 0.6 : 0,
            borderLeftColor: C.line,
          }}
        >
          <Text style={label}>{f.name}</Text>
          <Text style={{ ...figure(f.size ?? 15, { money: f.money }), marginTop: 4 }}>{f.value}</Text>
          {f.sub ? (
            <Text style={{ fontFamily: WORDS, fontSize: 6.5, color: C.ink3, marginTop: 3 }}>{f.sub}</Text>
          ) : null}
        </View>
      ))}
    </View>
  )
}

// ── Equity curve ──────────────────────────────────────────────────────────────

function EquityCurve({ equity }: { equity: number[] }) {
  const W = 531, H = 96
  if (equity.length < 2) {
    return (
      <View style={{ height: H, justifyContent: 'center' }}>
        <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink4 }}>
          Not enough closed trades in this period to plot a curve.
        </Text>
      </View>
    )
  }
  const min = Math.min(0, ...equity)
  const max = Math.max(0, ...equity)
  const span = max - min || 1
  const x = (i: number) => (i / (equity.length - 1)) * W
  const y = (v: number) => H - ((v - min) / span) * H
  const line = equity.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const last = equity[equity.length - 1]
  const stroke = last >= 0 ? C.up : C.down
  const zeroY = y(0)

  return (
    <View>
      <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Break-even. Every point below this line is the account underwater. */}
        <Line x1={0} y1={zeroY} x2={W} y2={zeroY} strokeWidth={0.6} stroke={C.line2} strokeDasharray="2 3" />
        <Path d={`${line} L${W} ${zeroY} L0 ${zeroY} Z`} fill={stroke} fillOpacity={0.1} />
        <Path d={line} stroke={stroke} strokeWidth={1.2} fill="none" />
      </Svg>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
        <Text style={{ ...label, fontSize: 6 }}>First close</Text>
        <Text style={{ ...label, fontSize: 6 }}>Cumulative, {equity.length} trades</Text>
        <Text style={{ ...label, fontSize: 6 }}>Last close</Text>
      </View>
    </View>
  )
}

// ── Horizontal magnitude bar, signed about a centre line ─────────────────────

function SignedBar({ name, meta, pnl, maxAbs }: { name: string; meta?: string; pnl: number; maxAbs: number }) {
  const W = 300, half = W / 2
  const w = Math.max(1, (Math.abs(pnl) / maxAbs) * half)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <View style={{ width: 118 }}>
        <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink1 }}>{name}</Text>
        {meta ? <Text style={{ fontFamily: WORDS, fontSize: 6.5, color: C.ink4, marginTop: 1 }}>{meta}</Text> : null}
      </View>
      <Svg width={W} height={10} viewBox={`0 0 ${W} 10`}>
        <Line x1={half} y1={0} x2={half} y2={10} strokeWidth={0.6} stroke={C.line2} />
        <Rect
          x={pnl >= 0 ? half : half - w}
          y={2.5}
          width={w}
          height={5}
          fill={pnl >= 0 ? C.up : C.down}
        />
      </Svg>
      <Text style={{ ...figure(8.5, { money: pnl }), width: 68, textAlign: 'right' }}>{fmtS(pnl)}</Text>
    </View>
  )
}

// ── Page furniture ────────────────────────────────────────────────────────────

function Masthead({ account, ref_, dateRange, periodLbl }: {
  account: string; ref_: string; dateRange: string; periodLbl: string
}) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* The mark itself, not the wordmark set in type.
            eslint's a11y rule is aimed at HTML <img>; @react-pdf's Image has no
            alt prop, and a PDF carries its title in the document metadata. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={MARK_PNG} style={{ width: 26, height: 26 }} />
        <Text style={{ ...label, fontSize: 7 }}>{periodLbl}</Text>
      </View>
      <Rule mt={9} mb={9} />
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
          {/* The account, not a display name. A statement identifies the
              account it covers — a trader with two accounts has to be able to
              tell two reports apart. */}
          <Text style={label}>Prepared for account</Text>
          <Text style={{ ...figure(10), marginTop: 3 }}>{account}</Text>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
          <Text style={label}>Period</Text>
          <Text style={{ ...figure(9), marginTop: 3 }}>{dateRange}</Text>
        </View>
        <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
          <Text style={label}>Reference</Text>
          <Text style={{ ...figure(9, { dim: true }), marginTop: 3 }}>{ref_}</Text>
        </View>
      </View>
    </View>
  )
}

/**
 * Fixed footer. `render` gives @react-pdf the page numbers, and `fixed` repeats
 * it on every page including ones the trade log spills onto.
 */
function Footer({ generated }: { generated: string }) {
  return (
    <View fixed style={{ position: 'absolute', left: 32, right: 32, bottom: 22 }}>
      <Rule mb={6} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: WORDS, fontSize: 6, color: C.ink4, maxWidth: 380 }}>
          Computed from executed fills recorded on the connected MetaTrader account.
          Past performance is not indicative of future results. Not investment advice.
        </Text>
        <Text
          style={{ fontFamily: MONO, fontSize: 6, color: C.ink4 }}
          render={({ pageNumber, totalPages }) => `${generated}   ${pageNumber}/${totalPages}`}
        />
      </View>
    </View>
  )
}

const PAGE = {
  backgroundColor: C.void,
  paddingTop: 32,
  paddingBottom: 54,
  paddingHorizontal: 32,
  fontFamily: WORDS,
  fontSize: 9,
  color: C.ink1,
} as const

// ── Main document ─────────────────────────────────────────────────────────────
export interface ReportProps {
  trades:      Trade[]
  from:        string
  to:          string
  period:      'weekly' | 'monthly'
  /** The MT5 login this report covers. */
  account?:    string
  /** The Analyst brief (Pro/Ultra). Empty string hides the section. */
  coachNotes?: string
}

export function TradingReport({ trades, from, to, period, account, coachNotes }: ReportProps) {
  const {
    sorted, wins, losses, netPnl, winRate, pf, avgWin, avgLoss,
    expectancy, bestTrade, worstTrade, maxDD, maxCW, maxCL,
    avgRR, equity, setupBreakdown, dayPnl, symBreakdown, topWins, topLoss,
    discScore, riskScore, ovr, planTrades, emoTrades,
  } = computeStats(trades)

  const periodLbl = period === 'weekly' ? 'Weekly performance report' : 'Monthly performance report'
  const dateRange = `${fmtDate(from)} — ${fmtDate(to)}`
  const generated = new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z'
  // Deterministic and period-scoped, so two downloads of the same window carry
  // the same reference and a support conversation can name one document.
  const ref_ = `VQ-${from.replaceAll('-', '')}-${period[0].toUpperCase()}${String(sorted.length).padStart(3, '0')}`

  const decisive = wins.length + losses.length
  const setupMaxAbs = Math.max(1, ...setupBreakdown.map(s => Math.abs(s.pnl)))
  const symMaxAbs   = Math.max(1, ...symBreakdown.map(s => Math.abs(s.pnl)))
  const dayMaxAbs   = Math.max(1, ...dayPnl.map(d => Math.abs(d.pnl)))
  const hasDayData  = dayPnl.some(d => d.pnl !== 0)

  return (
    <Document
      title={`VELQUOR ${periodLbl} · ${dateRange}`}
      author="VELQUOR"
      subject={`Trading performance, ${dateRange}`}
    >
      {/* ══════════════ PAGE 1 — SUMMARY ══════════════ */}
      <Page size="A4" style={PAGE}>
        <Masthead account={account || '—'} ref_={ref_} dateRange={dateRange} periodLbl={periodLbl} />

        {/* The headline. One number, at the size it deserves. */}
        <View style={{ marginTop: 22, marginBottom: 20 }}>
          <Text style={label}>Net profit and loss</Text>
          <Text style={{ ...figure(38, { money: netPnl }), marginTop: 6 }}>{fmt(netPnl)}</Text>
          <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink3, marginTop: 5 }}>
            {sorted.length} closed {sorted.length === 1 ? 'trade' : 'trades'}
            {decisive > 0 ? ` · ${wins.length} won, ${losses.length} lost` : ''}
            {sorted.length - decisive > 0 ? ` · ${sorted.length - decisive} scratch` : ''}
          </Text>
        </View>

        <SectionHead title="Headline figures" />
        <FigureRow items={[
          { name: 'Win rate', value: decisive > 0 ? `${winRate.toFixed(1)}%` : '—',
            sub: decisive > 0 ? `${wins.length}W / ${losses.length}L decided` : 'no decided trades' },
          { name: 'Profit factor', value: pf > 0 ? pf.toFixed(2) : '—',
            sub: pf > 0 ? (pf >= 1 ? 'gross win per unit lost' : 'losing more than winning') : undefined },
          { name: 'Expectancy', value: decisive > 0 ? fmtS(expectancy) : '—',
            money: decisive > 0 ? expectancy : null, sub: 'per trade' },
          { name: 'Avg R multiple', value: avgRR !== null ? `${avgRR >= 0 ? '+' : ''}${avgRR.toFixed(2)}R` : '—',
            sub: avgRR === null ? 'needs stop losses' : 'realised vs risked' },
        ]} />

        <Rule mt={14} mb={14} />

        <FigureRow items={[
          { name: 'Average win',  value: avgWin > 0 ? fmtS(avgWin) : '—',    money: avgWin > 0 ? avgWin : null,   size: 12 },
          { name: 'Average loss', value: avgLoss > 0 ? fmtS(-avgLoss) : '—', money: avgLoss > 0 ? -avgLoss : null, size: 12 },
          { name: 'Best trade',   value: bestTrade ? fmtS(bestTrade.net_profit ?? 0) : '—',
            money: bestTrade?.net_profit ?? null, size: 12, sub: bestTrade?.symbol ?? undefined },
          { name: 'Worst trade',  value: worstTrade ? fmtS(worstTrade.net_profit ?? 0) : '—',
            money: worstTrade?.net_profit ?? null, size: 12, sub: worstTrade?.symbol ?? undefined },
          { name: 'Worst day',    value: maxDD < 0 ? fmtS(maxDD) : '—', money: maxDD < 0 ? maxDD : null,
            size: 12, sub: 'net, single session' },
          { name: 'Longest runs', value: `${maxCW}W · ${maxCL}L`, size: 12, sub: 'consecutive' },
        ]} />

        <View style={{ marginTop: 22 }}>
          <SectionHead title="Cumulative profit and loss" note="Closed trades, in order" />
          <EquityCurve equity={equity} />
        </View>

        <View style={{ marginTop: 22 }}>
          <SectionHead title="Profit and loss by instrument" note={symBreakdown.length > 1 ? `${symBreakdown.length} traded` : undefined} />
          {symBreakdown.length > 0 ? symBreakdown.map(sb => (
            <SignedBar
              key={sb.name}
              name={sb.name}
              meta={`${sb.count} ${sb.count === 1 ? 'trade' : 'trades'} · ${Math.round((sb.wins / sb.count) * 100)}% won`}
              pnl={sb.pnl}
              maxAbs={symMaxAbs}
            />
          )) : (
            <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink4 }}>No closed trades in this period.</Text>
          )}
        </View>

        <Footer generated={generated} />
      </Page>

      {/* ══════════════ PAGE 2 — ANALYSIS ══════════════ */}
      <Page size="A4" style={PAGE}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ ...label, fontSize: 7.5, color: C.ink2 }}>Analysis</Text>
          <Text style={{ ...figure(7, { dim: true }) }}>{ref_}</Text>
        </View>

        <SectionHead title="Profit and loss by setup" note={setupBreakdown.length ? 'Top 5 by absolute contribution' : undefined} />
        {setupBreakdown.length > 0 ? (
          setupBreakdown.map(s => (
            <SignedBar
              key={s.name}
              name={s.name}
              meta={`${s.count} ${s.count === 1 ? 'trade' : 'trades'} · ${s.count > 0 ? Math.round((s.wins / s.count) * 100) : 0}% won`}
              pnl={s.pnl}
              maxAbs={setupMaxAbs}
            />
          ))
        ) : (
          <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink4 }}>
            No trades in this period carry a setup name. Annotating them turns this
            section into the most useful page of the report.
          </Text>
        )}

        <View style={{ marginTop: 20 }}>
          <SectionHead title="Profit and loss by weekday" />
          {hasDayData ? (
            dayPnl.map(d => <SignedBar key={d.day} name={d.day} pnl={d.pnl} maxAbs={dayMaxAbs} />)
          ) : (
            <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink4 }}>No closed trades on weekdays in this period.</Text>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHead title="Process" note="Scored from what was logged, not from profit" />
          <FigureRow items={[
            { name: 'Overall', value: `${ovr}`, size: 13, sub: '0–100, six axes' },
            { name: 'Plan adherence', value: planTrades.length > 0 ? `${discScore.toFixed(0)}%` : '—',
              size: 13, sub: planTrades.length > 0 ? `${planTrades.length} annotated` : 'not logged' },
            { name: 'Risk control', value: `${riskScore.toFixed(0)}%`, size: 13, sub: 'stops set, sizing' },
            { name: 'Emotional logs', value: emoTrades.length > 0 ? `${emoTrades.length}` : '—',
              size: 13, sub: emoTrades.length > 0 ? 'trades with a mood' : 'not logged' },
          ]} />
        </View>

        {(topWins.length > 0 || topLoss.length > 0) ? (
          <View style={{ marginTop: 20 }}>
            <SectionHead title="Notable trades" note="Largest movers in each direction" />
            <View style={{ flexDirection: 'row' }}>
              {([['Largest gains', topWins], ['Largest losses', topLoss]] as const).map(([heading, list], col) => (
                <View key={heading} style={{
                  flexGrow: 1, flexShrink: 1, flexBasis: 0,
                  paddingLeft: col > 0 ? 14 : 0, paddingRight: col === 0 ? 14 : 0,
                  borderLeftWidth: col > 0 ? 0.6 : 0, borderLeftColor: C.line,
                }}>
                  <Text style={{ ...label, marginBottom: 5 }}>{heading}</Text>
                  {list.length === 0 ? (
                    <Text style={{ fontFamily: WORDS, fontSize: 7.5, color: C.ink4 }}>None in this period.</Text>
                  ) : list.map((t, i) => (
                    <View key={t.id ?? i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2.6 }}>
                      <Text style={{ ...figure(7.5), width: 56 }}>{t.symbol}</Text>
                      <Text style={{ fontFamily: WORDS, fontSize: 7, color: C.ink3, flexGrow: 1, flexShrink: 1, flexBasis: 0 }}>
                        {t.setup_type ?? '—'}
                      </Text>
                      <Text style={{ ...figure(7.5, { money: t.net_profit ?? 0 }), width: 56, textAlign: 'right' }}>
                        {fmtS(t.net_profit ?? 0)}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Footer generated={generated} />
      </Page>

      {/* ══════════════ PAGE 3 — ANALYST BRIEF ══════════════ */}
      {coachNotes ? (
        <Page size="A4" style={PAGE}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ ...label, fontSize: 7.5, color: C.ink2 }}>Analyst brief</Text>
            <Text style={{ ...figure(7, { dim: true }) }}>{ref_}</Text>
          </View>

          {/* What the brief is reasoning over, stated before the prose. A reader
              should be able to check the argument against the numbers without
              turning back a page. */}
          <SectionHead title="Basis" note="The figures this brief was written from" />
          <FigureRow items={[
            { name: 'Trades',        value: `${sorted.length}`, size: 11 },
            { name: 'Win rate',      value: decisive > 0 ? `${winRate.toFixed(1)}%` : '—', size: 11 },
            { name: 'Profit factor', value: pf > 0 ? pf.toFixed(2) : '—', size: 11 },
            { name: 'Expectancy',    value: decisive > 0 ? fmtS(expectancy) : '—',
              money: decisive > 0 ? expectancy : null, size: 11 },
            { name: 'Net',           value: fmtS(netPnl), money: netPnl, size: 11 },
          ]} />

          <View style={{ marginTop: 20 }}>
            <SectionHead title="Assessment" />
            {coachNotes.split(/\n{2,}/).filter(Boolean).map((para, i) => (
              <Text key={i} style={{
                fontFamily: WORDS, fontSize: 9.5, color: C.ink2,
                lineHeight: 1.65, marginBottom: 9,
              }}>
                {para.trim()}
              </Text>
            ))}
          </View>

          <View style={{ marginTop: 16 }}>
            <Rule mb={7} />
            <Text style={{ fontFamily: WORDS, fontSize: 6.5, color: C.ink4, lineHeight: 1.5 }}>
              Written by the VELQUOR Analyst from this period&apos;s executed trades and
              the annotations on them. It quotes only figures computed above; it does
              not forecast, and it is not investment advice.
            </Text>
          </View>

          <Footer generated={generated} />
        </Page>
      ) : null}

      {/* ══════════════ TRADE LOG ══════════════ */}
      <Page size="A4" style={PAGE}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
          <Text style={{ ...label, fontSize: 7.5, color: C.ink2 }}>Trade log</Text>
          <Text style={{ ...figure(7, { dim: true }) }}>{sorted.length} closed</Text>
        </View>

        {/* Column headings repeat when the log spills onto another page. */}
        <View fixed style={{ flexDirection: 'row', paddingBottom: 5 }}>
          <Text style={{ ...label, width: 58 }}>Closed</Text>
          <Text style={{ ...label, width: 58 }}>Symbol</Text>
          <Text style={{ ...label, width: 30 }}>Side</Text>
          <Text style={{ ...label, width: 34, textAlign: 'right' }}>Lots</Text>
          <Text style={{ ...label, flex: 1, marginLeft: 10 }}>Setup</Text>
          <Text style={{ ...label, width: 62, textAlign: 'right' }}>Net</Text>
        </View>
        <View fixed><Rule mb={3} /></View>

        {sorted.length === 0 ? (
          <Text style={{ fontFamily: WORDS, fontSize: 8, color: C.ink4, marginTop: 8 }}>
            No closed trades in this period.
          </Text>
        ) : sorted.map((t, i) => (
          <View key={t.id ?? i} wrap={false} style={{
            flexDirection: 'row', alignItems: 'center', paddingVertical: 3.4,
            borderBottomWidth: 0.4, borderBottomColor: C.line,
          }}>
            <Text style={{ ...figure(7, { dim: true }), width: 58 }}>
              {t.close_time ? t.close_time.slice(0, 10).split('-').reverse().slice(0, 2).join('/') + ' ' + t.close_time.slice(11, 16) : '—'}
            </Text>
            <Text style={{ ...figure(7.5), width: 58 }}>{t.symbol}</Text>
            <Text style={{ fontFamily: WORDS, fontSize: 7, color: C.ink3, width: 30, textTransform: 'uppercase' }}>
              {t.trade_type ?? '—'}
            </Text>
            <Text style={{ ...figure(7, { dim: true }), width: 34, textAlign: 'right' }}>
              {(t.lot_size ?? 0).toFixed(2)}
            </Text>
            <Text style={{ fontFamily: WORDS, fontSize: 7.5, color: C.ink2, flex: 1, marginLeft: 10 }}>
              {t.setup_type ?? '—'}
            </Text>
            <Text style={{ fontFamily: MONO, fontSize: 7.5, color: pnlCol(t), width: 62, textAlign: 'right' }}>
              {fmt(t.net_profit ?? 0)}
            </Text>
          </View>
        ))}

        {sorted.length > 0 ? (
          <View style={{ flexDirection: 'row', marginTop: 7, paddingTop: 6, borderTopWidth: 0.6, borderTopColor: C.line2 }}>
            <Text style={{ ...label, flex: 1 }}>Total, {sorted.length} trades</Text>
            <Text style={{ ...figure(9, { money: netPnl }), width: 62, textAlign: 'right' }}>{fmt(netPnl)}</Text>
          </View>
        ) : null}

        <Footer generated={generated} />
      </Page>
    </Document>
  )
}
