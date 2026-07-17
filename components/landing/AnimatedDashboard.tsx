'use client'

// Hero product animation — a self-driving tour of the dashboard.
//
// Engine notes (After-Effects-grade motion, all on one rAF clock):
// - The cursor rides a Catmull-Rom spline rebuilt each scene: it starts where it
//   is, arcs through the scene's reading waypoints, and lands on the next tab.
//   It is ALWAYS mid-spline — never idle, never teleporting (Marco's rule).
// - The equity curve is a smoothed cubic path that draws itself in via
//   dashoffset, with a glowing head dot tracking getPointAtLength().
// - Metric numbers count up (easeOutExpo), candles grow in with a slight
//   overshoot, the last candle ticks live, cards glow when the cursor is near.
// - Scene switches are blur-crossfades; children stagger in individually.
// All DOM writes for 60fps paths go through refs — React only re-renders on
// scene changes.

import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'

const VELQUOR_TEXT = "Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You're trading against institutional order flow before direction is established. Consider a 30-minute wait rule. Your London-only NAS100 trades hit 71% win rate."

const CURSOR_SVG_PATH = "M1 1 L1 13.5 L4.2 10.2 L6.5 16.5 L8.8 15.5 L6.5 9.2 L11.5 9.2 Z"

// Mirrors the real ticker — values match live market levels (July 2026)
const TICKER = [
  { sym: 'GOLD',    price: '3,998.9',  chg: '+0.17%', up: true  },
  { sym: 'NAS100',  price: '29,026',   chg: '−1.62%', up: false },
  { sym: 'EUR/USD', price: '1.1420',   chg: '−0.08%', up: false },
  { sym: 'S&P 500', price: '7,534',    chg: '−0.51%', up: false },
  { sym: 'DAX',     price: '24,698',   chg: '−0.87%', up: false },
  { sym: 'BTC',     price: '63,031',   chg: '−1.19%', up: false },
  { sym: 'US30',    price: '52,553',   chg: '−0.20%', up: false },
  { sym: 'SILVER',  price: '55.77',    chg: '−0.74%', up: false },
]

// ── Easings ───────────────────────────────────────────────────────────────────
const easeInOutCubic = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
const easeOutExpo    = (t: number) => t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)
const easeInOutSine  = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

// Catmull-Rom position through pts at u∈[0,1] (endpoints doubled for tangents)
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

// Smooth SVG path through points (Catmull-Rom → cubic beziers)
function smoothPath(xs: number[], ys: number[]) {
  let d = `M${xs[0]},${ys[0]}`
  const n = xs.length
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[Math.max(0, i - 1)],   y0 = ys[Math.max(0, i - 1)]
    const x1 = xs[i],                    y1 = ys[i]
    const x2 = xs[i + 1],                y2 = ys[i + 1]
    const x3 = xs[Math.min(n - 1, i + 2)], y3 = ys[Math.min(n - 1, i + 2)]
    const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`
  }
  return d
}

// Realistic equity curve: steady climb with pullbacks and drawdown clusters
const EQUITY = [0, 0.5, 1.1, 0.85, 1.5, 2.1, 1.85, 2.6, 3.3, 2.95, 3.7, 4.5, 4.15, 4.9, 5.7, 5.35, 6.2, 7.1, 6.7, 7.6, 8.5, 8.15, 9.1, 10.0]
const CW = 500, CH = 64
const EQ_XS = EQUITY.map((_, i) => (i / (EQUITY.length - 1)) * CW)
const EQ_YS = EQUITY.map(v => CH - (v / 10) * (CH * 0.82) - CH * 0.08)
const EQ_LINE = smoothPath(EQ_XS, EQ_YS)
const EQ_AREA = `${EQ_LINE} L${CW},${CH} L0,${CH} Z`

// Candles [open, high, low, close] — trending session with pullbacks
const CANDLES = [
  [38, 52, 34, 48], [48, 58, 44, 55], [55, 60, 42, 45], [45, 50, 36, 40], [40, 56, 38, 53],
  [53, 64, 50, 61], [61, 66, 54, 57], [57, 62, 48, 52], [52, 68, 50, 65], [65, 74, 62, 70],
  [70, 76, 60, 63], [63, 72, 61, 69], [69, 80, 66, 77], [77, 82, 70, 73], [73, 84, 71, 81],
]

const SCENE_MS  = 3600   // one full scene incl. tab flight
const CLICK_AT  = 0.955  // spline progress where the click fires
const FADE_MS   = 380

export function AnimatedDashboard() {
  const TAB_NAMES = ['Overview', 'Trading', 'Journal', 'Copy', 'VELQUOR']
  const STEPS = 5

  // Reading waypoints per scene (fractions of the container)
  const READ_PATHS: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[0.30, 0.30], [0.62, 0.28], [0.80, 0.35], [0.30, 0.55], [0.42, 0.68], [0.72, 0.62]], // Overview
    [[0.55, 0.30], [0.25, 0.28], [0.50, 0.50], [0.78, 0.48], [0.35, 0.74], [0.62, 0.80]], // Trading
    [[0.25, 0.38], [0.18, 0.55], [0.35, 0.48], [0.68, 0.40], [0.75, 0.58], [0.45, 0.80]], // Journal
    [[0.28, 0.34], [0.20, 0.48], [0.48, 0.42], [0.76, 0.42], [0.66, 0.66], [0.38, 0.76]], // Copy
    [[0.30, 0.32], [0.55, 0.40], [0.30, 0.44], [0.28, 0.62], [0.55, 0.72], [0.70, 0.62]], // VELQUOR
  ]

  const [step, setStep]           = useState(0)
  const [entered, setEntered]     = useState(false)
  const [hoverTab, setHoverTab]   = useState<number | null>(null)
  const [clickFx, setClickFx]     = useState(0)   // increments to retrigger ripple
  const [typedChars, setTyped]    = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const cursorRef    = useRef<HTMLDivElement>(null)
  const progressRef  = useRef<HTMLDivElement>(null)
  const eqPathRef    = useRef<SVGPathElement>(null)
  const eqAreaRef    = useRef<SVGPathElement>(null)
  const eqDotRef     = useRef<SVGCircleElement>(null)
  const lastCandleRef = useRef<SVGRectElement>(null)
  const lastWickRef   = useRef<SVGLineElement>(null)

  const tabPtsRef     = useRef<Array<{ x: number; y: number }>>([])
  const splineRef     = useRef<Array<{ x: number; y: number }>>([])
  const sceneStartRef = useRef(0)
  const clickedRef    = useRef(false)
  const switchedRef   = useRef(false)
  const cursorPosRef  = useRef({ x: 0, y: 0 })
  const stepRef       = useRef(0)
  const enteredAtRef  = useRef(0)
  const hotElsRef     = useRef<Array<{ el: HTMLElement; cx: number; cy: number }>>([])

  // ── Measure tabs + collect proximity-reactive elements ──────────────────────
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

  // ── Build the scene spline: current pos → reading arc → next tab ────────────
  const buildSpline = (sceneIdx: number) => {
    const box = containerRef.current
    if (!box) return
    const { width: W, height: H } = box.getBoundingClientRect()
    if (!W) return
    const pts = READ_PATHS[sceneIdx].map(([fx, fy]) => ({ x: fx * W, y: fy * H }))
    const start = cursorPosRef.current.x ? { ...cursorPosRef.current } : pts[0]
    const tab = tabPtsRef.current[(sceneIdx + 1) % STEPS] ?? { x: W * 0.55, y: H * 0.06 }
    splineRef.current = [start, ...pts, { x: tab.x, y: tab.y + 6 }, tab]
  }

  // ── Scene lifecycle ─────────────────────────────────────────────────────────
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

  // ── Typing (VELQUOR scene) ──────────────────────────────────────────────────
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

  // ── Master rAF clock ────────────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0
    let eqLen = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const sceneT = now - sceneStartRef.current
      const u = Math.min(sceneT / SCENE_MS, 1)

      // Cursor along the spline — eased over the whole journey, so it
      // accelerates out of the tab click and settles into reading arcs
      const spline = splineRef.current
      if (spline.length > 2 && cursorRef.current) {
        const eased = easeInOutSine(u)
        const p = splineAt(spline, eased)
        // micro-drift so even 'slow' phases of the ease keep visible life
        const drift = Math.sin(now / 380) * 1.6
        const x = p.x + drift, y = p.y + Math.cos(now / 430) * 1.4
        cursorPosRef.current = { x: p.x, y: p.y }
        cursorRef.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) scale(${clickedRef.current && u > CLICK_AT ? 0.9 : 1})`
      }

      // Proximity glow — cards light up as the cursor passes over them
      const cur = cursorPosRef.current
      for (const h of hotElsRef.current) {
        const d = Math.hypot(cur.x - h.cx, cur.y - h.cy)
        const near = Math.max(0, 1 - d / 110)
        h.el.style.borderColor = near > 0.25 ? `rgba(77,143,255,${(0.12 + near * 0.35).toFixed(2)})` : ''
        h.el.style.boxShadow = near > 0.25 ? `0 0 ${(near * 22).toFixed(0)}px rgba(77,143,255,${(near * 0.13).toFixed(2)})` : ''
      }

      // Tab hover preview → click → scene switch
      if (u > 0.9 && hoverTab === null) setHoverTab((stepRef.current + 1) % STEPS)
      if (u >= CLICK_AT && !clickedRef.current) {
        clickedRef.current = true
        setClickFx(c => c + 1)
      }
      if (u >= 1 && !switchedRef.current) {
        switchedRef.current = true
        setHoverTab(null)
        setStep(s => (s + 1) % STEPS)
      }

      // Progress bar
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${u.toFixed(4)})`

      // Equity curve self-draw (Overview scene)
      if (stepRef.current === 0 && eqPathRef.current && eqDotRef.current && eqAreaRef.current) {
        const path = eqPathRef.current
        if (!eqLen) { eqLen = path.getTotalLength(); path.style.strokeDasharray = `${eqLen}` }
        const drawT = Math.min(Math.max((now - enteredAtRef.current) / 1300, 0), 1)
        const dp = easeInOutCubic(drawT)
        path.style.strokeDashoffset = `${eqLen * (1 - dp)}`
        eqAreaRef.current.style.opacity = `${dp * 0.9}`
        const head = path.getPointAtLength(eqLen * dp)
        // after the draw, the head keeps breathing like a live feed
        const live = drawT >= 1 ? Math.sin(now / 300) * 1.3 : 0
        eqDotRef.current.setAttribute('cx', `${head.x}`)
        eqDotRef.current.setAttribute('cy', `${head.y + live}`)
        eqDotRef.current.setAttribute('r', `${3 + (drawT >= 1 ? (Math.sin(now / 500) + 1) * 0.7 : 0)}`)
      } else {
        eqLen = 0
      }

      // Live last candle (Trading scene): close price oscillates
      if (stepRef.current === 1 && lastCandleRef.current && lastWickRef.current) {
        const [o, , l] = CANDLES[CANDLES.length - 1]
        const c = 81 + Math.sin(now / 420) * 3.2 + Math.sin(now / 137) * 1.1
        const y = (v: number) => 64 - ((v - 30) / 58) * 58 - 3
        const up = c >= o
        lastCandleRef.current.setAttribute('y', `${y(Math.max(o, c))}`)
        lastCandleRef.current.setAttribute('height', `${Math.max(2, Math.abs(y(o) - y(c)))}`)
        lastCandleRef.current.setAttribute('fill', up ? 'var(--gr2)' : 'var(--re)')
        lastWickRef.current.setAttribute('y1', `${y(Math.max(c + 3, 84))}`)
        lastWickRef.current.setAttribute('y2', `${y(l)}`)
        lastWickRef.current.setAttribute('stroke', up ? 'var(--gr2)' : 'var(--re)')
      }

      // Count-up metrics
      const box = containerRef.current
      if (box) {
        const cT = Math.min(Math.max((now - enteredAtRef.current) / 1100, 0), 1)
        const k = easeOutExpo(cT)
        box.querySelectorAll<HTMLElement>('[data-count-to]').forEach(el => {
          const to = parseFloat(el.dataset.countTo || '0')
          const dec = parseInt(el.dataset.countDec || '0')
          const pre = el.dataset.countPre || ''
          const suf = el.dataset.countSuf || ''
          const v = to * k
          el.textContent = pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf
        })
      }
    }

    raf = requestAnimationFrame(tick)
    const onResize = () => { measure(); buildSpline(stepRef.current) }
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Staggered child entrance helper
  const stag = (i: number): React.CSSProperties => ({
    opacity: entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(9px)',
    filter: entered ? 'blur(0)' : 'blur(5px)',
    transition: `opacity .5s cubic-bezier(.22,1,.36,1) ${i * 70}ms, transform .55s cubic-bezier(.22,1,.36,1) ${i * 70}ms, filter .45s ease ${i * 70}ms`,
  })

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.05)',
    transition: 'border-color .3s ease, box-shadow .3s ease',
  }

  const calWins = [1, 3, 6, 8, 9, 10]
  const calLosses = [2, 7]

  const trades = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: +284.5,  setup: 'Order Block', session: 'London', res: 'W'  },
    { sym: 'NAS100', type: 'SELL', pnl: -112.2,  setup: 'BOS/CHoCH',   session: 'NY',     res: 'L'  },
    { sym: 'XAUUSD', type: 'BUY',  pnl: +196.0,  setup: 'FVG',         session: 'London', res: 'W'  },
    { sym: 'XAUUSD', type: 'SELL', pnl: +6.4,    setup: 'Liq. Grab',   session: 'NY',     res: 'BE' },
  ]

  const copyLog = [
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.25', target: 'Blueberry #221', ms: '0.9s' },
    { action: 'OPEN',  sym: 'XAUUSD', lots: '0.50 → 0.10', target: 'FTMO #58',       ms: '1.2s' },
    { action: 'CLOSE', sym: 'NAS100', lots: '0.30 → 0.15', target: 'Blueberry #221', ms: '0.8s' },
  ]

  return (
    <>
      <style>{`
        @keyframes vq-caret { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes vq-click { 0%{transform:scale(0.2);opacity:1} 100%{transform:scale(2.8);opacity:0} }
        @keyframes vq-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes vq-tape  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes vq-candle-in { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        .vq-candle { transform-box: fill-box; transform-origin: center bottom; animation: vq-candle-in .6s cubic-bezier(.34,1.56,.64,1) backwards; }
      `}</style>
      <div ref={containerRef} style={{ width: '100%', background: '#090D13', position: 'relative', overflow: 'hidden' }}>

        {/* Cursor — rAF-driven, spline motion, subtle shadow */}
        <div ref={cursorRef} style={{
          position: 'absolute', left: 0, top: 0, zIndex: 60, pointerEvents: 'none',
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.85))',
          willChange: 'transform', transition: 'scale .15s ease',
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

        {/* Tab bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LogoMark size={18} />
            <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Velquor</span>
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {TAB_NAMES.map((name, i) => (
              <span key={name} data-tab={i} style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '6px',
                color: i === step ? 'var(--ac)' : hoverTab === i ? 'var(--t1)' : 'var(--t3)',
                background: i === step ? 'rgba(77,143,255,0.12)' : hoverTab === i ? 'rgba(255,255,255,0.06)' : 'transparent',
                fontWeight: i === step ? 600 : 400,
                transition: 'all 0.3s cubic-bezier(.22,1,.36,1)',
                borderBottom: i === step ? '1px solid rgba(77,143,255,0.4)' : '1px solid transparent',
              }}>{name}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'var(--t2)' }}>€</div>
            <div style={{ width: '20px', height: '20px', borderRadius: '5px', background: 'linear-gradient(145deg,var(--ac),var(--pu))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>M</div>
          </div>
        </div>

        {/* Ticker tape — continuously marqueeing, like the real TradingView strip */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', padding: '5px 0' }}>
          <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'vq-tape 26s linear infinite', width: 'max-content' }}>
            {[...TICKER, ...TICKER].map((q, qi) => (
              <span key={qi} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0, padding: '0 12px' }}>
                <span style={{ color: 'var(--t2)', fontSize: '8.5px', fontWeight: 600 }}>{q.sym}</span>
                <span style={{ color: 'var(--t1)', fontSize: '8.5px' }}>{q.price}</span>
                <span style={{ color: q.up ? 'var(--gr2)' : 'var(--re)', fontSize: '8.5px', fontWeight: 600 }}>{q.chg}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px 14px', minHeight: '280px' }}>

          {/* ── OVERVIEW ── */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={stag(0)}>
                <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px' }}>Good morning, Marco</p>
                <p style={{ margin: '2px 0 0', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.02em' }}>Your edge is working today.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                {[
                  { label: 'Today P&L', to: 408.7,  dec: 2, pre: '+€', suf: '',  color: 'var(--gr2)' },
                  { label: 'Win Rate',  to: 67,     dec: 0, pre: '',   suf: '%', color: 'var(--ac)'  },
                  { label: 'Balance',   to: 12408,  dec: 0, pre: '€',  suf: '',  color: 'var(--t1)'  },
                  { label: 'Streak',    to: 0,      dec: 0, pre: '',   suf: '',  color: 'var(--am2)' },
                ].map((m, i) => (
                  <div key={m.label} data-hot style={{ ...card, padding: '9px 10px', ...stag(1 + i) }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    {m.label === 'Streak'
                      ? <p style={{ margin: '3px 0 0', color: m.color, fontSize: '13px', fontWeight: 700 }}>🔥 12d</p>
                      : <p style={{ margin: '3px 0 0', color: m.color, fontSize: '13px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                          data-count-to={m.to} data-count-dec={m.dec} data-count-pre={m.pre} data-count-suf={m.suf}>{m.pre}0{m.suf}</p>}
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div data-hot style={{ ...card, padding: '12px', ...stag(5) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Equity Curve</p>
                    <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '8.5px', fontWeight: 600 }}>+18.2% YTD</p>
                  </div>
                  <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: '48px', overflow: 'visible' }}>
                    <defs>
                      <linearGradient id="g-ov" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.28" />
                        <stop offset="100%" stopColor="var(--ac)" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* faint grid */}
                    {[0.25, 0.5, 0.75].map(f => (
                      <line key={f} x1="0" x2={CW} y1={CH * f} y2={CH * f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                    ))}
                    <path ref={eqAreaRef} d={EQ_AREA} fill="url(#g-ov)" style={{ opacity: 0 }} />
                    <path ref={eqPathRef} d={EQ_LINE} fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle ref={eqDotRef} cx="0" cy={CH} r="3" fill="var(--ac)" style={{ filter: 'drop-shadow(0 0 4px rgba(77,143,255,0.9))' }} />
                  </svg>
                </div>
                <div data-hot style={{ ...card, overflow: 'hidden', ...stag(6) }}>
                  <p style={{ margin: 0, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily P&L Calendar · July</p>
                  <div style={{ padding: '8px 10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '3px' }}>
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                        <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                      {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((d, i) => (
                        <div key={i} style={{
                          textAlign: 'center', fontSize: '8px', padding: '2px 1px', borderRadius: '3px',
                          color: d === 13 ? 'white' : d ? 'var(--t2)' : 'transparent',
                          background: d === 13 ? 'var(--ac)' : d && calWins.includes(d) ? 'rgba(0,255,133,0.18)' : d && calLosses.includes(d) ? 'rgba(255,51,71,0.15)' : 'transparent',
                          fontWeight: d === 13 ? 700 : 400,
                          ...(entered ? { opacity: 1, transition: `opacity .4s ease ${400 + i * 22}ms` } : { opacity: 0 }),
                        }}>{d || ''}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── TRADING ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                {[
                  { label: 'Total P&L',     to: 1824, dec: 0, pre: '+€', suf: '', color: 'var(--gr2)' },
                  { label: 'Win Rate',      to: 67,   dec: 0, pre: '',   suf: '%', color: 'var(--ac)' },
                  { label: 'Profit Factor', to: 2.14, dec: 2, pre: '',   suf: '', color: 'var(--am2)' },
                  { label: 'Avg Win',       to: 240,  dec: 0, pre: '+€', suf: '', color: 'var(--gr)' },
                  { label: 'Max DD',        to: 310,  dec: 0, pre: '−€', suf: '', color: 'var(--re)' },
                ].map((m, i) => (
                  <div key={m.label} data-hot style={{ ...card, padding: '9px 8px', ...stag(i) }}>
                    <p style={{ margin: 0, color: 'var(--t3)', fontSize: '7px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
                    <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      data-count-to={m.to} data-count-dec={m.dec} data-count-pre={m.pre} data-count-suf={m.suf}>{m.pre}0{m.suf}</p>
                  </div>
                ))}
              </div>
              <div data-hot style={{ ...card, padding: '12px', ...stag(5) }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>Live Chart · XAUUSD · 1H</p>
                  <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px' }}>TradingView</p>
                </div>
                <svg viewBox="0 0 500 64" style={{ width: '100%', height: '56px', overflow: 'visible' }}>
                  {[0.25, 0.5, 0.75].map(f => (
                    <line key={f} x1="0" x2="500" y1={64 * f} y2={64 * f} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                  ))}
                  {CANDLES.map(([o, h, l, c], i) => {
                    const x = 12 + i * 33
                    const isLast = i === CANDLES.length - 1
                    const up = c >= o
                    const col = up ? 'var(--gr2)' : 'var(--re)'
                    const y = (v: number) => 64 - ((v - 30) / 58) * 58 - 3
                    return (
                      <g key={`${step}-${i}`} className="vq-candle" style={{ animationDelay: `${120 + i * 45}ms` }}>
                        <line ref={isLast ? lastWickRef : undefined} x1={x} x2={x} y1={y(h)} y2={y(l)} stroke={col} strokeWidth="1" opacity="0.7" />
                        <rect ref={isLast ? lastCandleRef : undefined} x={x - 4} width="8" y={y(Math.max(o, c))} height={Math.max(2, Math.abs(y(o) - y(c)))} fill={col} rx="1" />
                      </g>
                    )
                  })}
                </svg>
              </div>
              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(6) }}>
                <div style={{ display: 'grid', gridTemplateColumns: '76px 42px 76px 1fr 30px 58px', padding: '5px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t3)', fontSize: '7px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  <span>Pair</span><span>Side</span><span>Setup</span><span>Session</span><span></span><span style={{ textAlign: 'right' }}>P&L</span>
                </div>
                {trades.map((t, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '76px 42px 76px 1fr 30px 58px', padding: '6px 12px', borderBottom: i < trades.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center', background: i === 0 ? 'rgba(0,255,133,0.03)' : 'transparent', ...stag(7 + i) }}>
                    <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>{t.sym}</span>
                    <span style={{ fontSize: '7px', padding: '2px 4px', borderRadius: '3px', fontWeight: 700, width: 'fit-content', background: t.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)', color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)' }}>{t.type}</span>
                    <span style={{ color: 'var(--t2)', fontSize: '9px' }}>{t.setup}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{t.session}</span>
                    <span style={{
                      fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', width: 'fit-content',
                      background: t.res === 'W' ? 'rgba(0,255,133,0.14)' : t.res === 'L' ? 'rgba(255,51,71,0.14)' : 'rgba(77,143,255,0.12)',
                      color: t.res === 'W' ? 'var(--gr2)' : t.res === 'L' ? 'var(--re)' : 'var(--ac)',
                    }}>{t.res}</span>
                    <span style={{ textAlign: 'right', fontSize: '10px', fontWeight: 700, color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)', fontVariantNumeric: 'tabular-nums' }}>{t.pnl >= 0 ? '+' : '−'}€{Math.abs(t.pnl).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── JOURNAL ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div data-hot style={{ ...card, padding: '12px', ...stag(0) }}>
                  <p style={{ margin: '0 0 10px', color: 'var(--t2)', fontSize: '10px', fontWeight: 600 }}>July 2026</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div key={i} style={{ textAlign: 'center', fontSize: '7px', color: 'var(--t3)', fontWeight: 600 }}>{d}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
                    {[null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((d, i) => (
                      <div key={i} style={{
                        textAlign: 'center', fontSize: '8px', padding: '2px 1px', borderRadius: '3px',
                        color: d === 13 ? 'white' : d ? 'var(--t2)' : 'transparent',
                        background: d === 13 ? 'var(--ac)' : d && calWins.includes(d) ? 'rgba(0,255,133,0.18)' : d && calLosses.includes(d) ? 'rgba(255,51,71,0.15)' : 'transparent',
                        fontWeight: d === 13 ? 700 : 400,
                        ...(entered ? { opacity: 1, transition: `opacity .4s ease ${250 + i * 25}ms` } : { opacity: 0 }),
                      }}>{d || ''}</div>
                    ))}
                  </div>
                </div>
                <div data-hot style={{ ...card, padding: '12px', ...stag(1) }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <p style={{ margin: 0, color: 'var(--t1)', fontSize: '11px', fontWeight: 600 }}>Today&apos;s Entry</p>
                    <span style={{ background: 'rgba(0,255,133,0.1)', color: 'var(--gr2)', fontSize: '8px', padding: '2px 7px', borderRadius: '20px', fontWeight: 600 }}>WIN DAY</span>
                  </div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    {['London', 'ICT setup', 'Confident'].map((tag, ti) => (
                      <span key={tag} style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--t2)', fontSize: '8px', padding: '2px 6px', borderRadius: '20px', ...stag(2 + ti) }}>{tag}</span>
                    ))}
                  </div>
                  <p style={{ margin: '0 0 10px', color: 'var(--t2)', fontSize: '10px', lineHeight: 1.7, ...stag(4) }}>
                    Took 2 XAUUSD trades during London open. Both hit target. Waited for the OB before entering. Felt calm and patient.
                  </p>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', ...stag(5) }}>
                    <span style={{ color: 'var(--t3)', fontSize: '8px' }}>Mood</span>
                    <span style={{ background: 'rgba(0,255,133,0.12)', color: 'var(--gr2)', fontSize: '9px', padding: '2px 8px', borderRadius: '20px' }}>😌 Confident</span>
                  </div>
                </div>
              </div>
              <div data-hot style={{ ...card, padding: '12px 16px', display: 'flex', gap: '28px', alignItems: 'center', ...stag(6) }}>
                {[
                  { label: 'Journal Streak',   value: '12 days',  icon: '🔥' },
                  { label: 'Discipline Score', value: '87 / 100', icon: '✅' },
                  { label: 'Weekly AI Review', value: 'Grade A−', icon: '🤖' },
                ].map((s, si) => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', ...stag(7 + si) }}>
                    <span style={{ fontSize: '16px' }}>{s.icon}</span>
                    <div>
                      <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px' }}>{s.label}</p>
                      <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>{s.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── COPY TRADING ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', ...stag(0) }}>
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>Trade Copier · Main Group</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '9px' }}>1 master → 2 slave accounts · proportional lots</p>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,255,133,0.08)', border: '1px solid rgba(0,255,133,0.2)', color: 'var(--gr2)', fontSize: '9px', padding: '3px 9px', borderRadius: '20px', fontWeight: 600 }}>
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                  ACTIVE
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 24px 1fr', gap: '6px', alignItems: 'center' }}>
                <div data-hot style={{ background: 'rgba(77,143,255,0.05)', border: '1px solid rgba(77,143,255,0.25)', borderRadius: '8px', padding: '10px 12px', transition: 'border-color .3s ease, box-shadow .3s ease', ...stag(1) }}>
                  <p style={{ margin: 0, color: 'var(--ac)', fontSize: '7px', fontWeight: 700, letterSpacing: '0.08em' }}>MASTER</p>
                  <p style={{ margin: '3px 0 0', color: 'var(--t1)', fontSize: '11px', fontWeight: 700 }}>Blueberry · #114 892</p>
                  <p style={{ margin: '2px 0 0', color: 'var(--t3)', fontSize: '8.5px' }}>€12,408 · EA connected</p>
                </div>
                <div style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '13px', ...stag(2) }}>→</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { name: 'Blueberry · #221 040', bal: '€6,180 · 0.5× lots' },
                    { name: 'FTMO Challenge · #58 112', bal: '€10,000 · 0.2× lots' },
                  ].map((s, si) => (
                    <div key={s.name} data-hot style={{ ...card, borderRadius: '7px', padding: '7px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', ...stag(3 + si) }}>
                      <div>
                        <p style={{ margin: 0, color: 'var(--t1)', fontSize: '9.5px', fontWeight: 600 }}>{s.name}</p>
                        <p style={{ margin: '1px 0 0', color: 'var(--t3)', fontSize: '8px' }}>{s.bal}</p>
                      </div>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--gr2)', flexShrink: 0, animation: 'vq-pulse 1.4s ease-in-out infinite' }} />
                    </div>
                  ))}
                </div>
              </div>

              <div data-hot style={{ ...card, overflow: 'hidden', ...stag(5) }}>
                <p style={{ margin: 0, padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'var(--t2)', fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Signal Log</p>
                {copyLog.map((l, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderBottom: i < copyLog.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', ...stag(6 + i) }}>
                    <span style={{ fontSize: '7px', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: l.action === 'OPEN' ? 'rgba(0,255,133,0.12)' : 'rgba(255,176,48,0.12)', color: l.action === 'OPEN' ? 'var(--gr2)' : 'var(--am2)' }}>{l.action}</span>
                    <span style={{ color: 'var(--t1)', fontSize: '9.5px', fontWeight: 600, minWidth: '48px' }}>{l.sym}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '9px', flex: 1 }}>{l.lots} · {l.target}</span>
                    <span style={{ color: 'var(--gr2)', fontSize: '8.5px', fontWeight: 600 }}>✓ {l.ms}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── VELQUOR ── */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', ...stag(0) }}>
                <LogoMark size={28} />
                <div>
                  <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 700 }}>VELQUOR AI</p>
                  <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px' }}>● Online · analysing your 247 trades</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Why am I losing on Nasdaq?', "What's my best setup?", 'Am I overtrading?'].map((q, i) => (
                  <span key={q} data-hot style={{
                    background: i === 0 ? 'rgba(77,143,255,0.12)' : 'rgba(255,255,255,0.04)',
                    border: i === 0 ? '1px solid rgba(77,143,255,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    color: i === 0 ? 'var(--ac)' : 'var(--t3)',
                    fontSize: '10px', padding: '4px 10px', borderRadius: '20px',
                    transition: 'border-color .3s ease, box-shadow .3s ease',
                    ...stag(1 + i),
                  }}>{q}</span>
                ))}
              </div>
              <div data-hot style={{ ...card, borderRadius: '10px', overflow: 'hidden', ...stag(4) }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'flex-end' }}>
                  <div style={{ background: 'var(--ac)', color: 'white', padding: '8px 12px', borderRadius: '10px 10px 2px 10px', fontSize: '12px' }}>
                    Why am I losing on Nasdaq?
                  </div>
                </div>
                <div style={{ padding: '12px 14px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <LogoMark size={24} />
                  <p style={{ margin: 0, color: 'var(--t2)', fontSize: '11px', lineHeight: 1.75, minHeight: '96px' }}>
                    {VELQUOR_TEXT.slice(0, typedChars)}
                    {typedChars < VELQUOR_TEXT.length && (
                      <span style={{ display: 'inline-block', width: '2px', height: '12px', background: 'var(--ac)', marginLeft: '1px', animation: 'vq-caret 0.7s step-end infinite', verticalAlign: 'text-bottom' }} />
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress — GPU scaleX, driven by the master clock */}
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
