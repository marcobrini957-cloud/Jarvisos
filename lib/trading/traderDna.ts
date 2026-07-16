// Trader DNA — a behavioral profile scored purely from trade data.
// Deterministic (no AI, no numbers invented downstream): the AI layer READS
// these scores and writes the "biggest opportunity" focus. Unit-tested in
// tests/traderDna.test.ts.
//
// Every dimension is 0–100 where higher = better trading behavior, EXCEPT
// `impulsiveness` which is a High/Medium/Low label (higher = worse).

import type { Trade } from '@/types'
import { BE_THRESHOLD, isRealTrade, tradeResult } from './stats'

export interface DnaDimension {
  key:   string
  label: string
  score: number      // 0–100
  hint:  string       // one-line plain-language read
}

export interface TraderDna {
  dimensions:        DnaDimension[]   // scored 0–100 (radar-ready)
  impulsiveness:     'Low' | 'Medium' | 'High'
  recoveryAfterLoss: 'Strong' | 'Fair' | 'Poor'
  bestWindow:        string | null    // e.g. '08:00–11:00'
  worstCondition:    string | null    // e.g. 'After two consecutive losses'
  overall:           number           // 0–100 composite
  sampleSize:        number
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n: number) => Math.round(n)

function chrono(rows: Trade[]): Trade[] {
  return [...rows].sort((a, b) => (a.close_time ?? '').localeCompare(b.close_time ?? ''))
}

function riskOf(t: Trade): number | null {
  if (t.stop_loss && t.open_price && t.lot_size) {
    return Math.abs(t.open_price - t.stop_loss) * t.lot_size
  }
  return t.lot_size ?? null
}

// Coefficient of variation (std/mean) → 0 when perfectly consistent.
function cv(xs: number[]): number | null {
  if (xs.length < 3) return null
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length
  if (mean === 0) return null
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length
  return Math.sqrt(variance) / Math.abs(mean)
}

function expectancy(rows: Trade[]): number {
  const wins   = rows.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses = rows.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const dec    = wins.length + losses.length
  if (dec === 0) return 0
  return rows.reduce((s, t) => s + (t.net_profit ?? 0), 0) / dec
}

function winRate(rows: Trade[]): number {
  const w = rows.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD).length
  const l = rows.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD).length
  return (w + l) > 0 ? (w / (w + l)) * 100 : 0
}

// ── Dimension scorers ────────────────────────────────────────────────────────

// Decision Quality: are the trades themselves good bets? Blend profit factor
// and average realized R. PF 1.0→50, 2.0→82, 3.0→95; avg R adds up to ±15.
function scoreDecisionQuality(rows: Trade[]): number {
  const wins   = rows.filter(t => (t.net_profit ?? 0) >  BE_THRESHOLD)
  const losses = rows.filter(t => (t.net_profit ?? 0) < -BE_THRESHOLD)
  const gw = wins.reduce((s, t) => s + (t.net_profit ?? 0), 0)
  const gl = Math.abs(losses.reduce((s, t) => s + (t.net_profit ?? 0), 0))
  const pf = gl > 0 ? gw / gl : gw > 0 ? 3 : 0
  const pfScore = pf <= 0 ? 20 : clamp(50 + Math.log2(Math.max(pf, 0.25)) * 32)

  const rrRows = rows.filter(t => t.stop_loss && t.open_price && t.close_price && t.trade_type)
  const avgR = rrRows.length
    ? rrRows.reduce((s, t) => {
        const dir  = t.trade_type === 'buy' ? 1 : -1
        const real = dir * ((t.close_price ?? 0) - (t.open_price ?? 0))
        const risk = Math.abs((t.open_price ?? 0) - (t.stop_loss ?? 0))
        return s + (risk > 0 ? real / risk : 0)
      }, 0) / rrRows.length
    : 0
  return clamp(round(pfScore + clamp(avgR * 10, -15, 15)))
}

// Discipline: self-scored discipline + plan adherence.
function scoreDiscipline(rows: Trade[]): number {
  const scored = rows.filter(t => t.discipline_score != null)
  const disc   = scored.length
    ? scored.reduce((s, t) => s + (t.discipline_score ?? 0), 0) / scored.length * 10
    : null
  const planned = rows.filter(t => t.followed_plan != null)
  const plan    = planned.length
    ? planned.filter(t => t.followed_plan).length / planned.length * 100
    : null
  if (disc != null && plan != null) return clamp(round(disc * 0.6 + plan * 0.4))
  if (disc != null) return clamp(round(disc))
  if (plan != null) return clamp(round(plan))
  return 55 // no data → neutral-ish, flagged by low sample elsewhere
}

// Emotional Stability: small performance gap across pre-trade emotions = stable.
function scoreEmotionalStability(rows: Trade[]): number {
  const byEmo = new Map<string, Trade[]>()
  for (const t of rows) {
    if (!t.emotion_pre) continue
    if (!byEmo.has(t.emotion_pre)) byEmo.set(t.emotion_pre, [])
    byEmo.get(t.emotion_pre)!.push(t)
  }
  const exps = Array.from(byEmo.values()).filter(ts => ts.length >= 3).map(expectancy)
  if (exps.length < 2) return 60
  const spread = Math.max(...exps) - Math.min(...exps)
  const base   = Math.abs(rows.reduce((s, t) => s + (t.net_profit ?? 0), 0) / Math.max(rows.length, 1)) || 1
  // Spread of 0 → 100; spread of ~4× avg trade size → ~30.
  return clamp(round(100 - (spread / (base * 4)) * 70))
}

// Risk Consistency: low variation in risk-per-trade = high consistency.
function scoreRiskConsistency(rows: Trade[]): number {
  const risks = rows.map(riskOf).filter((r): r is number => r != null && r > 0)
  const c = cv(risks)
  if (c == null) return 60
  return clamp(round(100 - c * 120)) // CV 0→100, CV 0.5→40, CV 0.83→0
}

// Patience: penalize overtrading (many/day) and ultra-short holds.
function scorePatience(rows: Trade[]): number {
  const days = new Set(rows.map(t => (t.close_time ?? '').split('T')[0]).filter(Boolean))
  const perDay = days.size ? rows.length / days.size : rows.length
  // 1–2/day ideal (100), 5/day ~60, 10+/day ~20.
  const freqScore = clamp(115 - perDay * 11)

  const durs = rows.map(t => t.duration_minutes ?? 0).filter(d => d > 0)
  const med  = durs.length ? durs.slice().sort((a, b) => a - b)[Math.floor(durs.length / 2)] : 0
  // <5min scalps drag it down, >30min holds are fine.
  const holdScore = med <= 0 ? 60 : clamp(40 + Math.min(med, 60))
  return clamp(round(freqScore * 0.6 + holdScore * 0.4))
}

// ── Behavioral labels ────────────────────────────────────────────────────────

// Trades opened within 15 min of the previous close, or right after a loss,
// or off-plan → impulsive pressure.
function impulsivenessLabel(rows: Trade[]): { label: 'Low' | 'Medium' | 'High'; score: number } {
  const c = chrono(rows)
  let rapid = 0, revenge = 0
  for (let i = 1; i < c.length; i++) {
    const prevClose = c[i - 1].close_time ? new Date(c[i - 1].close_time!).getTime() : null
    const open      = c[i].open_time ? new Date(c[i].open_time!).getTime() : null
    if (prevClose && open && open - prevClose <= 15 * 60 * 1000 && open >= prevClose) rapid++
    if ((c[i - 1].net_profit ?? 0) < -BE_THRESHOLD && open && prevClose && open - prevClose <= 30 * 60 * 1000) revenge++
  }
  const offPlan = rows.filter(t => t.followed_plan === false).length
  const n = Math.max(rows.length, 1)
  const pressure = ((rapid + revenge * 1.5 + offPlan) / n) * 100
  const label = pressure >= 40 ? 'High' : pressure >= 18 ? 'Medium' : 'Low'
  return { label, score: clamp(round(pressure)) }
}

// Recovery after loss: compare expectancy of trades taken right after a loss
// vs overall. Much worse → Poor.
function recoveryLabel(rows: Trade[]): 'Strong' | 'Fair' | 'Poor' {
  const c = chrono(rows)
  const afterLoss: Trade[] = []
  for (let i = 1; i < c.length; i++) {
    if (tradeResult(c[i - 1].net_profit ?? 0) === 'loss') afterLoss.push(c[i])
  }
  if (afterLoss.length < 4) return 'Fair'
  const base = expectancy(rows)
  const post = expectancy(afterLoss)
  if (base <= 0) return post >= base ? 'Fair' : 'Poor'
  const ratio = post / base
  return ratio >= 0.8 ? 'Strong' : ratio >= 0.4 ? 'Fair' : 'Poor'
}

// Best window: hour bucket (3h) with the best expectancy, min 4 trades.
function bestWindow(rows: Trade[]): string | null {
  const buckets = new Map<number, Trade[]>()
  for (const t of rows) {
    if (!t.open_time) continue
    const h = Math.floor(new Date(t.open_time).getHours() / 3) * 3
    if (!buckets.has(h)) buckets.set(h, [])
    buckets.get(h)!.push(t)
  }
  let best: { h: number; exp: number } | null = null
  for (const [h, ts] of buckets) {
    if (ts.length < 4) continue
    const e = expectancy(ts)
    if (!best || e > best.exp) best = { h, exp: e }
  }
  if (!best || best.exp <= 0) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(best.h)}:00–${pad(best.h + 3)}:00`
}

// Worst condition: the candidate context with the worst (most negative)
// expectancy and enough samples.
function worstCondition(rows: Trade[]): string | null {
  const c = chrono(rows)
  const candidates: { label: string; rows: Trade[] }[] = []

  // After two consecutive losses
  const after2: Trade[] = []
  for (let i = 2; i < c.length; i++) {
    if (tradeResult(c[i - 1].net_profit ?? 0) === 'loss' &&
        tradeResult(c[i - 2].net_profit ?? 0) === 'loss') after2.push(c[i])
  }
  candidates.push({ label: 'After two consecutive losses', rows: after2 })

  // By emotion
  for (const emo of ['anxious', 'fomo', 'tired'] as const) {
    candidates.push({ label: `Trading while ${emo}`, rows: rows.filter(t => t.emotion_pre === emo) })
  }
  // Off-plan
  candidates.push({ label: 'When deviating from your plan', rows: rows.filter(t => t.followed_plan === false) })

  let worst: { label: string; exp: number } | null = null
  for (const cnd of candidates) {
    if (cnd.rows.length < 4) continue
    const e = expectancy(cnd.rows)
    if (e < 0 && (!worst || e < worst.exp)) worst = { label: cnd.label, exp: e }
  }
  return worst?.label ?? null
}

// ── Assemble ─────────────────────────────────────────────────────────────────

export function computeTraderDna(allRows: Trade[]): TraderDna {
  const rows = allRows.filter(
    t => t.status === 'closed' && t.net_profit !== null && isRealTrade(t),
  )

  const decision   = scoreDecisionQuality(rows)
  const discipline = scoreDiscipline(rows)
  const emotional  = scoreEmotionalStability(rows)
  const risk       = scoreRiskConsistency(rows)
  const patience   = scorePatience(rows)
  const imp        = impulsivenessLabel(rows)

  const dimensions: DnaDimension[] = [
    { key: 'decision',   label: 'Decision Quality',    score: decision,   hint: decision   >= 75 ? 'Your trade selection is sharp.' : decision   >= 50 ? 'Selection is decent — the edge is thin.' : 'Trade selection is where money leaks.' },
    { key: 'discipline', label: 'Discipline',          score: discipline, hint: discipline >= 75 ? 'You stick to the plan.' : discipline >= 50 ? 'Discipline slips under pressure.' : 'Rules get abandoned mid-session.' },
    { key: 'emotional',  label: 'Emotional Stability', score: emotional,  hint: emotional  >= 75 ? 'You trade the same calm or rattled.' : emotional >= 50 ? 'Emotion moves your results.' : 'Your mood is running your P&L.' },
    { key: 'risk',       label: 'Risk Consistency',    score: risk,       hint: risk       >= 75 ? 'Your risk per trade is steady.' : risk       >= 50 ? 'Risk size wanders trade to trade.' : 'Risk sizing is all over the place.' },
    { key: 'patience',   label: 'Patience',            score: patience,   hint: patience   >= 75 ? 'You wait for your spots.' : patience   >= 50 ? 'Some overtrading creeping in.' : 'You force trades that aren’t there.' },
  ]

  const overall = round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length)

  return {
    dimensions,
    impulsiveness:     imp.label,
    recoveryAfterLoss: recoveryLabel(rows),
    bestWindow:        bestWindow(rows),
    worstCondition:    worstCondition(rows),
    overall,
    sampleSize:        rows.length,
  }
}
