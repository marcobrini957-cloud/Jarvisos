'use client'

// Hero product animation — a 1:1 replica of the real logged-in dashboard,
// self-driving through Overview → Trading → Journal → Copy → Ask VELQUOR.
// Every surface is copied from screenshots of the live app (2026-07-17):
// topbar, TradingView tape, icon tab bar, market strip, hero card, metric
// cards, the TradingView Gold chart (dense 1h candles, TV colors, price axis,
// volume, price tag), journal stats/calendar/mood correlation, copy group
// card with EA config, and the Ask VELQUOR coach layout.
//
// Motion engine (single rAF clock):
// - Cursor rides a Catmull-Rom spline with per-segment velocity curves —
//   always moving, never darting (Marco's cursor rule).
// - Chart reveals left→right like live data loading; the last candle, OHLC
//   legend and price tag tick live. Equity curve self-draws; win-rate ring
//   sweeps; bars grow; numbers count up; session clock runs real time.
// 60fps writes go through refs; React re-renders only on scene changes.

import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'

const VELQUOR_Q = 'Why am I losing on Nasdaq?'
const VELQUOR_TEXT = "Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You're trading against institutional order flow before direction is established. Consider a 30-minute wait rule."

const CURSOR_SVG_PATH = 'M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z'

// ── Static market data (matches the live TradingView strips, July 2026) ──────
const TAPE = [
  { chip: '100', chipBg: '#2962FF', sym: 'NAS100',  price: '28,621.4', chg: '−357.10 (−1.23%)', up: false },
  { chip: '€',   chipBg: '#264697', sym: 'EUR/USD', price: '1.14430',  chg: '−0.00 (0.00%)',    up: false },
  { chip: '500', chipBg: '#D32F2F', sym: 'S&P 500', price: '7,483.8',  chg: '−41.90 (−0.56%)',  up: false },
  { chip: 'X',   chipBg: '#1976D2', sym: 'DAX',     price: '24,789.7', chg: '−61.60 (−0.25%)',  up: false },
  { chip: '₿',   chipBg: '#F7931A', sym: 'BTC',     price: '63,181',   chg: '−607.00 (−0.95%)', up: false },
  { chip: 'Au',  chipBg: '#C9A227', sym: 'Gold',    price: '3,997.845', chg: '+21.27 (+0.53%)', up: true  },
]

const STRIP = [
  { sym: 'SPY', price: '746.38', chg: '−0.58%', up: false },
  { sym: 'QQQ', price: '697.31', chg: '−1.22%', up: false },
  { sym: 'BTC', price: '63,215', chg: '−0.90%', up: false },
  { sym: 'VIX', price: '18.14',  chg: '+8.43%', up: true  },
]

// ── Easings / geometry ────────────────────────────────────────────────────────
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeInOutQuad  = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
const easeOutExpo    = (t: number) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)

function splineAt(pts: Array<{ x: number; y: number }>, u: number) {
  const n = pts.length - 1
  const f = isFinite(u) ? Math.min(Math.max(u, 0) * n, n - 1e-6) : 0
  const i = Math.floor(f), t = f - i
  const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)]
  const t2 = t * t, t3 = t2 * t
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
  }
}

function smoothPath(xs: number[], ys: number[]) {
  let d = `M${xs[0]},${ys[0]}`
  const n = xs.length
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[Math.max(0, i - 1)],     y0 = ys[Math.max(0, i - 1)]
    const x1 = xs[i],                      y1 = ys[i]
    const x2 = xs[i + 1],                  y2 = ys[i + 1]
    const x3 = xs[Math.min(n - 1, i + 2)], y3 = ys[Math.min(n - 1, i + 2)]
    d += ` C${(x1 + (x2 - x0) / 6).toFixed(2)},${(y1 + (y2 - y0) / 6).toFixed(2)} ${(x2 - (x3 - x1) / 6).toFixed(2)},${(y2 - (y3 - y1) / 6).toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`
  }
  return d
}

// ── Equity curve (mirrors the seeded real curve: €21,106 → €25,269) ─────────
const EQUITY = [0, 0.5, 1.1, 0.85, 1.5, 2.1, 1.85, 2.6, 3.3, 2.95, 3.7, 4.5, 4.15, 4.9, 5.7, 5.35, 6.2, 7.1, 6.7, 7.6, 8.5, 8.15, 9.1, 10.0]
const CW = 500, CH = 78
const EQ_XS = EQUITY.map((_, i) => (i / (EQUITY.length - 1)) * CW)
const EQ_YS = EQUITY.map(v => CH - (v / 10) * (CH * 0.78) - CH * 0.12)
const EQ_LINE = smoothPath(EQ_XS, EQ_YS)
const EQ_AREA = `${EQ_LINE} L${CW},${CH} L0,${CH} Z`

// 30-day P&L bars (green/red like the real Daily P&L panel)
const DAILY = [1.2, 0.8, -0.5, 1.6, 0.9, 1.1, -0.8, 0.4, 1.9, 1.3, -0.3, 0.7, 1.5, -1.1, 0.6, 2.1, 1.0, 0.5, -0.6, 1.4, 0.8, 1.8, -0.4, 1.1, 0.9, 1.6, -0.7, 1.2, 2.3, 1.5]

// ── TradingView chart replica: dense 1h Gold candles, deterministic ──────────
// (seeded PRNG so SSR and client render the exact same chart)
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const N_CANDLES = 88
// Price waypoints copied from the real chart's story: high ~4,150 → slide to
// ~3,955 with rallies → basing just under 4,000
const WAYPOINTS: Array<[number, number]> = [
  [0, 4132], [8, 4150], [14, 4092], [22, 4038], [30, 4102], [38, 4122],
  [46, 4052], [52, 3998], [58, 3958], [64, 4042], [70, 3992], [75, 4028],
  [80, 3962], [87, 3997],
]
const { CANDLES, VOLUMES } = (() => {
  const rnd = mulberry32(7)
  const level = (i: number) => {
    let a = WAYPOINTS[0], b = WAYPOINTS[WAYPOINTS.length - 1]
    for (let k = 0; k < WAYPOINTS.length - 1; k++)
      if (i >= WAYPOINTS[k][0] && i <= WAYPOINTS[k + 1][0]) { a = WAYPOINTS[k]; b = WAYPOINTS[k + 1]; break }
    const t = (i - a[0]) / Math.max(b[0] - a[0], 1)
    return a[1] + (b[1] - a[1]) * t
  }
  const candles: number[][] = []
  const vols: number[] = []
  let close = level(0)
  for (let i = 0; i < N_CANDLES; i++) {
    const o = close
    const target = level(i + 1)
    const c = i === N_CANDLES - 1 ? 3997.775 : target + (rnd() - 0.5) * 14
    const h = Math.max(o, c) + rnd() * 9 + 1
    const l = Math.min(o, c) - rnd() * 9 - 1
    candles.push([o, h, l, c])
    vols.push(8 + rnd() * 14 + Math.abs(c - o) * 0.9)
    close = c
  }
  return { CANDLES: candles, VOLUMES: vols }
})()

// Chart geometry: SVG 1000×210, price band 3,940–4,210 → y 6..168, volume under
const TV_W = 1000, TV_H = 210
const PX = (i: number) => 6 + (i / N_CANDLES) * (TV_W - 64)
const PY = (p: number) => 6 + ((4210 - p) / (4210 - 3940)) * 162
const TV_GRID = [3950, 3975, 4000, 4025, 4050, 4075, 4100, 4125, 4150, 4175, 4200]
const TV_UP = '#26A69A', TV_DN = '#EF5350'
// date axis: hourly candles Tue 7 → Fri 17 (weekend gap), ~9 candles per day
const TV_DATES: Array<[number, string, boolean]> = [
  [4, '7', false], [13, '8', false], [22, '9', false], [31, '10', false],
  [40, '13', true], [49, '14', false], [58, '15', false], [67, '16', false], [78, '17', false],
]

// Per-scene duration (ms) — Trading gets the chart draw, VELQUOR the answer
const SCENE_MS = [4200, 4800, 4200, 4000, 5600]
const CLICK_AT = 0.958

// ── Tiny tab icons (match the real tab bar's icon set) ───────────────────────
const TAB_ICONS: string[] = [
  'M1 1h4v4H1zM7 1h4v4H7zM1 7h4v4H1zM7 7h4v4H7z',                    // Overview: grid
  'M3 4v5M3 2v1M3 9v1M9 3v4M9 1v1M9 7v2M2 4h2v4H2zM8 3h2v3H8z',      // Trading: candles
  'M2 4h8v6H2zM4 4V2.5h4V4',                                          // Portfolio: briefcase
  'M2.5 1.5h6a1 1 0 011 1v8h-6a1 1 0 01-1-1zM9.5 10.5h-6',            // Journal: book
  'M6 1a5 5 0 100 10A5 5 0 006 1zM1 6h10M6 1c-1.8 1.4-1.8 8.6 0 10M6 1c1.8 1.4 1.8 8.6 0 10', // Macro: globe
  'M6 1l4 1.5v3c0 2.6-1.7 4.6-4 5.5-2.3-.9-4-2.9-4-5.5v-3z',          // Discipline: shield
  'M2 2h8v8H2zM4 6l1.5 1.5L8.5 4.5',                                  // Tasks: check
  'M1 4h7M6 2l2 2-2 2M11 8H4M6 6L4 8l2 2',                            // Copy: arrows
  'M6 1l1.2 3.3L10.5 5.5 7.2 6.7 6 10 4.8 6.7 1.5 5.5 4.8 4.3z',      // Ask VELQUOR: sparkle
]

export function AnimatedDashboard() {
  const TABS = [
    { name: 'Overview' }, { name: 'Trading' }, { name: 'Portfolio' }, { name: 'Journal' },
    { name: 'News' }, { name: 'Discipline' }, { name: 'Tasks' }, { name: 'Copy' }, { name: 'Analyst', gold: true },
  ]
  const SCENE_TABS = [0, 1, 3, 7, 8]
  const STEPS = SCENE_TABS.length

  const READ_PATHS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[0.22, 0.30], [0.42, 0.46], [0.68, 0.44], [0.86, 0.46], [0.30, 0.76], [0.76, 0.78]], // Overview
    [[0.24, 0.22], [0.42, 0.40], [0.66, 0.48], [0.90, 0.52], [0.14, 0.87], [0.44, 0.88]], // Trading
    [[0.16, 0.22], [0.58, 0.22], [0.26, 0.55], [0.82, 0.42], [0.84, 0.66], [0.32, 0.85]], // Journal
    [[0.20, 0.14], [0.40, 0.30], [0.34, 0.44], [0.62, 0.56], [0.42, 0.76], [0.32, 0.90]], // Copy
    [[0.26, 0.14], [0.32, 0.38], [0.30, 0.50], [0.30, 0.80], [0.64, 0.80], [0.85, 0.40]], // Ask VELQUOR
  ]

  const [step, setStep]         = useState(0)
  const [entered, setEntered]   = useState(false)
  const [hoverTab, setHoverTab] = useState<number | null>(null)
  const [clickFx, setClickFx]   = useState(0)
  const [qChars, setQChars]     = useState(0)      // question typed into the input
  const [answerOn, setAnswerOn] = useState(false)  // chat view replaces quick questions
  const [typedChars, setTyped]  = useState(0)      // answer typewriter

  const containerRef  = useRef<HTMLDivElement>(null)
  const cursorRef     = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const eqPathRef     = useRef<SVGPathElement>(null)
  const eqAreaRef     = useRef<SVGPathElement>(null)
  const eqDotRef      = useRef<SVGCircleElement>(null)
  const ringRef       = useRef<SVGCircleElement>(null)
  const clockRef      = useRef<HTMLSpanElement>(null)
  const clockUtcRef   = useRef<HTMLSpanElement>(null)
  const clockHmRef    = useRef<HTMLSpanElement>(null)
  const syncAgoRef    = useRef<HTMLSpanElement>(null)
  const lastCandleRef = useRef<SVGRectElement>(null)
  const lastWickRef   = useRef<SVGLineElement>(null)
  const tvClipRef     = useRef<SVGRectElement>(null)
  const priceLineRef  = useRef<SVGLineElement>(null)
  const tagRef        = useRef<SVGGElement>(null)
  const tagTextRef    = useRef<SVGTextElement>(null)
  const ohlcCRef      = useRef<HTMLSpanElement>(null)

  const tabPtsRef     = useRef<Array<{ x: number; y: number }>>([])
  const splineRef     = useRef<Array<{ x: number; y: number }>>([])
  const segEndsRef    = useRef<number[]>([])
  const sceneStartRef = useRef(0)
  const clickedRef    = useRef(false)
  const switchedRef   = useRef(false)
  const cursorPosRef  = useRef({ x: 0, y: 0 })
  const stepRef       = useRef(0)
  const enteredAtRef  = useRef(0)
  const hotElsRef     = useRef<Array<{ el: HTMLElement; cx: number; cy: number }>>([])

  const measure = () => {
    const box = containerRef.current
    if (!box) return
    const b = box.getBoundingClientRect()
    if (!b.width) return
    tabPtsRef.current = Array.from(box.querySelectorAll<HTMLElement>('[data-tab]')).map(el => {
      const r = el.getBoundingClientRect()
      return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 }
    })
    hotElsRef.current = Array.from(box.querySelectorAll<HTMLElement>('[data-hot]')).map(el => {
      const r = el.getBoundingClientRect()
      return { el, cx: r.left - b.left + r.width / 2, cy: r.top - b.top + r.height / 2 }
    })
  }

  const buildSpline = (sceneIdx: number) => {
    const box = containerRef.current
    if (!box) return
    const { width: W, height: H } = box.getBoundingClientRect()
    if (!W) return
    const pts = READ_PATHS[sceneIdx].map(([fx, fy]) => ({ x: fx * W, y: fy * H }))
    const start = cursorPosRef.current.x ? { ...cursorPosRef.current } : pts[0]
    const nextTab = tabPtsRef.current[SCENE_TABS[(sceneIdx + 1) % STEPS]] ?? { x: W * 0.5, y: H * 0.1 }
    const spline = [start, ...pts, { x: nextTab.x, y: nextTab.y + 8 }, nextTab]
    splineRef.current = spline

    // Per-segment velocity: time ∝ sqrt(length) so long moves sweep and short
    // moves linger — each segment eases in AND out individually.
    const weights: number[] = []
    for (let i = 0; i < spline.length - 1; i++) {
      const len = Math.hypot(spline[i + 1].x - spline[i].x, spline[i + 1].y - spline[i].y)
      weights.push(Math.sqrt(Math.max(len, 24)))
    }
    const total = weights.reduce((a, b) => a + b, 0)
    let acc = 0
    segEndsRef.current = weights.map(w => (acc += w / total))
  }

  useEffect(() => {
    stepRef.current = step
    clickedRef.current = false
    switchedRef.current = false
    sceneStartRef.current = performance.now()
    setEntered(false)
    setQChars(0); setAnswerOn(false); setTyped(0)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      measure()
      buildSpline(step)
      enteredAtRef.current = performance.now()
      setEntered(true)
    }))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Ask VELQUOR: type the question into the input, then stream the answer
  useEffect(() => {
    if (step !== 4 || !entered) return
    const timers: Array<ReturnType<typeof setInterval> | ReturnType<typeof setTimeout>> = []
    let q = 0
    timers.push(setInterval(() => {
      q += 1
      setQChars(Math.min(q, VELQUOR_Q.length))
      if (q >= VELQUOR_Q.length) clearInterval(timers[0] as ReturnType<typeof setInterval>)
    }, 34))
    timers.push(setTimeout(() => {
      setAnswerOn(true)
      let i = 0
      const id = setInterval(() => {
        i += 2
        setTyped(Math.min(i, VELQUOR_TEXT.length))
        if (i >= VELQUOR_TEXT.length) clearInterval(id)
      }, 22)
      timers.push(id)
    }, 1750))
    return () => timers.forEach(t => clearInterval(t as ReturnType<typeof setInterval>))
  }, [step, entered])

  useEffect(() => {
    let raf = 0
    let eqLen = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dur = SCENE_MS[stepRef.current] ?? 4200
      const u = Math.min(Math.max((now - sceneStartRef.current) / dur, 0), 1)

      // ── Cursor: per-segment ease-in/ease-out along the spline ──
      const spline = splineRef.current
      const ends = segEndsRef.current
      if (spline.length > 2 && ends.length && cursorRef.current) {
        let seg = ends.findIndex(e => u <= e)
        if (seg === -1) seg = ends.length - 1
        const segStart = seg === 0 ? 0 : ends[seg - 1]
        const local = (u - segStart) / Math.max(ends[seg] - segStart, 1e-6)
        // 88% eased + 12% linear → decelerates into every waypoint but never
        // fully stops (the cursor rule)
        const localV = 0.88 * easeInOutQuad(Math.min(local, 1)) + 0.12 * Math.min(local, 1)
        const globalU = (seg + localV) / ends.length
        const p = splineAt(spline, globalU)
        const drift = Math.sin(now / 420) * 1.2
        cursorPosRef.current = { x: p.x, y: p.y }
        cursorRef.current.style.transform = `translate3d(${(p.x + drift).toFixed(1)}px, ${(p.y + Math.cos(now / 470) * 1.1).toFixed(1)}px, 0) scale(${clickedRef.current && u > CLICK_AT ? 0.9 : 1})`
      }

      // Proximity glow
      const cur = cursorPosRef.current
      for (const h of hotElsRef.current) {
        const d = Math.hypot(cur.x - h.cx, cur.y - h.cy)
        const near = Math.max(0, 1 - d / 120)
        h.el.style.borderColor = near > 0.25 ? `rgba(77,143,255,${(0.12 + near * 0.35).toFixed(2)})` : ''
        h.el.style.boxShadow = near > 0.25 ? `0 0 ${(near * 22).toFixed(0)}px rgba(77,143,255,${(near * 0.13).toFixed(2)})` : ''
      }

      // Tab hover → click → switch
      if (u > 0.9 && hoverTab === null) setHoverTab(SCENE_TABS[(stepRef.current + 1) % STEPS])
      if (u >= CLICK_AT && !clickedRef.current) { clickedRef.current = true; setClickFx(c => c + 1) }
      if (u >= 1 && !switchedRef.current) { switchedRef.current = true; setHoverTab(null); setStep(s => (s + 1) % STEPS) }

      if (progressRef.current) progressRef.current.style.transform = `scaleX(${u.toFixed(4)})`

      // Live clocks — real time, like the app
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      if (clockRef.current)    clockRef.current.textContent    = `${pad((d.getUTCHours() + 2) % 24)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
      if (clockUtcRef.current) clockUtcRef.current.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
      if (clockHmRef.current)  clockHmRef.current.textContent  = `↻ ${pad((d.getUTCHours() + 2) % 24)}:${pad(d.getUTCMinutes())}`
      if (syncAgoRef.current)  syncAgoRef.current.textContent  = `${(4 + Math.floor((now / 1000) % 25))}s ago`

      const sceneAge = now - enteredAtRef.current

      // Equity curve self-draw + breathing head (Overview)
      if (stepRef.current === 0 && eqPathRef.current && eqDotRef.current && eqAreaRef.current) {
        const path = eqPathRef.current
        if (!eqLen) { eqLen = path.getTotalLength(); path.style.strokeDasharray = `${eqLen}` }
        const dp = easeInOutCubic(Math.min(Math.max(sceneAge / 1400, 0), 1))
        path.style.strokeDashoffset = `${eqLen * (1 - dp)}`
        eqAreaRef.current.style.opacity = `${dp * 0.9}`
        const head = path.getPointAtLength(eqLen * dp)
        const live = dp >= 1 ? Math.sin(now / 300) * 1.2 : 0
        eqDotRef.current.setAttribute('cx', `${head.x}`)
        eqDotRef.current.setAttribute('cy', `${head.y + live}`)
        eqDotRef.current.setAttribute('r', `${3 + (dp >= 1 ? (Math.sin(now / 500) + 1) * 0.6 : 0)}`)
      } else { eqLen = 0 }

      // Win-rate ring sweep (Overview) — 67% like the real account
      if (stepRef.current === 0 && ringRef.current) {
        const k = easeOutExpo(Math.min(Math.max(sceneAge / 1300, 0), 1))
        const CIRC = 2 * Math.PI * 15
        ringRef.current.style.strokeDashoffset = `${CIRC * (1 - 0.67 * k)}`
      }

      // TradingView chart: left→right reveal, then the last candle ticks live
      if (stepRef.current === 1) {
        if (tvClipRef.current) {
          const k = easeInOutCubic(Math.min(Math.max(sceneAge / 1100, 0), 1))
          tvClipRef.current.setAttribute('width', `${(TV_W * k).toFixed(1)}`)
        }
        const [o] = CANDLES[N_CANDLES - 1]
        const c = 3997.775 + Math.sin(now / 430) * 2.6 + Math.sin(now / 139) * 1.0
        const up = c >= o
        const col = up ? TV_UP : TV_DN
        if (lastCandleRef.current) {
          lastCandleRef.current.setAttribute('y', `${Math.min(PY(o), PY(c)).toFixed(2)}`)
          lastCandleRef.current.setAttribute('height', `${Math.max(1.4, Math.abs(PY(o) - PY(c))).toFixed(2)}`)
          lastCandleRef.current.setAttribute('fill', col)
        }
        if (lastWickRef.current) {
          lastWickRef.current.setAttribute('y1', `${PY(Math.max(o, c) + 4).toFixed(2)}`)
          lastWickRef.current.setAttribute('y2', `${PY(Math.min(o, c) - 4).toFixed(2)}`)
          lastWickRef.current.setAttribute('stroke', col)
        }
        if (priceLineRef.current) {
          priceLineRef.current.setAttribute('y1', `${PY(c).toFixed(2)}`)
          priceLineRef.current.setAttribute('y2', `${PY(c).toFixed(2)}`)
        }
        if (tagRef.current)  tagRef.current.setAttribute('transform', `translate(0 ${(PY(c) - 7).toFixed(2)})`)
        if (tagTextRef.current) tagTextRef.current.textContent = c.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
        if (ohlcCRef.current)   ohlcCRef.current.textContent   = `C${c.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} ${c >= 3997.37 ? '+' : '−'}${Math.abs(c - 3997.37).toFixed(3)} (${c >= 3997.37 ? '+' : '−'}${(Math.abs(c - 3997.37) / 39.97).toFixed(2)}%)`
      }

      // Count-up metrics
      const box = containerRef.current
      if (box) {
        const k = easeOutExpo(Math.min(Math.max(sceneAge / 1100, 0), 1))
        box.querySelectorAll<HTMLElement>('[data-count-to]').forEach(el => {
          const to = parseFloat(el.dataset.countTo || '0')
          const dec = parseInt(el.dataset.countDec || '0')
          const v = to * k
          const num = el.dataset.countPlain != null
            ? v.toFixed(dec)
            : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
          el.textContent = (el.dataset.countPre || '') + num + (el.dataset.countSuf || '')
        })
      }
    }

    raf = requestAnimationFrame(tick)
    const onResize = () => { measure(); buildSpline(stepRef.current) }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stag = (i: number): React.CSSProperties => ({
    opacity: entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(9px)',
    filter: entered ? 'blur(0)' : 'blur(5px)',
    transition: `opacity .5s cubic-bezier(.22,1,.36,1) ${i * 65}ms, transform .55s cubic-bezier(.22,1,.36,1) ${i * 65}ms, filter .45s ease ${i * 65}ms`,
  })

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.02)', borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.055)',
    transition: 'border-color .3s ease, box-shadow .3s ease',
  }
  const capsLabel: React.CSSProperties = {
    margin: 0, color: 'var(--t3)', fontSize: '6.5px', letterSpacing: '0.09em',
    textTransform: 'uppercase', fontWeight: 600,
  }

  // Period selector chips on the Trading metric cards (M active, per-card color)
  const periodPills = (color: string) => (
    <span style={{ display: 'inline-flex', gap: '2px' }}>
      {['D', 'W', 'M', 'Q', 'Y'].map(p => (
        <span key={p} style={{
          fontSize: '5.5px', fontWeight: 700, width: '10px', height: '10px', borderRadius: '3px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: p === 'M' ? color : 'rgba(255,255,255,0.05)',
          color: p === 'M' ? '#fff' : 'var(--t3)',
        }}>{p}</span>
      ))}
    </span>
  )

  const RING_CIRC = 2 * Math.PI * 15

  // Journal calendar: July 2026 starts Wednesday; missed 1–2, journaled 6–17
  const JOURNALED = [3, 6, 7, 8, 9, 10, 13, 14, 15, 16, 17]
  const MISSED = [1, 2]

  return (
    <>
      <style>{`
        @keyframes vq-caret { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes vq-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.8);opacity:0} }
        @keyframes vq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes vq-tape  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes vq-grow  { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .vq-bar { transform-box: fill-box; transform-origin: center bottom; animation: vq-grow .55s cubic-bezier(.34,1.56,.64,1) backwards; }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', background: '#0A0C10', position: 'relative', overflow: 'hidden', fontVariantNumeric: 'tabular-nums' }}>

        {/* Cursor */}
        <div ref={cursorRef} style={{
          position: 'absolute', left: 0, top: 0, zIndex: 60, pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.85))', willChange: 'transform',
        }}>
          <svg width="13" height="17" viewBox="0 0 13 17" fill="none">
            <path d={CURSOR_SVG_PATH} fill="white" stroke="rgba(0,0,0,0.55)" strokeWidth="1.2" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div key={clickFx} style={{
            position: 'absolute', top: '-6px', left: '-6px', width: '25px', height: '25px',
            borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.9)',
            animation: clickFx ? 'vq-click .4s ease-out forwards' : 'none', opacity: 0,
          }} />
        </div>

        {/* ── Topbar (1:1) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 14px', background: '#000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LogoMark size={17} />
            <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Velquor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '4px 12px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.6s ease-in-out infinite' }} />
            <span style={{ color: 'var(--gr2)', fontSize: '8.5px', fontWeight: 700 }}>MT5</span>
            <span style={{ color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>€24.830,50</span>
            <span ref={syncAgoRef} style={{ color: 'var(--t3)', fontSize: '8px' }}>5s ago</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8.5px', color: 'var(--t2)' }}>€</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8.5px', fontWeight: 700, color: 'white' }}>T</div>
              <div>
                <p style={{ margin: 0, color: 'var(--t1)', fontSize: '8px', fontWeight: 600, lineHeight: 1.25 }}>Trader</p>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '6.5px', lineHeight: 1.25 }}>Live · EUR</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TradingView ticker tape ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', padding: '5px 0', background: '#000', position: 'relative' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'vq-tape 30s linear infinite', width: 'max-content' }}>
            {[...TAPE, ...TAPE].map((q, qi) => (
              <span key={qi} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, padding: '0 14px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: q.chipBg, color: '#fff', fontSize: '5.5px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{q.chip}</span>
                <span style={{ color: 'var(--t1)', fontSize: '8.5px', fontWeight: 700 }}>{q.sym}</span>
                <span style={{ color: 'var(--t1)', fontSize: '8.5px' }}>{q.price}</span>
                <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '8px', fontWeight: 600 }}>{q.chg}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Tab bar — 9 real tabs with icons + settings gear ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map((tb, i) => {
            const active = SCENE_TABS[step] === i
            return (
              <span key={tb.name} data-tab={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '9px', padding: '3.5px 7px', borderRadius: '5px', whiteSpace: 'nowrap',
                color: tb.gold ? '#E8B84B' : active ? 'var(--t1)' : hoverTab === i ? 'var(--t2)' : 'var(--t3)',
                background: active ? 'rgba(255,255,255,0.06)' : hoverTab === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                fontWeight: active ? 700 : 500,
                boxShadow: active ? 'inset 0 -1.5px 0 rgba(77,143,255,0.7)' : 'none',
                transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
              }}>
                <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round" style={{ opacity: 0.85 }}>
                  <path d={TAB_ICONS[i]} fill={i === 8 ? 'currentColor' : 'none'} />
                </svg>
                {tb.name}
              </span>
            )
          })}
          <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: '10px' }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><circle cx="6" cy="6" r="2" /><path d="M6 1v1.6M6 9.4V11M1 6h1.6M9.4 6H11M2.5 2.5l1.1 1.1M8.4 8.4l1.1 1.1M9.5 2.5L8.4 3.6M3.6 8.4L2.5 9.5" /></svg>
          </span>
        </div>

        {/* ── Market strip: boxed segments + refresh clock ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.012)' }}>
          <div style={{ display: 'flex' }}>
            {STRIP.map((q, i) => (
              <span key={q.sym} style={{ display: 'inline-flex', gap: '5px', alignItems: 'center', padding: '0 12px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
                <span style={{ color: 'var(--t3)', fontSize: '7.5px', fontWeight: 700, letterSpacing: '0.04em' }}>{q.sym}</span>
                <span style={{ color: 'var(--t1)', fontSize: '7.5px', fontWeight: 600 }}>{q.price}</span>
                <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '7.5px', fontWeight: 600 }}>{q.chg}</span>
              </span>
            ))}
          </div>
          <span ref={clockHmRef} style={{ color: 'var(--t3)', fontSize: '7.5px' }} />
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '10px 14px 10px', minHeight: '300px' }}>

          {/* OVERVIEW */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {/* Hero card */}
              <div data-hot style={{ ...card, padding: '10px 13px 11px', position: 'relative', overflow: 'hidden', ...stag(0) }}>
                <div style={{ position: 'absolute', top: '-60px', right: '30px', width: '160px', height: '160px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,143,255,0.10), transparent 70%)' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                  <p style={{ ...capsLabel, fontSize: '7px' }}>Friday, 17 July 2026</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', ...stag(1) }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                      <span style={{ color: 'var(--t3)', fontSize: '7px' }}>2/3</span>
                      {[1, 1, 0].map((on, i) => <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: on ? 'var(--gr2)' : 'rgba(255,255,255,0.1)', boxShadow: on ? '0 0 4px rgba(0,232,122,0.5)' : 'none' }} />)}
                    </span>
                    <span style={{ color: 'var(--go2)', fontSize: '8px', fontWeight: 700 }}>🔥 9d habit streak</span>
                    <span style={{ color: 'var(--go2)', fontSize: '8px', fontWeight: 700 }}>🔥 12d journal</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '17px', fontWeight: 700, letterSpacing: '-0.03em' }}>Good afternoon, Trader</p>
                  <span style={{ background: 'rgba(0,232,122,0.1)', border: '1px solid rgba(0,232,122,0.25)', color: 'var(--gr2)', fontSize: '7.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', ...stag(2) }}>🔥 2-trade win streak</span>
                </div>
                {/* Session clock bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', padding: '5px 10px', marginBottom: '9px', ...stag(3) }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--go2)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                    <span style={{ color: 'var(--go2)', fontSize: '8.5px', fontWeight: 700 }}>London/NY Overlap</span>
                    <span style={{ color: 'var(--t1)', fontSize: '8.5px', fontWeight: 600 }}><span ref={clockRef} /> CET</span>
                    <span ref={clockUtcRef} style={{ color: 'var(--t3)', fontSize: '8px' }} />
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: '8px' }}>London closes in <span style={{ color: 'var(--ac)', fontWeight: 700 }}>1h 41m</span></span>
                </div>
                {/* Metric grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  <div data-hot style={{ ...card, padding: '9px 11px', ...stag(4) }}>
                    <p style={capsLabel}>MT5 Balance</p>
                    <p style={{ margin: '3px 0 2px', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}
                      data-count-to="24830.50" data-count-dec="2" data-count-pre="€">€0.00</p>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px' }}>Equity €24,960.50</p>
                    <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '7px' }}>29W / 14L · 43 trades</p>
                  </div>
                  <div data-hot style={{ ...card, padding: '9px 11px', background: 'rgba(0,232,122,0.06)', border: '1px solid rgba(0,232,122,0.16)', borderLeft: '2.5px solid var(--gr2)', ...stag(5) }}>
                    <p style={capsLabel}>Today P&L</p>
                    <p style={{ margin: '3px 0 2px', color: 'var(--gr2)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em', textShadow: '0 0 16px rgba(0,232,122,0.4)' }}
                      data-count-to="408.70" data-count-dec="2" data-count-pre="+€" data-count-plain="">+€0.00</p>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px' }}>1.65% of balance</p>
                  </div>
                  <div data-hot style={{ ...card, padding: '9px 11px', background: 'rgba(0,232,122,0.05)', border: '1px solid rgba(0,232,122,0.13)', ...stag(6) }}>
                    <p style={capsLabel}>Month P&L</p>
                    <p style={{ margin: '3px 0 2px', color: 'var(--gr2)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}
                      data-count-to="6.00" data-count-dec="2" data-count-pre="+" data-count-suf="%" data-count-plain="">+0.00%</p>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px' }}>11W · 6L this month</p>
                  </div>
                  <div data-hot style={{ ...card, padding: '9px 11px', ...stag(7) }}>
                    <p style={capsLabel}>Win Rate</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                      <svg width="34" height="34" viewBox="0 0 38 38">
                        <circle cx="19" cy="19" r="15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                        <circle ref={ringRef} cx="19" cy="19" r="15" fill="none" stroke="var(--gr2)" strokeWidth="3.5" strokeLinecap="round"
                          strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC} transform="rotate(-90 19 19)"
                          style={{ filter: 'drop-shadow(0 0 4px rgba(0,232,122,0.55))' }} />
                        <text x="19" y="22" textAnchor="middle" fill="var(--gr2)" fontSize="8.5" fontWeight="800">67%</text>
                      </svg>
                      <div>
                        <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>29W / 14L</p>
                        <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '7px' }}>Best: NAS100 · 80%</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Charts row: Equity Curve (3/5) + Daily P&L (2/5) */}
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '9px' }}>
                <div data-hot style={{ ...card, borderLeft: '2px solid var(--gr2)', padding: '8px 11px 6px', ...stag(8) }}>
                  <p style={{ margin: '0 0 5px', color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>Equity Curve</p>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: 0, left: 0, color: 'var(--t3)', fontSize: '6px' }}>€25,269</span>
                    <span style={{ position: 'absolute', bottom: '10px', left: 0, color: 'var(--t3)', fontSize: '6px' }}>€21,106</span>
                    <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '76px', display: 'block' }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="vq-eq-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(0,232,122,0.22)" />
                          <stop offset="100%" stopColor="rgba(0,232,122,0)" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map(f => <line key={f} x1="0" x2={CW} y1={CH * f} y2={CH * f} stroke="rgba(255,255,255,0.04)" strokeDasharray="3 5" />)}
                      <path ref={eqAreaRef} d={EQ_AREA} fill="url(#vq-eq-fill)" style={{ opacity: 0 }} />
                      <path ref={eqPathRef} d={EQ_LINE} fill="none" stroke="var(--gr2)" strokeWidth="1.6"
                        style={{ filter: 'drop-shadow(0 0 5px rgba(0,232,122,0.5))' }} vectorEffect="non-scaling-stroke" />
                      <circle ref={eqDotRef} r="3" fill="var(--gr2)" style={{ filter: 'drop-shadow(0 0 6px rgba(0,232,122,0.9))' }} />
                    </svg>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 4px 0' }}>
                      {['18 May', '17 Jun', '2 Jul', '17 Jul'].map(dt => <span key={dt} style={{ color: 'var(--t3)', fontSize: '5.5px' }}>{dt}</span>)}
                    </div>
                  </div>
                </div>
                <div data-hot style={{ ...card, borderLeft: '2px solid var(--ac)', padding: '8px 11px 6px', ...stag(9) }}>
                  <p style={{ margin: '0 0 5px', color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>Daily P&L — 30 Days</p>
                  <svg viewBox="0 0 300 82" style={{ width: '100%', height: '82px', display: 'block' }} preserveAspectRatio="none">
                    <line x1="0" x2="300" y1="41" y2="41" stroke="rgba(255,255,255,0.07)" />
                    {DAILY.map((v, i) => {
                      const h = Math.abs(v) * 15
                      return (
                        <rect key={`${step}-${i}`} className="vq-bar" style={{ animationDelay: `${150 + i * 22}ms` }}
                          x={4 + i * 9.8} width="6.4" y={v >= 0 ? 41 - h : 41} height={h} rx="1"
                          fill={v >= 0 ? 'rgba(0,232,122,0.62)' : 'rgba(255,61,80,0.62)'} />
                      )
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* TRADING */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {/* Period pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', ...stag(0) }}>
                {['This Week', 'This Month', 'Last Week', 'Last Year'].map((p, i) => (
                  <span key={p} style={{
                    fontSize: '7.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px',
                    background: i === 1 ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: i === 1 ? 'var(--t1)' : 'var(--t3)',
                  }}>{p}</span>
                ))}
                <span style={{ marginLeft: 'auto', color: 'var(--t3)', fontSize: '7.5px', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '20px', padding: '3px 9px' }}>⛭ Custom range</span>
              </div>
              {/* Live Chart panel — TradingView replica */}
              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(1) }}>
                <p style={{ margin: 0, padding: '6px 11px', color: 'var(--t1)', fontSize: '9px', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>Live Chart</p>
                {/* TV toolbar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '4px 11px', borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--t3)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--t1)', fontSize: '8px', fontWeight: 700 }}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="5" cy="5" r="3.4" /><path d="M7.6 7.6L11 11" /></svg>
                    XAUUSD
                  </span>
                  <span style={{ fontSize: '9px' }}>⊕</span>
                  <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize: '7.5px' }}>1m</span>
                  <span style={{ fontSize: '7.5px' }}>30m</span>
                  <span style={{ fontSize: '7.5px', color: 'var(--t1)', fontWeight: 700, background: 'rgba(255,255,255,0.07)', padding: '1px 5px', borderRadius: '3px' }}>1h ▾</span>
                  <span style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.08)' }} />
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M3 3v6M3 2v1M3 9v1M9 4v4M9 3v1M9 8v1M2 4h2v3H2zM8 5h2v2H8z" /></svg>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '7.5px' }}>
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M1 9l3-4 2.5 2L11 2M1 11h10" /></svg>
                    Indicators
                  </span>
                </div>
                {/* OHLC legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 11px 0' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', background: '#C9A227', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '5px', fontWeight: 800, color: '#000' }}>Au</span>
                  <span style={{ color: 'var(--t1)', fontSize: '8px', fontWeight: 600 }}>Gold Spot / U.S. Dollar · 1h · OANDA</span>
                  <span style={{ color: TV_UP, fontSize: '7.5px' }}>O3,997.300 H4,004.605 L3,990.190 <span ref={ohlcCRef}>C3,997.775 +0.405 (+0.01%)</span></span>
                </div>
                <p style={{ margin: 0, padding: '1px 11px 0', color: 'var(--t3)', fontSize: '7px' }}>Vol · Ticks <span style={{ color: TV_UP }}>81.67K</span></p>
                {/* Chart */}
                <svg viewBox={`0 0 ${TV_W} ${TV_H}`} style={{ width: '100%', display: 'block' }} preserveAspectRatio="none">
                  <defs>
                    <clipPath id="vq-tv-reveal"><rect ref={tvClipRef} x="0" y="0" width="0" height={TV_H} /></clipPath>
                  </defs>
                  {/* grid + price labels */}
                  {TV_GRID.map(p => (
                    <g key={p}>
                      <line x1="0" x2={TV_W - 58} y1={PY(p)} y2={PY(p)} stroke="rgba(255,255,255,0.045)" strokeDasharray="1 4" />
                      <text x={TV_W - 50} y={PY(p) + 2.5} fill={p % 50 === 0 ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)'} fontSize="8" fontWeight={p % 50 === 0 ? 700 : 400}>
                        {p.toLocaleString('en-US')}.000
                      </text>
                    </g>
                  ))}
                  {TV_DATES.map(([i]) => (
                    <line key={i} x1={PX(i)} x2={PX(i)} y1="0" y2={TV_H - 14} stroke="rgba(255,255,255,0.03)" />
                  ))}
                  <g clipPath="url(#vq-tv-reveal)">
                    {/* volume histogram */}
                    {VOLUMES.map((v, i) => (
                      <rect key={`v${i}`} x={PX(i) - 3} width="6" y={TV_H - 16 - v * 1.5} height={v * 1.5}
                        fill={CANDLES[i][3] >= CANDLES[i][0] ? 'rgba(38,166,154,0.28)' : 'rgba(239,83,80,0.28)'} />
                    ))}
                    {/* candles */}
                    {CANDLES.map(([o, h, l, c], i) => {
                      const up = c >= o
                      const col = up ? TV_UP : TV_DN
                      const isLast = i === N_CANDLES - 1
                      return (
                        <g key={i}>
                          <line ref={isLast ? lastWickRef : undefined} x1={PX(i)} x2={PX(i)} y1={PY(h)} y2={PY(l)} stroke={col} strokeWidth="1" />
                          <rect ref={isLast ? lastCandleRef : undefined} x={PX(i) - 2.6} width="5.2"
                            y={PY(Math.max(o, c))} height={Math.max(1.4, Math.abs(PY(o) - PY(c)))} fill={col} />
                        </g>
                      )
                    })}
                  </g>
                  {/* current price: dotted line + tag */}
                  <line ref={priceLineRef} x1="0" x2={TV_W - 58} y1={PY(3997.775)} y2={PY(3997.775)} stroke="rgba(38,166,154,0.5)" strokeDasharray="2 3" />
                  <g ref={tagRef} transform={`translate(0 ${PY(3997.775) - 7})`}>
                    <rect x={TV_W - 56} width="54" height="14" rx="2" fill="#26A69A" />
                    <text ref={tagTextRef} x={TV_W - 29} y="10" textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="700">3,997.775</text>
                  </g>
                  <g transform={`translate(0 ${PY(3997.775) + 8})`}>
                    <rect x={TV_W - 56} width="54" height="12" rx="2" fill="rgba(38,166,154,0.25)" />
                    <text x={TV_W - 29} y="9" textAnchor="middle" fill={TV_UP} fontSize="7.5" fontWeight="700">81.67K</text>
                  </g>
                  {/* TV watermark */}
                  <g opacity="0.5">
                    <circle cx="22" cy={TV_H - 30} r="9" fill="rgba(255,255,255,0.08)" />
                    <text x="22" y={TV_H - 26.5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="8" fontWeight="800">17</text>
                  </g>
                  {/* date axis */}
                  {TV_DATES.map(([i, label, bold]) => (
                    <text key={label} x={PX(i)} y={TV_H - 3} textAnchor="middle" fill={bold ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)'} fontSize="7.5" fontWeight={bold ? 700 : 400}>{label}</text>
                  ))}
                </svg>
                <p style={{ margin: 0, padding: '2px 0 5px', textAlign: 'center', color: 'var(--t3)', fontSize: '6.5px' }}>Chart by TradingView</p>
              </div>
              {/* Metric cards with period pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                {[
                  { label: 'P&L',          val: '+€1488.70', sub: '17 trades',       color: 'var(--gr2)', pill: 'var(--gr)',  count: { to: 1488.70, dec: 2, pre: '+€', plain: true } },
                  { label: 'Win Rate',     val: '64.7%',     sub: '11W · 6L',        color: 'var(--t1)',  pill: 'var(--ac)',  count: { to: 64.7, dec: 1, pre: '', suf: '%', plain: true }, subColor: 'var(--gr2)' },
                  { label: 'Real R:R',     val: '—',         sub: 'No SL data',      color: 'var(--t1)',  pill: 'var(--go2)' },
                  { label: 'Max Drawdown', val: '€126.00',   sub: 'Worst single day', color: 'var(--t1)', pill: 'var(--re)',  subColor: 'var(--re)' },
                  { label: 'Withdrawn',    val: '€0.00',     sub: 'No activity',     color: 'var(--t1)',  pill: 'var(--go2)' },
                ].map((m, i) => (
                  <div key={m.label} data-hot style={{ ...card, padding: '8px 10px', ...stag(2 + i) }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <p style={capsLabel}>{m.label}</p>
                      {periodPills(m.pill)}
                    </div>
                    {m.count ? (
                      <p style={{ margin: 0, color: m.color, fontSize: '13px', fontWeight: 800, letterSpacing: '-0.02em' }}
                        data-count-to={m.count.to} data-count-dec={m.count.dec} data-count-pre={m.count.pre} data-count-suf={m.count.suf ?? ''} data-count-plain="">{m.count.pre}0{m.count.suf ?? ''}</p>
                    ) : (
                      <p style={{ margin: 0, color: m.color, fontSize: '13px', fontWeight: 800, letterSpacing: '-0.02em' }}>{m.val}</p>
                    )}
                    <p style={{ margin: '2px 0 0', color: m.subColor ?? 'var(--t3)', fontSize: '7px' }}>{m.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JOURNAL */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <div style={{ display: 'flex', gap: '5px', ...stag(0) }}>
                <span style={{ background: 'var(--ac)', color: '#fff', fontSize: '7.5px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px' }}>✎ Daily Journal</span>
                <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', color: 'var(--t3)', fontSize: '7.5px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px' }}>▦ Weekly Review</span>
              </div>
              {/* Stat cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[
                  { label: 'Entries this month', val: '12',        sub: 'of 23 trading days', color: 'var(--t1)', count: { to: 12, dec: 0 } },
                  { label: 'Avg Mood',           val: '7.2/10',    sub: 'Based on entries',   color: 'var(--go2)' },
                  { label: 'Mood → P&L',         val: 'See below', sub: 'Correlation analysis', color: 'var(--t1)' },
                  { label: 'Streak',             val: '12d',       sub: 'consecutive days',   color: 'var(--gr2)', subColor: 'var(--gr2)' },
                ].map((m, i) => (
                  <div key={m.label} data-hot style={{ ...card, padding: '9px 11px', ...stag(1 + i) }}>
                    <p style={capsLabel}>{m.label}</p>
                    {m.count ? (
                      <p style={{ margin: '3px 0 2px', color: m.color, fontSize: '14px', fontWeight: 800 }} data-count-to={m.count.to} data-count-dec="0">0</p>
                    ) : (
                      <p style={{ margin: '3px 0 2px', color: m.color, fontSize: m.val.length > 4 ? '11px' : '14px', fontWeight: 800 }}>{m.val}</p>
                    )}
                    <p style={{ margin: 0, color: m.subColor ?? 'var(--t3)', fontSize: '7px' }}>{m.sub}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '9px' }}>
                {/* Calendar */}
                <div data-hot style={{ ...card, padding: '9px 12px', ...stag(5) }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>‹</span>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>July 2026</p>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>›</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '3px' }}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dn => (
                      <div key={dn} style={{ textAlign: 'center', fontSize: '6px', color: 'var(--t3)', fontWeight: 600 }}>{dn}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                    {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map((dd, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: '7px', padding: '3.5px 0', borderRadius: '3px', position: 'relative',
                        color: dd === 17 ? 'var(--t1)' : dd ? 'var(--t2)' : 'transparent',
                        fontWeight: dd === 17 ? 800 : 400,
                        background: dd && MISSED.includes(dd) ? 'rgba(255,61,80,0.09)' : 'rgba(255,255,255,0.015)',
                        border: dd === 17 ? '1px solid var(--ac)' : dd && MISSED.includes(dd) ? '1px solid rgba(255,61,80,0.25)' : '1px solid transparent',
                        ...(entered ? { opacity: 1, transition: `opacity .4s ease ${200 + i * 18}ms` } : { opacity: 0 }),
                      }}>
                        {dd || ''}
                        {dd && JOURNALED.includes(dd) && <span style={{ position: 'absolute', bottom: '1px', left: '50%', transform: 'translateX(-50%)', width: '3px', height: '3px', borderRadius: '50%', background: 'var(--gr2)' }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                    {[['var(--gr2)', 'Journaled'], ['var(--re)', 'Missed'], ['var(--ac)', 'Today']].map(([c, l]) => (
                      <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--t3)', fontSize: '6.5px' }}>
                        <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: c }} />{l}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Mood → P&L correlation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <div data-hot style={{ ...card, padding: '9px 12px', ...stag(6) }}>
                    <p style={{ margin: '0 0 2px', color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>Mood → P&L Correlation</p>
                    <p style={{ margin: '0 0 7px', color: 'var(--t3)', fontSize: '6.5px' }}>Average P&L on days you journaled, grouped by mood.</p>
                    {[
                      { mood: 'Great',   days: '4 days', avg: '+€78.68 avg',  w: 0.55 },
                      { mood: 'Good',    days: '5 days', avg: '+€93.40 avg',  w: 0.68 },
                      { mood: 'Neutral', days: '3 days', avg: '+€136.67 avg', w: 1 },
                    ].map((r, i) => (
                      <div key={r.mood} style={{ marginBottom: '6px', ...stag(7 + i) }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <span style={{ color: 'var(--t2)', fontSize: '7.5px', fontWeight: 600 }}>
                            <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: r.mood === 'Neutral' ? 'var(--go2)' : 'var(--gr2)', marginRight: '4px', verticalAlign: 'middle' }} />
                            {r.mood} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>{r.days}</span>
                          </span>
                          <span style={{ color: 'var(--gr2)', fontSize: '7.5px', fontWeight: 700 }}>{r.avg}</span>
                        </div>
                        <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.05)' }}>
                          <div style={{ width: `${r.w * 100}%`, height: '100%', borderRadius: '2px', background: 'var(--gr2)', boxShadow: '0 0 5px rgba(0,232,122,0.4)' }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ background: 'rgba(255,176,48,0.06)', border: '1px solid rgba(255,176,48,0.18)', borderRadius: '6px', padding: '6px 9px', marginTop: '7px', ...stag(10) }}>
                      <p style={{ margin: '0 0 2px', color: 'var(--go2)', fontSize: '6.5px', fontWeight: 800, letterSpacing: '0.08em' }}>VELQUOR INSIGHT</p>
                      <p style={{ margin: 0, color: 'var(--t2)', fontSize: '7px', lineHeight: 1.55 }}>
                        You trade best when feeling <span style={{ color: 'var(--go2)', fontWeight: 700 }}>neutral</span> (avg +€136.67/day). Watch for overconfidence on <span style={{ color: 'var(--gr2)', fontWeight: 700 }}>great</span> days (avg +€78.68/day).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Latest entry row */}
              <div data-hot style={{ ...card, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '8px', ...stag(11) }}>
                <span style={{ color: 'var(--t3)', fontSize: '7.5px' }}>▸</span>
                <span style={{ color: 'var(--t1)', fontSize: '8px', fontWeight: 700 }}>Fri 17 Jul</span>
                <span style={{ color: 'var(--gr2)', fontSize: '7.5px', fontWeight: 600 }}>great · 9/10</span>
                <span style={{ color: 'var(--t3)', fontSize: '7.5px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  Took 2 XAUUSD trades during London open. Both hit target. Waited for the OB confirmation before entering — felt calm and patient.
                </span>
                <span style={{ color: 'var(--gr2)', fontSize: '8px', fontWeight: 700 }}>+€408.70</span>
              </div>
            </div>
          )}

          {/* COPY */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', ...stag(0) }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.02em' }}>Copy Trading</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '7.5px' }}>Mirror trades across multiple MT5 accounts in real time</p>
                </div>
                <span style={{ background: 'var(--ac)', color: '#fff', fontSize: '7.5px', fontWeight: 700, padding: '4px 11px', borderRadius: '7px' }}>+ New Group</span>
              </div>
              {/* Group card */}
              <div data-hot style={{ ...card, padding: '10px 13px', ...stag(1) }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--gr2)', boxShadow: '0 0 6px rgba(0,232,122,0.6)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                    <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 700 }}>Main Group</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--t3)', fontSize: '6.5px', padding: '1.5px 6px', borderRadius: '20px' }}>0.5× lots</span>
                  </span>
                  <span style={{ display: 'inline-flex', gap: '5px' }}>
                    <span style={{ background: 'rgba(255,61,80,0.1)', border: '1px solid rgba(255,61,80,0.25)', color: 'var(--re)', fontSize: '7px', fontWeight: 700, padding: '2.5px 9px', borderRadius: '5px' }}>Pause</span>
                    <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--t3)', fontSize: '7px', fontWeight: 600, padding: '2.5px 9px', borderRadius: '5px' }}>Delete</span>
                  </span>
                </div>
                <p style={{ ...capsLabel, marginBottom: '4px', ...stag(2) }}>Leader Account</p>
                <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', padding: '7px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', ...stag(3) }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                    <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)' }} />
                    <span>
                      <span style={{ display: 'block', color: 'var(--t1)', fontSize: '8.5px', fontWeight: 700 }}>Blueberry Main</span>
                      <span style={{ color: 'var(--t3)', fontSize: '7px' }}>#114892 · BlueberryMarkets-Live02 · 5s ago</span>
                    </span>
                  </span>
                  <span style={{ color: 'var(--re)', fontSize: '7px', fontWeight: 600 }}>Remove</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', ...stag(4) }}>
                  <p style={capsLabel}>Follower Accounts (2)</p>
                  <span style={{ color: 'var(--ac)', fontSize: '7px', fontWeight: 700 }}>+ ADD FOLLOWER</span>
                </div>
                {[
                  { name: 'Blueberry Second', meta: '#221040 · BlueberryMarkets-Live02 · 8s ago' },
                  { name: 'FTMO Challenge',   meta: '#58112 · FTMO-Server · 12s ago' },
                ].map((s, i) => (
                  <div key={s.name} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', padding: '7px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px', ...stag(5 + i) }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                      <span>
                        <span style={{ display: 'block', color: 'var(--t1)', fontSize: '8.5px', fontWeight: 700 }}>{s.name}</span>
                        <span style={{ color: 'var(--t3)', fontSize: '7px' }}>{s.meta}</span>
                      </span>
                    </span>
                    <span style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                      <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--t3)', fontSize: '6.5px', padding: '2px 8px', borderRadius: '4px' }}>Pause</span>
                      <span style={{ color: 'var(--t3)', fontSize: '8px' }}>×</span>
                    </span>
                  </div>
                ))}
                {/* EA config */}
                <p style={{ ...capsLabel, color: 'var(--gr2)', margin: '8px 0 4px', ...stag(7) }}>EA Configuration</p>
                <div style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '7px', padding: '8px 11px', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: '7px', lineHeight: 1.75, ...stag(8) }}>
                  <p style={{ margin: 0, color: 'var(--t3)' }}>InpCopyMode <span style={{ color: 'var(--t2)' }}>=</span> <span style={{ color: 'var(--go2)', fontWeight: 700 }}>COPY_LEADER</span> <span style={{ color: 'rgba(255,255,255,0.25)' }}>// or COPY_FOLLOWER</span></p>
                  <p style={{ margin: 0, color: 'var(--t3)' }}>InpCopyGroupId <span style={{ color: 'var(--t2)' }}>=</span> <span style={{ color: 'var(--gr2)' }}>&quot;4ab1cc05-7f5d-4920-ad7b-8c9fa28d422c&quot;</span></p>
                  <p style={{ margin: 0, color: 'var(--t3)' }}>InpCopyLotMode <span style={{ color: 'var(--t2)' }}>=</span> <span style={{ color: 'var(--go2)', fontWeight: 700 }}>LOT_PROPORTIONAL</span></p>
                  <p style={{ margin: 0, color: 'var(--t3)' }}>InpCopyLotMult <span style={{ color: 'var(--t2)' }}>=</span> <span style={{ color: 'var(--ac)' }}>0.5</span></p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '7px', ...stag(9) }}>
                  <p style={capsLabel}>Activity Log</p>
                  <span style={{ color: 'var(--t3)', fontSize: '7px' }}>▾</span>
                </div>
              </div>
            </div>
          )}

          {/* ASK VELQUOR */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {/* Gold banner */}
              <div style={{ background: 'rgba(255,176,48,0.05)', border: '1px solid rgba(255,176,48,0.18)', borderRadius: '10px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '9px', ...stag(0) }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'rgba(255,176,48,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <LogoMark size={14} />
                </span>
                <div>
                  <p style={{ margin: 0, color: '#E8B84B', fontSize: '9.5px', fontWeight: 800 }}>VELQUOR Analyst</p>
                  <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '7px', lineHeight: 1.4 }}>Your personal trading coach. VELQUOR analyses your trade history, journal entries, and portfolio data to give you real, specific insights about your performance, habits, and psychology.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '9px' }}>
                {/* Ask card */}
                <div data-hot style={{ ...card, padding: '9px 12px', display: 'flex', flexDirection: 'column', ...stag(1) }}>
                  <p style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>Ask the Analyst</p>
                  {!answerOn ? (
                    <>
                      <p style={{ margin: '0 0 5px', color: 'var(--t3)', fontSize: '7px' }}>Quick questions:</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {[
                          "Full performance analysis — what's working and what isn't?",
                          'Why am I losing on Nasdaq?',
                          "Mood vs P&L — what's the pattern?",
                          'Am I overtrading?',
                          'What setup wins most for me?',
                        ].map((q, i) => (
                          <span key={q} style={{
                            background: i === 1 ? 'rgba(232,184,75,0.08)' : 'rgba(255,255,255,0.025)',
                            border: i === 1 ? '1px solid rgba(232,184,75,0.3)' : '1px solid rgba(255,255,255,0.06)',
                            color: i === 1 ? '#E8B84B' : 'var(--t2)',
                            fontSize: '7.5px', padding: '5px 10px', borderRadius: '7px',
                            ...stag(2 + i),
                          }}>{q}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ background: 'var(--ac)', color: '#fff', padding: '5px 10px', borderRadius: '9px 9px 2px 9px', fontSize: '8.5px' }}>{VELQUOR_Q}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '7px', alignItems: 'flex-start' }}>
                        <LogoMark size={18} />
                        <p style={{ margin: 0, color: 'var(--t2)', fontSize: '8.5px', lineHeight: 1.7, minHeight: '84px' }}>
                          {VELQUOR_TEXT.slice(0, typedChars)}
                          {typedChars < VELQUOR_TEXT.length && (
                            <span style={{ display: 'inline-block', width: '2px', height: '9px', background: '#E8B84B', marginLeft: '1px', animation: 'vq-caret 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Input */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '7px', ...stag(7) }}>
                    <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '7px', padding: '5.5px 10px', fontSize: '7.5px', color: qChars > 0 ? 'var(--t1)' : 'var(--t3)' }}>
                      {qChars > 0 ? VELQUOR_Q.slice(0, qChars) : 'Ask the Analyst about your trading, performance, or anything...'}
                      {qChars > 0 && qChars < VELQUOR_Q.length && (
                        <span style={{ display: 'inline-block', width: '1.5px', height: '8px', background: 'var(--t1)', marginLeft: '1px', animation: 'vq-caret 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                      )}
                    </div>
                    <span style={{
                      background: qChars >= VELQUOR_Q.length ? 'rgba(232,184,75,0.2)' : 'rgba(232,184,75,0.1)',
                      border: '1px solid rgba(232,184,75,0.35)', color: '#E8B84B',
                      fontSize: '7.5px', fontWeight: 700, padding: '5px 12px', borderRadius: '7px',
                      boxShadow: qChars >= VELQUOR_Q.length ? '0 0 12px rgba(232,184,75,0.3)' : 'none',
                      transition: 'all .3s ease',
                    }}>Ask</span>
                  </div>
                </div>
                {/* Right rail */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <div data-hot style={{ ...card, padding: '9px 12px', ...stag(3) }}>
                    <p style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '8.5px', fontWeight: 700 }}>What VELQUOR Knows</p>
                    {[
                      { icon: '▥', c: '#4D8FFF', t: 'All your MT5 trades',  s: 'P&L, win rate, sessions, setups' },
                      { icon: '✎', c: '#00E87A', t: 'Journal entries',      s: 'Mood, energy, daily notes' },
                      { icon: '✓', c: '#00E87A', t: 'Habits tracker',       s: 'Daily streaks, consistency' },
                      { icon: '◧', c: '#B98CFF', t: 'Portfolio',            s: 'Trade Republic holdings' },
                      { icon: '◍', c: '#4D8FFF', t: 'Macro context',        s: 'News, events, bias' },
                    ].map((r, i) => (
                      <div key={r.t} style={{ display: 'flex', gap: '7px', alignItems: 'center', marginBottom: '5px', ...stag(4 + i) }}>
                        <span style={{ width: '14px', height: '14px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: r.c, fontSize: '7px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{r.icon}</span>
                        <span>
                          <span style={{ display: 'block', color: 'var(--t1)', fontSize: '7.5px', fontWeight: 700, lineHeight: 1.3 }}>{r.t}</span>
                          <span style={{ color: 'var(--t3)', fontSize: '6.5px' }}>{r.s}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div data-hot style={{ ...card, padding: '9px 12px', flex: 1, ...stag(9) }}>
                    <p style={{ margin: '0 0 5px', color: 'var(--t1)', fontSize: '8.5px', fontWeight: 700 }}>Example Questions</p>
                    {['"What time of day should I stop trading?"', '"Am I overtrading?"', '"When do I trade best — morning or afternoon?"', '"What happens to my P&L when I trade angry?"'].map((q, i) => (
                      <p key={q} style={{ margin: '0 0 4px', color: 'var(--t3)', fontSize: '7px', ...stag(10 + i) }}>{q}</p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ height: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
          <div ref={progressRef} style={{
            height: '100%', width: '100%', transformOrigin: 'left',
            transform: 'scaleX(0)', willChange: 'transform',
            background: 'linear-gradient(90deg,var(--go2),var(--ac))',
          }} />
        </div>
      </div>
    </>
  )
}
