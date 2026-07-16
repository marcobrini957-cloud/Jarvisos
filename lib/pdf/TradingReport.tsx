import React from 'react'
import {
  Document, Page, View, Text, Svg, Path, Line,
} from '@react-pdf/renderer'
import type { Trade } from '@/types'

const C = {
  bg:     '#0C0C12',
  card:   '#12121A',
  card2:  '#0F0F16',
  border: '#1E1E30',
  accent: '#4D8FFF',
  green:  '#4ADE80',
  red:    '#F87171',
  yellow: '#FACC15',
  t1:     '#FFFFFF',
  t2:     '#9090A8',
  t3:     '#48485E',
  gold:   '#C8851A',
} as const

const BE = 10

function realTrades(all: Trade[]) {
  return all.filter(t => t.net_profit !== null && t.symbol !== 'BALANCE' && (t.lot_size ?? 0) > 0)
}

function computeStats(trades: Trade[]) {
  const real    = realTrades(trades)
  const sorted  = [...real].sort((a, b) => (a.close_time ?? '') < (b.close_time ?? '') ? -1 : 1)
  const wins    = real.filter(t => (t.net_profit ?? 0) >  BE)
  const losses  = real.filter(t => (t.net_profit ?? 0) < -BE)
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
    const p = t.net_profit ?? 0
    if (p >  BE) { curW++; curL = 0; if (curW > maxCW) maxCW = curW }
    if (p < -BE) { curL++; curW = 0; if (curL > maxCL) maxCL = curL }
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
      wins:  cur.wins  + ((t.net_profit ?? 0) > BE ? 1 : 0),
    })
  }
  const setupBreakdown = Array.from(setupMap.entries())
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))
    .slice(0, 5)

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
    avgRR, equity, setupBreakdown, dayPnl,
    pfScore, rrScore, discScore, riskScore, mindScore, ovr, planTrades, emoTrades,
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt     = (n: number) => `${n >= 0 ? '+' : '-'}€${Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtS    = (n: number) => `${n >= 0 ? '+' : '-'}€${Math.abs(n).toFixed(0)}`
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
const scoreCol = (s: number) => s >= 70 ? C.green : s >= 45 ? C.yellow : C.red
const pnlCol   = (n: number) => n > BE ? C.green : n < -BE ? C.red : C.t2

// ── Equity curve ──────────────────────────────────────────────────────────────
function EquityCurveSvg({ equity }: { equity: number[] }) {
  if (equity.length < 2) return null
  const W = 491, H = 68, PX = 2, PY = 4
  const maxV   = Math.max(...equity, 0.01)
  const minV   = Math.min(...equity, -0.01)
  const range  = maxV - minV || 1
  const xOf    = (i: number) => PX + (i / (equity.length - 1)) * (W - PX * 2)
  const yOf    = (v: number) => PY + (1 - (v - minV) / range) * (H - PY * 2)
  const zeroY  = yOf(0)
  const stroke = equity[equity.length - 1] >= 0 ? C.green : C.red
  const pts    = equity.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')
  const fill   = `${pts} L${xOf(equity.length - 1).toFixed(1)},${zeroY.toFixed(1)} L${xOf(0).toFixed(1)},${zeroY.toFixed(1)} Z`
  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <Line x1={PX} y1={zeroY.toFixed(1)} x2={W - PX} y2={zeroY.toFixed(1)} stroke={C.border} strokeWidth={1} />
      <Path d={fill} fill={stroke} fillOpacity={0.07} />
      <Path d={pts}  fill="none"   stroke={stroke}    strokeWidth={1.5} />
    </Svg>
  )
}

// ── Score bar (performance profile) ──────────────────────────────────────────
function ScoreBar({ label, value, score }: { label: string; value: string; score: number }) {
  const col = scoreCol(score)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Text style={{ color: C.t3, fontSize: 7, width: 82, letterSpacing: 0.5 }}>{label}</Text>
      <View style={{ flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3, marginRight: 8 }}>
        <View style={{ width: `${Math.max(2, score)}%`, height: 5, backgroundColor: col, borderRadius: 3 }} />
      </View>
      <Text style={{ color: col, fontSize: 8, fontFamily: 'Helvetica-Bold', width: 36, textAlign: 'right' }}>{value}</Text>
    </View>
  )
}

// ── Setup bar ─────────────────────────────────────────────────────────────────
function SetupBar({ name, pnl, maxAbs }: { name: string; pnl: number; maxAbs: number }) {
  const col   = pnl > 0 ? C.green : pnl < 0 ? C.red : C.t2
  const pct   = Math.max(2, (Math.abs(pnl) / Math.max(maxAbs, 1)) * 100)
  const label = name.length > 13 ? name.slice(0, 12) + '…' : name
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
      <Text style={{ color: C.t3, fontSize: 6.5, width: 78 }}>{label}</Text>
      <View style={{ flex: 1, height: 5, backgroundColor: C.border, borderRadius: 3, marginRight: 6 }}>
        <View style={{ width: `${pct}%`, height: 5, backgroundColor: col, borderRadius: 3 }} />
      </View>
      <Text style={{ color: col, fontSize: 7.5, fontFamily: 'Helvetica-Bold', width: 46, textAlign: 'right' }}>
        {fmtS(pnl)}
      </Text>
    </View>
  )
}

// ── Day bar ───────────────────────────────────────────────────────────────────
function DayBar({ day, pnl, maxAbs }: { day: string; pnl: number; maxAbs: number }) {
  const col = pnl > 0 ? C.green : pnl < 0 ? C.red : C.t3
  const pct = Math.max(2, (Math.abs(pnl) / Math.max(maxAbs, 1)) * 100)
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
      <Text style={{ color: C.t3, fontSize: 7, width: 26 }}>{day}</Text>
      <View style={{ flex: 1, height: 6, backgroundColor: C.border, borderRadius: 3, marginRight: 8 }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: col, borderRadius: 3 }} />
      </View>
      <Text style={{ color: col, fontSize: 7.5, fontFamily: 'Helvetica-Bold', width: 50, textAlign: 'right' }}>
        {pnl !== 0 ? fmtS(pnl) : '—'}
      </Text>
    </View>
  )
}

// ── Compact page header (page 2+) ─────────────────────────────────────────────
function PageHeader({ label, dateRange }: { label: string; dateRange: string }) {
  return (
    <>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 20, height: 20, backgroundColor: C.gold, borderRadius: 5, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontFamily: 'Helvetica-Bold' }}>V</Text>
          </View>
          <Text style={{ color: C.t2, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>VELQUOR</Text>
          <Text style={{ color: C.t3, fontSize: 8 }}>·</Text>
          <Text style={{ color: C.t3, fontSize: 8, letterSpacing: 1 }}>{label}</Text>
        </View>
        <Text style={{ color: C.t3, fontSize: 7.5 }}>{dateRange}</Text>
      </View>
      <View style={{ height: 1, backgroundColor: C.border, marginBottom: 14 }} />
    </>
  )
}

// ── Main document ─────────────────────────────────────────────────────────────
export interface ReportProps {
  trades:      Trade[]
  from:        string
  to:          string
  period:      'weekly' | 'monthly'
  traderName?: string
  coachNotes?: string   // AI Coach's Notes (Pro/Ultra only); omitted → section hidden
}

export function TradingReport({ trades, from, to, period, traderName = 'Trader', coachNotes }: ReportProps) {
  const {
    sorted, wins, losses, netPnl, winRate, pf, avgWin, avgLoss,
    expectancy, bestTrade, worstTrade, maxDD, maxCW, maxCL,
    avgRR, equity, setupBreakdown, dayPnl,
    pfScore, rrScore, discScore, riskScore, mindScore, ovr, planTrades, emoTrades,
  } = computeStats(trades)

  const pnlColor  = netPnl >= 0 ? C.green : C.red
  const ovrColor  = scoreCol(ovr)
  const periodLbl = period === 'weekly' ? 'WEEKLY REPORT' : 'MONTHLY REPORT'
  const dateRange = `${fmtDate(from)} – ${fmtDate(to)}`
  const today     = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const kpis = [
    { label: 'NET P&L',       value: fmt(netPnl),                                                                    color: pnlColor          },
    { label: 'WIN RATE',      value: `${winRate.toFixed(0)}%`,                                                        color: scoreCol(winRate) },
    { label: 'PROFIT FACTOR', value: `${pf.toFixed(2)}×`,                                                            color: scoreCol(pfScore) },
    { label: 'AVG R:R',       value: avgRR !== null ? `${avgRR >= 0 ? '+' : ''}${avgRR.toFixed(2)}R` : '—',          color: scoreCol(rrScore) },
    { label: 'EXPECTANCY',    value: `${expectancy >= 0 ? '+' : '-'}€${Math.abs(expectancy).toFixed(0)}/trade`,       color: expectancy >= 0 ? C.green : C.red },
    { label: 'TOTAL TRADES',  value: `${sorted.length}`,                                                              color: C.accent          },
  ]

  const secondary = [
    { label: 'AVG WIN',     value: avgWin   > 0 ? `+€${avgWin.toFixed(0)}`   : '—',                    color: C.green },
    { label: 'AVG LOSS',    value: avgLoss  > 0 ? `-€${avgLoss.toFixed(0)}`  : '—',                    color: C.red   },
    { label: 'MAX DD DAY',  value: maxDD    < 0 ? `-€${Math.abs(maxDD).toFixed(0)}` : '—',             color: maxDD < 0 ? C.red : C.t2 },
    { label: 'BEST TRADE',  value: bestTrade  ? fmt(bestTrade.net_profit ?? 0)  : '—',                  color: C.green },
    { label: 'WORST TRADE', value: worstTrade ? fmt(worstTrade.net_profit ?? 0) : '—',                  color: C.red   },
    { label: 'STREAK',      value: `${maxCW}W  /  ${maxCL}L`,                                           color: C.t2    },
  ]

  const scoreAxes = [
    { label: 'WIN RATE',      value: `${winRate.toFixed(0)}%`,                                              score: winRate   },
    { label: 'PROFIT FACTOR', value: `${pf.toFixed(2)}×`,                                                   score: pfScore   },
    { label: 'AVG R:R',       value: avgRR !== null ? `${avgRR >= 0 ? '+' : ''}${avgRR.toFixed(2)}R` : '—', score: rrScore   },
    { label: 'DISCIPLINE',    value: planTrades.length > 0 ? `${discScore.toFixed(0)}%` : '—',              score: discScore },
    { label: 'RISK MGMT',     value: `${riskScore.toFixed(0)}%`,                                            score: riskScore },
    { label: 'MINDSET',       value: emoTrades.length > 0 ? `${mindScore.toFixed(0)}%` : '—',               score: mindScore },
  ]

  const setupMaxAbs = Math.max(1, ...setupBreakdown.map(s => Math.abs(s.pnl)))
  const dayMaxAbs   = Math.max(1, ...dayPnl.map(d => Math.abs(d.pnl)))
  const hasDayData  = dayPnl.some(d => d.pnl !== 0)

  return (
    <Document>

      {/* ════════════════════ PAGE 1: OVERVIEW ════════════════════ */}
      <Page size="A4" style={{ backgroundColor: C.bg, padding: 32, fontFamily: 'Helvetica', fontSize: 10 }}>

        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ width: 28, height: 28, backgroundColor: C.gold, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontFamily: 'Helvetica-Bold' }}>V</Text>
              </View>
              <View>
                <Text style={{ color: C.t1, fontSize: 14, fontFamily: 'Helvetica-Bold', letterSpacing: 1.5 }}>VELQUOR</Text>
                <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2 }}>TRADING INTELLIGENCE</Text>
              </View>
            </View>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2, marginBottom: 2 }}>{periodLbl}</Text>
            <Text style={{ color: C.t2, fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{dateRange}</Text>
            <Text style={{ color: C.t3, fontSize: 7.5, marginTop: 2 }}>Generated {today}</Text>
          </View>

          {/* OVR badge */}
          <View style={{ alignItems: 'center', padding: 16, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: ovrColor + '40' }}>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2.5, marginBottom: 5 }}>OVR</Text>
            <Text style={{ color: ovrColor, fontSize: 34, fontFamily: 'Helvetica-Bold', lineHeight: 1 }}>{ovr}</Text>
            <Text style={{ color: C.t3, fontSize: 7.5, marginTop: 6 }}>{traderName}</Text>
            <View style={{ flexDirection: 'row', marginTop: 4, gap: 6 }}>
              <Text style={{ color: C.green, fontSize: 7.5 }}>{wins.length}W</Text>
              <Text style={{ color: C.t3, fontSize: 7.5 }}>·</Text>
              <Text style={{ color: C.red, fontSize: 7.5 }}>{losses.length}L</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 1, backgroundColor: C.border, marginBottom: 12 }} />

        {/* KPI row */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {kpis.map(k => (
            <View key={k.label} style={{ flex: 1, backgroundColor: C.card, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.t3, fontSize: 6, letterSpacing: 1.5, marginBottom: 5 }}>{k.label}</Text>
              <Text style={{ color: k.color, fontSize: 11, fontFamily: 'Helvetica-Bold' }}>{k.value}</Text>
            </View>
          ))}
        </View>

        {/* Secondary stats */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
          {secondary.map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: C.card2, borderRadius: 7, padding: 8, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.t3, fontSize: 5.5, letterSpacing: 1, marginBottom: 4 }}>{s.label}</Text>
              <Text style={{ color: s.color, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Equity curve */}
        {equity.length >= 2 && (
          <View style={{ backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2, marginBottom: 8 }}>EQUITY CURVE</Text>
            <EquityCurveSvg equity={equity} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
              <Text style={{ color: C.t3, fontSize: 7 }}>{fmtDate(from)}</Text>
              <Text style={{ color: pnlColor, fontSize: 8, fontFamily: 'Helvetica-Bold' }}>{fmt(netPnl)}</Text>
              <Text style={{ color: C.t3, fontSize: 7 }}>{fmtDate(to)}</Text>
            </View>
          </View>
        )}

        {/* Two columns: Performance Profile + Setup Breakdown */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 55, backgroundColor: C.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2, marginBottom: 10 }}>PERFORMANCE PROFILE</Text>
            {scoreAxes.map(a => <ScoreBar key={a.label} label={a.label} value={a.value} score={a.score} />)}
          </View>
          <View style={{ flex: 45, backgroundColor: C.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2, marginBottom: 10 }}>SETUP PERFORMANCE</Text>
            {setupBreakdown.length > 0
              ? setupBreakdown.map(s => <SetupBar key={s.name} name={s.name} pnl={s.pnl} maxAbs={setupMaxAbs} />)
              : <Text style={{ color: C.t3, fontSize: 8 }}>No setup data tagged</Text>
            }
          </View>
        </View>

        {/* Day of week */}
        {hasDayData && (
          <View style={{ backgroundColor: C.card, borderRadius: 8, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ color: C.t3, fontSize: 7, letterSpacing: 2, marginBottom: 10 }}>P&L BY DAY OF WEEK</Text>
            {dayPnl.map(d => <DayBar key={d.day} day={d.day} pnl={d.pnl} maxAbs={dayMaxAbs} />)}
          </View>
        )}

        {/* Footer */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: C.t3, fontSize: 7 }}>Velquor · Trading Intelligence Platform</Text>
          <Text style={{ color: C.t3, fontSize: 7 }}>Page 1 · {periodLbl} · {dateRange}</Text>
        </View>
      </Page>

      {/* ════════════════════ PAGE 2: TRADE LOG ════════════════════ */}
      <Page size="A4" style={{ backgroundColor: C.bg, padding: 32, fontFamily: 'Helvetica', fontSize: 10 }}>
        <PageHeader label="TRADE LOG" dateRange={dateRange} />

        {/* Best & worst highlight */}
        {(bestTrade || worstTrade) && (
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
            {bestTrade && (
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.green + '33' }}>
                <Text style={{ color: C.green, fontSize: 6.5, letterSpacing: 1.5, marginBottom: 4 }}>BEST TRADE</Text>
                <Text style={{ color: C.t1, fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{fmt(bestTrade.net_profit ?? 0)}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <Text style={{ color: C.t2, fontSize: 7.5 }}>{bestTrade.symbol}</Text>
                  <Text style={{ color: bestTrade.trade_type === 'buy' ? C.green : C.red, fontSize: 7.5 }}>
                    {(bestTrade.trade_type ?? '').toUpperCase()}
                  </Text>
                  {bestTrade.setup_type ? <Text style={{ color: C.t2, fontSize: 7.5 }}>{bestTrade.setup_type}</Text> : null}
                  {bestTrade.close_time
                    ? <Text style={{ color: C.t3, fontSize: 7.5 }}>
                        {new Date(bestTrade.close_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Text>
                    : null}
                </View>
              </View>
            )}
            {worstTrade && (
              <View style={{ flex: 1, backgroundColor: C.card, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.red + '33' }}>
                <Text style={{ color: C.red, fontSize: 6.5, letterSpacing: 1.5, marginBottom: 4 }}>WORST TRADE</Text>
                <Text style={{ color: C.t1, fontSize: 13, fontFamily: 'Helvetica-Bold' }}>{fmt(worstTrade.net_profit ?? 0)}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                  <Text style={{ color: C.t2, fontSize: 7.5 }}>{worstTrade.symbol}</Text>
                  <Text style={{ color: worstTrade.trade_type === 'buy' ? C.green : C.red, fontSize: 7.5 }}>
                    {(worstTrade.trade_type ?? '').toUpperCase()}
                  </Text>
                  {worstTrade.setup_type ? <Text style={{ color: C.t2, fontSize: 7.5 }}>{worstTrade.setup_type}</Text> : null}
                  {worstTrade.close_time
                    ? <Text style={{ color: C.t3, fontSize: 7.5 }}>
                        {new Date(worstTrade.close_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </Text>
                    : null}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Full trade log */}
        {sorted.length > 0 ? (
          <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border }}>
            {/* Table header */}
            <View style={{ flexDirection: 'row', padding: '9 14 7 14', borderBottomWidth: 1, borderBottomColor: C.border }}>
              {['DATE', 'PAIR', 'DIR', 'SETUP', 'R:R', 'P&L'].map((h, i) => (
                <Text key={h} style={{ color: C.t3, fontSize: 6.5, letterSpacing: 1.2, flex: i === 3 ? 2 : 1 }}>{h}</Text>
              ))}
            </View>
            {/* Rows — react-pdf auto-paginates if they overflow */}
            {sorted.map((t, i) => {
              const pnl  = t.net_profit ?? 0
              const pnlC = pnlCol(pnl)
              const rowBg = i % 2 === 0 ? 'transparent' : C.card2

              // Per-trade realized R:R
              let rrStr = '—'
              if (t.stop_loss && t.open_price && t.close_price && t.trade_type) {
                const dir      = t.trade_type === 'buy' ? 1 : -1
                const realized = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
                const risk     = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
                if (risk > 0) {
                  const rr = realized / risk
                  rrStr = `${rr >= 0 ? '+' : ''}${rr.toFixed(2)}R`
                }
              }

              return (
                <View key={t.id} style={{ flexDirection: 'row', padding: '4 14', backgroundColor: rowBg }}>
                  <Text style={{ color: C.t2, fontSize: 7, flex: 1 }}>
                    {t.close_time
                      ? new Date(t.close_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
                      : '—'}
                  </Text>
                  <Text style={{ color: C.t1, fontSize: 7, flex: 1, fontFamily: 'Helvetica-Bold' }}>{t.symbol}</Text>
                  <Text style={{ color: t.trade_type === 'buy' ? C.green : C.red, fontSize: 7, flex: 1 }}>
                    {(t.trade_type ?? '').toUpperCase()}
                  </Text>
                  <Text style={{ color: C.t2, fontSize: 6.5, flex: 2 }}>
                    {t.setup_type ?? (t.notes?.slice(0, 20)) ?? '—'}
                  </Text>
                  <Text style={{ color: pnl > BE ? C.green : pnl < -BE ? C.red : C.t3, fontSize: 7, flex: 1 }}>
                    {rrStr}
                  </Text>
                  <Text style={{ color: pnlC, fontSize: 7, flex: 1, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
                    {fmt(pnl)}
                  </Text>
                </View>
              )
            })}
          </View>
        ) : (
          <View style={{ alignItems: 'center', padding: 48 }}>
            <Text style={{ color: C.t3, fontSize: 11 }}>No trades in this period</Text>
          </View>
        )}

        {/* Footer */}
        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: C.t3, fontSize: 7 }}>Velquor · Trading Intelligence Platform</Text>
          <Text style={{ color: C.t3, fontSize: 7 }}>Page 2 · {periodLbl} · {dateRange}</Text>
        </View>
      </Page>

      {/* ── Page 3 — Coach's Notes (Pro/Ultra) ─────────────────────────────── */}
      {coachNotes && coachNotes.trim().length > 0 && (
        <Page size="A4" style={{ backgroundColor: C.bg, padding: 32, fontFamily: 'Helvetica', fontSize: 10 }}>
          <PageHeader label="COACH'S NOTES" dateRange={dateRange} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6 }}>
            <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold }} />
            <Text style={{ color: C.t1, fontSize: 13, fontFamily: 'Helvetica-Bold' }}>VELQUOR AI · Performance Coaching</Text>
          </View>
          <Text style={{ color: C.t3, fontSize: 7.5, marginBottom: 14 }}>
            Generated from your statistics for this period. Figures are computed; the analysis is AI-written.
          </Text>
          {coachNotes.trim().split(/\n\s*\n/).map((para, i) => (
            <Text key={i} style={{ color: C.t2, fontSize: 9.5, lineHeight: 1.6, marginBottom: 9 }}>
              {para.trim()}
            </Text>
          ))}
          <View style={{ marginTop: 'auto', flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: C.t3, fontSize: 7 }}>Velquor · Trading Intelligence Platform</Text>
            <Text style={{ color: C.t3, fontSize: 7 }}>Page 3 · {periodLbl} · {dateRange}</Text>
          </View>
        </Page>
      )}

    </Document>
  )
}
