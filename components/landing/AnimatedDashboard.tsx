'use client'

// Hero product animation — a 1:1 replica of the real logged-in dashboard,
// self-driving through Overview → Trading → Journal → Copy → Ask VELQUOR.
//
// Motion engine (single rAF clock):
// - Cursor rides a Catmull-Rom spline with PER-SEGMENT velocity curves: it
//   eases out of each waypoint and eases into the next (durations weighted by
//   segment length), with a small linear blend so velocity never hits zero —
//   always moving, never darting (Marco's cursor rule).
// - Equity curve self-draws (dashoffset + head dot on getPointAtLength) and
//   keeps breathing; the win-rate ring sweeps in; 30-day P&L bars grow in;
//   candles + volume enter staggered and the last candle ticks live; metric
//   numbers count up; session clock runs real time; cards glow near the cursor.
// - No emojis anywhere — premium surfaces use SVG glyphs only.
// 60fps writes go through refs; React re-renders only on scene changes.

import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'

const VELQUOR_TEXT = "Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You're trading against institutional order flow before direction is established. Consider a 30-minute wait rule. Your London-only NAS100 trades hit 71% win rate."

const CURSOR_SVG_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

// Tape — same symbols/logo-chips as the real TradingView strip, live-level prices
const TAPE = [
  { chip: '100', chipBg: '#2962FF', sym: 'NAS100',  price: '28,566.3', chg: '−412.20 (−1.42%)', up: false },
  { chip: '€',   chipBg: '#264697', sym: 'EUR/USD', price: '1.14290',  chg: '−0.0014 (−0.12%)', up: false },
  { chip: '500', chipBg: '#D32F2F', sym: 'S&P 500', price: '7,470.9',  chg: '−54.80 (−0.73%)',  up: false },
  { chip: 'X',   chipBg: '#1976D2', sym: 'DAX',     price: '24,736.6', chg: '−114.70 (−0.46%)', up: false },
  { chip: '₿',   chipBg: '#F7931A', sym: 'BTC',     price: '63,029',   chg: '−759.00 (−1.19%)', up: false },
  { chip: 'Au',  chipBg: '#C9A227', sym: 'Gold',    price: '3,991.7',  chg: '+6.80 (+0.17%)',   up: true  },
]

const STRIP = [
  { sym: 'SPY', price: '750.72', chg: '−0.54%', up: false },
  { sym: 'QQQ', price: '705.94', chg: '−1.64%', up: false },
  { sym: 'BTC', price: '63,042', chg: '−1.17%', up: false },
  { sym: 'VIX', price: '18.05',  chg: '+7.89%', up: true  },
]

// ── Easings ───────────────────────────────────────────────────────────────────
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeInOutQuad  = (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
const easeOutExpo    = (t: number) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)

function splineAt(pts: Array<{ x: number; y: number }>, u: number) {
  const n = pts.length - 1
  const f = Math.min(u * n, n - 1e-6)
  const i = Math.floor(f)
  const t = f - i
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

// Realistic equity curve — climbs with pullbacks and a drawdown cluster
const EQUITY = [0, 0.5, 1.1, 0.85, 1.5, 2.1, 1.85, 2.6, 3.3, 2.95, 3.7, 4.5, 4.15, 4.9, 5.7, 5.35, 6.2, 7.1, 6.7, 7.6, 8.5, 8.15, 9.1, 10.0]
const CW = 500, CH = 70
const EQ_XS = EQUITY.map((_, i) => (i / (EQUITY.length - 1)) * CW)
const EQ_YS = EQUITY.map(v => CH - (v / 10) * (CH * 0.8) - CH * 0.1)
const EQ_LINE = smoothPath(EQ_XS, EQ_YS)
const EQ_AREA = `${EQ_LINE} L${CW},${CH} L0,${CH} Z`

// 30-day P&L bars (green/red like the real Daily P&L panel)
const DAILY = [1.2, 0.8, -0.5, 1.6, 0.9, 1.1, -0.8, 0.4, 1.9, 1.3, -0.3, 0.7, 1.5, -1.1, 0.6, 2.1, 1.0, 0.5, -0.6, 1.4, 0.8, 1.8, -0.4, 1.1, 0.9, 1.6, -0.7, 1.2, 2.3, 1.5]

// Candles [open, high, low, close] + volume — pullback then breakout, like the real Gold chart
const CANDLES = [
  [55, 62, 48, 50], [50, 54, 42, 45], [45, 52, 43, 50], [50, 58, 48, 56], [56, 60, 46, 48],
  [48, 53, 40, 43], [43, 50, 41, 47], [47, 56, 45, 54], [54, 62, 52, 59], [59, 64, 50, 53],
  [53, 60, 51, 58], [58, 67, 56, 64], [64, 70, 60, 62], [62, 72, 61, 69], [69, 78, 67, 75],
  [75, 80, 68, 71], [71, 79, 70, 77], [77, 84, 74, 81],
]
const VOLUMES = [30, 45, 25, 38, 55, 62, 33, 40, 48, 70, 36, 52, 44, 58, 66, 50, 42, 61]

const SCENE_MS = 3800
const CLICK_AT = 0.958

export function AnimatedDashboard() {
  // Real tab bar — 9 tabs like the app; the tour clicks through 5 of them
  const TABS = [
    { name: 'Overview' }, { name: 'Trading' }, { name: 'Portfolio' }, { name: 'Journal' },
    { name: 'Macro' }, { name: 'Discipline' }, { name: 'Tasks' }, { name: 'Copy' }, { name: 'Ask VELQUOR', gold: true },
  ]
  const SCENE_TABS = [0, 1, 3, 7, 8]           // tab index per scene
  const STEPS = SCENE_TABS.length

  const READ_PATHS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[0.28, 0.34], [0.62, 0.30], [0.86, 0.44], [0.30, 0.58], [0.44, 0.76], [0.74, 0.70]], // Overview
    [[0.50, 0.32], [0.28, 0.44], [0.55, 0.58], [0.80, 0.50], [0.35, 0.86], [0.66, 0.88]], // Trading
    [[0.25, 0.40], [0.18, 0.58], [0.36, 0.50], [0.68, 0.42], [0.76, 0.62], [0.46, 0.82]], // Journal
    [[0.28, 0.36], [0.20, 0.50], [0.48, 0.44], [0.76, 0.44], [0.66, 0.68], [0.38, 0.78]], // Copy
    [[0.30, 0.34], [0.55, 0.42], [0.30, 0.46], [0.28, 0.64], [0.55, 0.74], [0.70, 0.64]], // Ask VELQUOR
  ]

  const [step, setStep]         = useState(0)
  const [entered, setEntered]   = useState(false)
  const [hoverTab, setHoverTab] = useState<number | null>(null)
  const [clickFx, setClickFx]   = useState(0)
  const [typedChars, setTyped]  = useState(0)

  const containerRef  = useRef<HTMLDivElement>(null)
  const cursorRef     = useRef<HTMLDivElement>(null)
  const progressRef   = useRef<HTMLDivElement>(null)
  const eqPathRef     = useRef<SVGPathElement>(null)
  const eqAreaRef     = useRef<SVGPathElement>(null)
  const eqDotRef      = useRef<SVGCircleElement>(null)
  const ringRef       = useRef<SVGCircleElement>(null)
  const clockRef      = useRef<HTMLSpanElement>(null)
  const clockUtcRef   = useRef<HTMLSpanElement>(null)
  const syncAgoRef    = useRef<HTMLSpanElement>(null)
  const lastCandleRef = useRef<SVGRectElement>(null)
  const lastWickRef   = useRef<SVGLineElement>(null)

  const tabPtsRef     = useRef<Array<{ x: number; y: number }>>([])
  const splineRef     = useRef<Array<{ x: number; y: number }>>([])
  const segEndsRef    = useRef<number[]>([])     // cumulative time fraction per spline segment
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

    // Per-segment velocity curve: time ∝ sqrt(length) so long moves sweep and
    // short moves linger — each segment then eases in AND out individually.
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
    setTyped(0)
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      measure()
      buildSpline(step)
      enteredAtRef.current = performance.now()
      setEntered(true)
    }))
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    if (step !== 4 || !entered) return
    let i = 0
    const id = setInterval(() => {
      i += 2
      setTyped(Math.min(i, VELQUOR_TEXT.length))
      if (i >= VELQUOR_TEXT.length) clearInterval(id)
    }, 24)
    return () => clearInterval(id)
  }, [step, entered])

  useEffect(() => {
    let raf = 0
    let eqLen = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const u = Math.min((now - sceneStartRef.current) / SCENE_MS, 1)

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

      // Live session clock (CET/UTC) + sync-ago counter — real time, like the app
      if (clockRef.current) {
        const d = new Date()
        const pad = (n: number) => String(n).padStart(2, '0')
        clockRef.current.textContent = `${pad((d.getUTCHours() + 2) % 24)}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} CET`
        if (clockUtcRef.current) clockUtcRef.current.textContent = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`
      }
      if (syncAgoRef.current) syncAgoRef.current.textContent = `${(4 + Math.floor((now / 1000) % 25))}s ago`

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

      // Win-rate ring sweep (Overview)
      if (stepRef.current === 0 && ringRef.current) {
        const k = easeOutExpo(Math.min(Math.max(sceneAge / 1300, 0), 1))
        const CIRC = 2 * Math.PI * 15
        ringRef.current.style.strokeDashoffset = `${CIRC * (1 - 0.60 * k)}`
      }

      // Live last candle (Trading)
      if (stepRef.current === 1 && lastCandleRef.current && lastWickRef.current) {
        const [o] = CANDLES[CANDLES.length - 1].slice(0, 1)
        const c = 81 + Math.sin(now / 420) * 3.0 + Math.sin(now / 137) * 1.1
        const y = (v: number) => 96 - ((v - 36) / 52) * 88 - 4
        const up = c >= o
        lastCandleRef.current.setAttribute('y', `${Math.min(y(o), y(c))}`)
        lastCandleRef.current.setAttribute('height', `${Math.max(2, Math.abs(y(o) - y(c)))}`)
        lastCandleRef.current.setAttribute('fill', up ? 'var(--gr2)' : 'var(--re)')
        lastWickRef.current.setAttribute('y1', `${y(Math.max(84, c + 3))}`)
        lastWickRef.current.setAttribute('y2', `${y(74)}`)
        lastWickRef.current.setAttribute('stroke', up ? 'var(--gr2)' : 'var(--re)')
      }

      // Count-up metrics
      const box = containerRef.current
      if (box) {
        const k = easeOutExpo(Math.min(Math.max(sceneAge / 1100, 0), 1))
        box.querySelectorAll<HTMLElement>('[data-count-to]').forEach(el => {
          const to = parseFloat(el.dataset.countTo || '0')
          const dec = parseInt(el.dataset.countDec || '0')
          const v = to * k
          el.textContent = (el.dataset.countPre || '') + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.countSuf || '')
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
    background: 'rgba(255,255,255,0.025)', borderRadius: '9px',
    border: '1px solid rgba(255,255,255,0.055)',
    transition: 'border-color .3s ease, box-shadow .3s ease',
  }

  const calWins = [1, 3, 6, 8, 9, 10, 13, 15, 16], calLosses = [2, 7, 14]

  const trades = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: +284.5, setup: 'Order Block', session: 'London', res: 'W'  },
    { sym: 'NAS100', type: 'SELL', pnl: -112.2, setup: 'BOS/CHoCH',   session: 'NY',     res: 'L'  },
    { sym: 'XAUUSD', type: 'BUY',  pnl: +196.0, setup: 'FVG',         session: 'London', res: 'W'  },
  ]

  const copyLog = [
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.25', target: 'Blueberry #221', ms: '0.9s' },
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.10', target: 'FTMO #58',       ms: '1.2s' },
    { action: 'CLOSE', sym: 'NAS100', lots: '0.30 → 0.15', target: 'Blueberry #221', ms: '0.8s' },
    { action: 'OPEN',  sym: 'DAX',    lots: '0.20 → 0.10', target: 'FTMO #58',       ms: '1.0s' },
    { action: 'CLOSE', sym: 'XAUUSD', lots: '0.50 → 0.25', target: 'Blueberry #221', ms: '0.7s' },
  ]

  const journalEntries = [
    { day: 'Thu 16', sym: 'XAUUSD · London', tag: 'Order Block', mood: 'Calm',      pnl: +412 },
    { day: 'Wed 15', sym: 'NAS100 · NY',     tag: 'BOS/CHoCH',   mood: 'Focused',   pnl: +156 },
    { day: 'Tue 14', sym: 'NAS100 · NY',     tag: 'Revenge flag', mood: 'Tense',    pnl: -180 },
  ]

  const RING_CIRC = 2 * Math.PI * 15

  return (
    <>
      <style>{`
        @keyframes vq-caret { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes vq-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.8);opacity:0} }
        @keyframes vq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes vq-tape  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes vq-grow  { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .vq-candle, .vq-bar { transform-box: fill-box; transform-origin: center bottom; animation: vq-grow .55s cubic-bezier(.34,1.56,.64,1) backwards; }
        .vq-vol { transform-box: fill-box; transform-origin: center bottom; animation: vq-grow .5s ease-out backwards; }
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

        {/* ── Topbar (1:1 with the real app) ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', background: '#000' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LogoMark size={18} />
            <span style={{ color: 'var(--t1)', fontSize: '11.5px', fontWeight: 700 }}>Velquor</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '4px 12px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.6s ease-in-out infinite' }} />
            <span style={{ color: 'var(--t2)', fontSize: '9px', fontWeight: 600 }}>MT5</span>
            <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 700 }}>€2.245,28</span>
            <span ref={syncAgoRef} style={{ color: 'var(--t3)', fontSize: '8.5px' }}>8s ago</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ width: '19px', height: '19px', borderRadius: '5px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--t2)' }}>€</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '19px', height: '19px', borderRadius: '50%', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', fontWeight: 700, color: 'white' }}>M</div>
              <div>
                <p style={{ margin: 0, color: 'var(--t1)', fontSize: '8.5px', fontWeight: 600, lineHeight: 1.2 }}>Marco</p>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', lineHeight: 1.2 }}>Vienna · EUR</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── TradingView-style tape with logo chips ── */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', padding: '5px 0', background: '#000' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'vq-tape 30s linear infinite', width: 'max-content' }}>
            {[...TAPE, ...TAPE].map((q, qi) => (
              <span key={qi} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0, padding: '0 14px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ width: '13px', height: '13px', borderRadius: '50%', background: q.chipBg, color: '#fff', fontSize: '6px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{q.chip}</span>
                <span style={{ color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>{q.sym}</span>
                <span style={{ color: 'var(--t1)', fontSize: '9px' }}>{q.price}</span>
                <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '8.5px', fontWeight: 600 }}>{q.chg}</span>
              </span>
            ))}
          </div>
        </div>

        {/* ── Tab bar — all 9 real tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '7px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          {TABS.map((tb, i) => {
            const active = SCENE_TABS[step] === i
            return (
              <span key={tb.name} data-tab={i} style={{
                fontSize: '9.5px', padding: '3px 8px', borderRadius: '5px', whiteSpace: 'nowrap',
                color: tb.gold ? '#E8B84B' : active ? 'var(--t1)' : hoverTab === i ? 'var(--t2)' : 'var(--t3)',
                background: active ? 'rgba(255,255,255,0.06)' : hoverTab === i ? 'rgba(255,255,255,0.04)' : 'transparent',
                fontWeight: active ? 700 : 500,
                boxShadow: active ? 'inset 0 -1.5px 0 rgba(77,143,255,0.7)' : 'none',
                transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
              }}>{tb.name}</span>
            )
          })}
        </div>

        {/* ── Market strip (SPY/QQQ/BTC/VIX) + live clock ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.012)' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {STRIP.map(q => (
              <span key={q.sym} style={{ display: 'inline-flex', gap: '5px', alignItems: 'center' }}>
                <span style={{ color: 'var(--t3)', fontSize: '8px', fontWeight: 700 }}>{q.sym}</span>
                <span style={{ color: 'var(--t1)', fontSize: '8px' }}>{q.price}</span>
                <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '8px', fontWeight: 600 }}>{q.chg}</span>
              </span>
            ))}
          </div>
          <span ref={clockUtcRef} style={{ color: 'var(--t3)', fontSize: '8px' }} />
        </div>

        {/* ── Content ── */}
        <div style={{ padding: '12px 16px 12px', minHeight: '300px' }}>

          {/* OVERVIEW — mirrors the real Overview tab */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div data-hot style={{ ...card, padding: '10px 14px', ...stag(0) }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7.5px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Friday, 17 July 2026</p>
                    <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em' }}>Good afternoon, Marco</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)' }} />
                      <span style={{ color: 'var(--gr2)', fontSize: '9px', fontWeight: 600 }}>London Session</span>
                    </span>
                    <span ref={clockRef} style={{ color: 'var(--t2)', fontSize: '9px', fontWeight: 600 }} />
                    <span style={{ color: 'var(--t3)', fontSize: '8.5px' }}>New York opens in <span style={{ color: 'var(--ac)', fontWeight: 700 }}>2h 16m</span></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                <div data-hot style={{ ...card, padding: '9px 11px', ...stag(1) }}>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>MT5 Balance</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--t1)', fontSize: '14px', fontWeight: 800 }} data-count-to="2245.28" data-count-dec="2" data-count-pre="€">€0</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '7.5px' }}>Equity €2,385.28 · 328 trades</p>
                </div>
                <div data-hot style={{ ...card, padding: '9px 11px', ...stag(2) }}>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Today P&L</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--gr2)', fontSize: '14px', fontWeight: 800 }} data-count-to="408.70" data-count-dec="2" data-count-pre="+€">+€0</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '7.5px' }}>3 trades today</p>
                </div>
                <div data-hot style={{ ...card, padding: '9px 11px', background: 'linear-gradient(160deg, rgba(0,255,133,0.06) 0%, rgba(255,255,255,0.02) 60%)', ...stag(3) }}>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Month P&L</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--gr2)', fontSize: '14px', fontWeight: 800 }} data-count-to="4.91" data-count-dec="2" data-count-pre="+" data-count-suf="%">+0%</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '7.5px' }}>Jul · this month</p>
                </div>
                <div data-hot style={{ ...card, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: '10px', ...stag(4) }}>
                  <svg width="36" height="36" viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                    <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="3.5" />
                    <circle ref={ringRef} cx="18" cy="18" r="15" fill="none" stroke="var(--go2)" strokeWidth="3.5" strokeLinecap="round"
                      strokeDasharray={RING_CIRC} strokeDashoffset={RING_CIRC} transform="rotate(-90 18 18)" />
                    <text x="18" y="21" textAnchor="middle" fill="var(--go2)" fontSize="8.5" fontWeight="800">60%</text>
                  </svg>
                  <div>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.07em', textTransform: 'uppercase' }}>Win Rate</p>
                    <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '11px', fontWeight: 800 }}>114W / 76L</p>
                    <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '7px' }}>Best: XAUUSD · 82%</p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div data-hot style={{ ...card, borderLeft: '2px solid rgba(0,255,133,0.5)', padding: '10px 12px', ...stag(5) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>Equity Curve</p>
                    <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '8px', fontWeight: 700 }}>+18.2% YTD</p>
                  </div>
                  <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '52px', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="g-ov" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--gr2)" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="var(--gr2)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0.28, 0.55, 0.82].map(f => <line key={f} x1="0" x2={CW} y1={CH * f} y2={CH * f} stroke="rgba(255,255,255,0.045)" strokeWidth="1" />)}
                    <path ref={eqAreaRef} d={EQ_AREA} fill="url(#g-ov)" style={{ opacity: 0 }} />
                    <path ref={eqPathRef} d={EQ_LINE} fill="none" stroke="var(--gr2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle ref={eqDotRef} cx="0" cy={CH} r="3" fill="var(--gr2)" style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,133,0.9))' }} />
                  </svg>
                </div>
                <div data-hot style={{ ...card, borderLeft: '2px solid rgba(77,143,255,0.5)', padding: '10px 12px', ...stag(6) }}>
                  <p style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>Daily P&L — 30 Days</p>
                  <svg viewBox="0 0 500 70" style={{ width: '100%', height: '52px' }}>
                    <line x1="0" x2="500" y1="46" y2="46" stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                    {DAILY.map((v, i) => {
                      const h = Math.abs(v) * 17
                      const x = 6 + i * 16.5
                      return (
                        <rect key={`${step}-${i}`} className="vq-bar" style={{ animationDelay: `${180 + i * 22}ms` }}
                          x={x} width="9" y={v >= 0 ? 46 - h : 46} height={h} rx="1.5"
                          fill={v >= 0 ? 'rgba(0,255,133,0.75)' : 'rgba(255,51,71,0.75)'} />
                      )
                    })}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* TRADING — mirrors the real Trading tab (big chart + stats) */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '5px', ...stag(0) }}>
                {['This Week', 'This Month', 'Last Week', 'All Time'].map((r, ri) => (
                  <span key={r} style={{
                    fontSize: '8px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px',
                    color: ri === 1 ? 'var(--t1)' : 'var(--t3)',
                    background: ri === 1 ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${ri === 1 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
                  }}>{r}</span>
                ))}
              </div>
              <div data-hot style={{ ...card, padding: '10px 12px', ...stag(1) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>Live Chart · Gold Spot / U.S. Dollar · 1H · OANDA</p>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px' }}>Chart by TradingView</p>
                </div>
                <svg viewBox="0 0 620 96" style={{ width: '100%', height: '96px', overflow: 'visible' }}>
                  {[0.22, 0.46, 0.70].map(f => <line key={f} x1="0" x2="620" y1={96 * f} y2={96 * f} stroke="rgba(255,255,255,0.045)" strokeWidth="1" />)}
                  {['4,010', '3,985', '3,960'].map((lab, li) => (
                    <text key={lab} x="618" y={96 * [0.22, 0.46, 0.70][li] - 3} textAnchor="end" fill="rgba(255,255,255,0.25)" fontSize="7">{lab}</text>
                  ))}
                  {CANDLES.map(([o, h, l, c], i) => {
                    const x = 14 + i * 33
                    const isLast = i === CANDLES.length - 1
                    const up = c >= o
                    const col = up ? 'var(--gr2)' : 'var(--re)'
                    const y = (v: number) => 96 - ((v - 36) / 52) * 88 - 4
                    return (
                      <g key={`${step}-${i}`} className="vq-candle" style={{ animationDelay: `${100 + i * 40}ms` }}>
                        <line ref={isLast ? lastWickRef : undefined} x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="1" opacity="0.75" />
                        <rect ref={isLast ? lastCandleRef : undefined} x={x - 4.5} width="9" y={y(Math.max(o, c))} height={Math.max(2, Math.abs(y(o) - y(c)))} fill={col} rx="1" />
                      </g>
                    )
                  })}
                  {/* volume — like the real TV chart footer */}
                  {VOLUMES.map((v, i) => (
                    <rect key={`v-${step}-${i}`} className="vq-vol" style={{ animationDelay: `${140 + i * 40}ms` }}
                      x={14 + i * 33 - 4.5} width="9" y={96 - v * 0.22} height={v * 0.22}
                      fill={CANDLES[i][3] >= CANDLES[i][0] ? 'rgba(0,255,133,0.16)' : 'rgba(255,51,71,0.16)'} />
                  ))}
                </svg>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                {[
                  { label: 'Total P&L',     to: 1824, dec: 0, pre: '+€', suf: '', color: 'var(--gr2)' },
                  { label: 'Win Rate',      to: 67,   dec: 0, pre: '',   suf: '%', color: 'var(--ac)' },
                  { label: 'Profit Factor', to: 2.14, dec: 2, pre: '',   suf: '', color: 'var(--am2)' },
                  { label: 'Avg Win',       to: 240,  dec: 0, pre: '+€', suf: '', color: 'var(--gr)' },
                  { label: 'Max DD',        to: 310,  dec: 0, pre: '−€', suf: '', color: 'var(--re)' },
                ].map((m, i) => (
                  <div key={m.label} data-hot style={{ ...card, padding: '8px 9px', ...stag(2 + i) }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 800 }}
                      data-count-to={m.to} data-count-dec={m.dec} data-count-pre={m.pre} data-count-suf={m.suf}>{m.pre}0{m.suf}</p>
                  </div>
                ))}
              </div>
              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(7) }}>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '76px 40px 84px 1fr 30px 58px', padding: '5px 12px', borderBottom: i < trades.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center', ...stag(8 + i) }}>
                    <span style={{ color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>{t.sym}</span>
                    <span style={{ fontSize: '7px', padding: '1.5px 4px', borderRadius: '3px', fontWeight: 700, width: 'fit-content', background: t.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)', color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)' }}>{t.type}</span>
                    <span style={{ color: 'var(--t2)', fontSize: '8.5px' }}>{t.setup}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '8.5px' }}>{t.session}</span>
                    <span style={{ fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', width: 'fit-content', background: t.res === 'W' ? 'rgba(0,255,133,0.14)' : 'rgba(255,51,71,0.14)', color: t.res === 'W' ? 'var(--gr2)' : 'var(--re)' }}>{t.res}</span>
                    <span style={{ textAlign: 'right', fontSize: '9.5px', fontWeight: 700, color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{t.pnl >= 0 ? '+' : '−'}€{Math.abs(t.pnl).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* JOURNAL */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div data-hot style={{ ...card, padding: '11px 12px', ...stag(0) }}>
                  <p style={{ margin: '0 0 8px', color: 'var(--t1)', fontSize: '9.5px', fontWeight: 700 }}>Daily P&L Calendar · July 2026</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                    {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((d, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: '8px', padding: '3px 1px', borderRadius: '3px',
                        color: d === 17 ? 'white' : d ? 'var(--t2)' : 'transparent',
                        background: d === 17 ? 'var(--ac)' : d && calWins.includes(d) ? 'rgba(0,255,133,0.18)' : d && calLosses.includes(d) ? 'rgba(255,51,71,0.15)' : 'transparent',
                        fontWeight: d === 17 ? 700 : 400,
                        ...(entered ? { opacity: 1, transition: `opacity .4s ease ${250 + i * 25}ms` } : { opacity: 0 }),
                      }}>{d || ''}</div>
                    ))}
                  </div>
                </div>
                <div data-hot style={{ ...card, padding: '11px 12px', ...stag(1) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '10px', fontWeight: 700 }}>Today&apos;s Entry</p>
                    <span style={{ background: 'rgba(0,255,133,0.1)', color: 'var(--gr2)', fontSize: '7.5px', padding: '2px 7px', borderRadius: '20px', fontWeight: 700 }}>WIN DAY</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '7px', flexWrap: 'wrap' }}>
                    {['London', 'ICT setup', 'Confident'].map((tag, ti) => (
                      <span key={tag} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', fontSize: '7.5px', padding: '2px 7px', borderRadius: '20px', ...stag(2 + ti) }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 8px', color: 'var(--t2)', fontSize: '9.5px', lineHeight: 1.65, ...stag(4) }}>
                    Took 2 XAUUSD trades during London open. Both hit target. Waited for the OB before entering. Felt calm and patient.
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', ...stag(5) }}>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>Mood</span>
                    <span style={{ background: 'rgba(0,255,133,0.12)', color: 'var(--gr2)', fontSize: '8px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>Confident</span>
                  </div>
                </div>
              </div>
              <div data-hot style={{ ...card, padding: '10px 16px', display: 'flex', gap: '26px', alignItems: 'center', ...stag(6) }}>
                {[
                  { label: 'Journal Streak',   value: '12 days',  color: 'var(--go2)' },
                  { label: 'Discipline Score', value: '87 / 100', color: 'var(--gr2)' },
                  { label: 'Weekly AI Review', value: 'Grade A−', color: 'var(--ac)' },
                ].map((s, si) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', ...stag(7 + si) }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
                    <div>
                      <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px' }}>{s.label}</p>
                      <p style={{ margin: 0, color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(10) }}>
                {journalEntries.map((e, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '52px 1fr 88px 64px 56px', alignItems: 'center', padding: '5px 12px', borderBottom: i < journalEntries.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', ...stag(11 + i) }}>
                    <span style={{ color: 'var(--t3)', fontSize: '8px', fontWeight: 600 }}>{e.day}</span>
                    <span style={{ color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>{e.sym}</span>
                    <span style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--t2)', fontSize: '7px', padding: '1.5px 6px', borderRadius: '20px', width: 'fit-content' }}>{e.tag}</span>
                    <span style={{ color: e.mood === 'Tense' ? 'var(--am2)' : 'var(--t3)', fontSize: '8px' }}>{e.mood}</span>
                    <span style={{ textAlign: 'right', fontSize: '9px', fontWeight: 700, color: e.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>{e.pnl >= 0 ? '+' : '−'}€{Math.abs(e.pnl)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* COPY */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...stag(0) }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Trade Copier · Main Group</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '8.5px' }}>1 master → 2 slave accounts · proportional lots</p>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', color: 'var(--gr2)', fontSize: '8.5px', padding: '3px 9px', borderRadius: '20px', fontWeight: 700 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                  ACTIVE
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '6px', alignItems: 'center' }}>
                <div data-hot style={{ background: 'rgba(77,143,255,0.05)', border: '1px solid rgba(77,143,255,0.25)', borderRadius: '8px', padding: '10px 12px', transition: 'border-color .3s ease, box-shadow .3s ease', ...stag(1) }}>
                  <p style={{ margin: 0, color: 'var(--ac)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.08em' }}>MASTER</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--t1)', fontSize: '10.5px', fontWeight: 700 }}>Blueberry · #114 892</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '8px' }}>€12,408 · EA connected</p>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '12px', ...stag(2) }}>→</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { name: 'Blueberry · #221 040',    bal: '€6,180 · 0.5× lots' },
                    { name: 'FTMO Challenge · #58 112', bal: '€10,000 · 0.2× lots' },
                  ].map((s, si) => (
                    <div key={s.name} data-hot style={{ ...card, borderRadius: '7px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...stag(3 + si) }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9px', fontWeight: 700 }}>{s.name}</p>
                        <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '7.5px' }}>{s.bal}</p>
                      </div>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', flexShrink: 0, animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                    </div>
                  ))}
                </div>
              </div>
              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(5) }}>
                <p style={{ margin: 0, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '7.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal Log</p>
                {copyLog.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderBottom: i < copyLog.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', ...stag(6 + i) }}>
                    <span style={{ fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: l.action === 'OPEN' ? 'rgba(0,255,133,0.12)' : 'rgba(255,176,48,0.12)', color: l.action === 'OPEN' ? 'var(--gr2)' : 'var(--am2)' }}>{l.action}</span>
                    <span style={{ color: 'var(--t1)', fontSize: '9px', fontWeight: 700, minWidth: '48px' }}>{l.sym}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '8.5px', flex: 1 }}>{l.lots} · {l.target}</span>
                    <span style={{ color: 'var(--gr2)', fontSize: '8px', fontWeight: 700 }}>✓ {l.ms}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ASK VELQUOR */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...stag(0) }}>
                <LogoMark size={26} />
                <div>
                  <p style={{ margin: 0, color: '#E8B84B', fontSize: '11px', fontWeight: 700 }}>Ask VELQUOR</p>
                  <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '9px' }}>Online · analysing your 328 trades</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Why am I losing on Nasdaq?', "What's my best setup?", 'Am I overtrading?'].map((q, i) => (
                  <span key={q} data-hot style={{
                    background: i === 0 ? 'rgba(232,184,75,0.1)' : 'rgba(255,255,255,0.04)',
                    border: i === 0 ? '1px solid rgba(232,184,75,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    color: i === 0 ? '#E8B84B' : 'var(--t3)',
                    fontSize: '9.5px', padding: '4px 10px', borderRadius: '20px',
                    transition: 'border-color .3s ease, box-shadow .3s ease',
                    ...stag(1 + i),
                  }}>{q}</span>
                ))}
              </div>
              <div data-hot style={{ ...card, borderRadius: '10px', overflow: 'hidden', ...stag(4) }}>
                <div style={{ padding: '9px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--ac)', color: 'white', padding: '7px 12px', borderRadius: '10px 10px 2px 10px', fontSize: '11px' }}>
                    Why am I losing on Nasdaq?
                  </div>
                </div>
                <div style={{ padding: '11px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <LogoMark size={22} />
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10.5px', lineHeight: 1.75, minHeight: '92px' }}>
                    {VELQUOR_TEXT.slice(0, typedChars)}
                    {typedChars < VELQUOR_TEXT.length && (
                      <span style={{ display: 'inline-block', width: '2px', height: '11px', background: '#E8B84B', marginLeft: '1px', animation: 'vq-caret 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '2px 12px 12px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ color: 'var(--t3)', fontSize: '9.5px' }}>Ask about your trading…</span>
                  <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
                    <path d="M2.5 10.2 L17.5 2.5 L11.5 17.5 L9.2 11.4 Z" fill="#E8B84B" opacity="0.85" />
                  </svg>
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
