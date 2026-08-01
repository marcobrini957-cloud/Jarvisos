'use client'

/**
 * The product, on the login page.
 *
 * Rebuilt 2026-08-01 against the live app measured at a 960px window
 * (`ref-n-home/trading/journal.png`, and the DOM geometry behind them). What
 * stood here before was drawn in 2026-07-13 and only ever repainted, never
 * rebuilt: it advertised tabs called "Overview" and "VELQUOR AI", a blue active
 * pill, a blue-to-purple avatar tile and a gold-to-blue progress bar. The blue
 * was the sharp part — it was written as raw `rgba(77,143,255,…)`, which the
 * `.vq2` bridge cannot re-point, so it survived the whole 2.0 redesign and was
 * the only chroma on an otherwise ink-and-white page.
 *
 * Two rules, the same two the landing hero follows:
 *   · Never designed from memory — every label, figure and hairline is copied
 *     from the running app, and the figures are the landing hero's figures so
 *     the two surfaces tell one story.
 *   · Drawn at the dashboard's true scale and then fitted to the panel, so the
 *     type sizes and densities are the product's own rather than a miniature
 *     with its own 6px type.
 *
 * It shows the top band rather than a whole tab: at this size a full screen
 * would be 5px type. The band is what the app looks like above the fold at a
 * narrow window, and it cuts off inside a panel the way the real one does.
 */

import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import {
  Topbar, TabBar, Panel, Num, Segmented, Stage,
  INK1, INK2, INK3, INK4, LINE, UP, DOWN, SURF,
  mono, label, words,
} from '@/components/product/replica'

// The virtual canvas: a narrow desktop window, cropped to the top band.
// The height is chosen so every scene's last element finishes inside it —
// a band that slices a row of text in half reads as broken, not as a crop.
const W = 960
const H = 430

const SCENES = ['Home', 'Trading', 'Journal', 'Analyst'] as const
type Scene = typeof SCENES[number]
const SCENE_MS: Record<Scene, number> = { Home: 5200, Trading: 4600, Journal: 4600, Analyst: 6600 }

// Cursor waypoints per scene, in virtual px. Overlapping waypoints keep it
// drifting rather than parking on one.
const PATHS: Record<Scene, [number, number][]> = {
  Home:    [[190, 96], [120, 150], [340, 175], [620, 165], [800, 250], [470, 300], [180, 265], [110, 170]],
  Trading: [[160, 100], [110, 170], [300, 250], [560, 300], [790, 260], [520, 190], [220, 300], [130, 200]],
  Journal: [[210, 95], [130, 160], [330, 210], [640, 180], [820, 260], [500, 310], [230, 250], [120, 180]],
  Analyst: [[300, 130], [500, 180], [660, 230], [500, 280], [360, 250], [480, 320], [620, 300], [420, 210]],
}

export function LoginDashboardPreview() {
  const [scene, setScene] = useState<Scene>('Home')
  const sceneRef = useRef<Scene>('Home')

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) return
    const id = setInterval(() => {
      const next = SCENES[(SCENES.indexOf(sceneRef.current) + 1) % SCENES.length]
      sceneRef.current = next
      setScene(next)
    }, SCENE_MS[sceneRef.current])
    return () => clearInterval(id)
  }, [scene])

  return (
    <Stage width={W} height={H} minScale={0.58} sceneKey={scene} path={PATHS[scene]}>
      <Topbar stale="2m ago" />
      <TabBar active={scene} />

      <div key={scene} className="lp-scene" style={{ flex: 1, minHeight: 0, padding: '12px', overflow: 'hidden' }}>
        {scene === 'Home'    && <Home />}
        {scene === 'Trading' && <Trading />}
        {scene === 'Journal' && <Journal />}
        {scene === 'Analyst' && <Analyst />}
      </div>

      <style>{`
        .lp-scene { animation: lpSceneIn 0.42s cubic-bezier(0.16,1,0.3,1) }
        @keyframes lpSceneIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .lp-scene { animation: none } }
      `}</style>
    </Stage>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────

/** The same five the landing hero shows, because they are the same account. */
const METRICS = [
  { k: 'MT5 balance', to: 24830.5, dec: 2, pre: '€', meta: 'Equity €24,960.50', color: INK1 },
  { k: 'Month',       to: 6.38,    dec: 2, pre: '+', suf: '%', meta: '11W · 6L', color: UP, plain: true },
  { k: 'Today',       to: 0,       dec: 2, pre: '€', meta: 'No closed trades', color: INK3 },
  { k: 'Win rate',    to: 67.4,    dec: 1, suf: '%', meta: '29W / 14L decided', color: INK1, plain: true },
  { k: 'Payoff',      to: 1.71,    dec: 2, meta: '€179 / €105 avg', color: UP, plain: true },
]

function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <StatusLine />

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', flexShrink: 0,
        border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', background: SURF, overflow: 'hidden',
      }}>
        {METRICS.map((m, i) => (
          <div key={m.k} style={{ padding: '11px 14px', borderRight: i < 4 ? `1px solid ${LINE}` : undefined }}>
            <div style={label}>{m.k}</div>
            <div style={{ marginTop: '6px' }}>
              <Num to={m.to} dec={m.dec} pre={m.pre} suf={m.suf} plain={m.plain} color={m.color} size={21} />
            </div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: INK3 }}>{m.meta}</div>
          </div>
        ))}
      </div>

      <Panel
        title="Net worth"
        action={<Segmented options={['2024', '2025', '2026']} active="2026" />}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...label, fontSize: '9px' }}>17 Jul 2026</div>
            <div style={{ marginTop: '6px' }}><Num to={32245.54} dec={2} pre="€" size={24} /></div>
          </div>
          <div style={{ display: 'flex', gap: '22px', paddingTop: '2px' }}>
            {[
              ['2026 change', '+€3,725 (+13.1%)', UP],
              ['Max DD', '−€142', DOWN],
              ['Portfolio', '€7,285', INK1],
            ].map(([k, v, c]) => (
              <div key={k} style={{ textAlign: 'right' }}>
                <div style={{ ...label, fontSize: '9px' }}>{k}</div>
                <div style={{ ...mono, fontSize: '12px', color: c, marginTop: '5px' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        <EquityCurve />
      </Panel>
    </div>
  )
}

function StatusLine() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
      <span style={label}>Friday, 17 July 2026</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: INK1 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK1 }} />
        London session
      </span>
      <span style={{ width: 1, height: 11, background: 'var(--color-line-2)' }} />
      <span style={{ display: 'flex', gap: '8px' }}>
        <span style={{ ...mono, fontSize: '11px', color: INK1 }}>16:54:12</span>
        <span style={{ ...mono, fontSize: '11px', color: INK3 }}>14:54:12 UTC</span>
      </span>
      <span style={{ width: 1, height: 11, background: 'var(--color-line-2)' }} />
      <span style={{ fontSize: '11px', color: INK3 }}>
        New York opens in <span style={{ ...mono, color: INK1 }}>1h 22m</span>
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={label}>Habits</span>
        <span style={{ ...mono, fontSize: '11px', color: INK3 }}>0 / 3</span>
      </span>
    </div>
  )
}

/** Drawn from a fixed series so the shape is the same on every visit. */
function EquityCurve() {
  const pts = [28521, 28610, 28540, 28720, 28680, 28810, 28900, 28860, 29010, 29180, 29120, 29320, 29500,
               29440, 29680, 29820, 29760, 30010, 30180, 30120, 30380, 30520, 30460, 30740, 30960, 30880,
               31150, 31320, 31260, 31520, 31700, 31640, 31900, 32100, 32020, 32245]
  const w = 906, h = 74, min = 28300, max = 32500
  const X = (i: number) => (i / (pts.length - 1)) * w
  const Y = (v: number) => h - ((v - min) / (max - min)) * h
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`

  return (
    <div style={{ padding: '8px 14px 0' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="lp-eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C46A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00C46A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#lp-eq)" />
        <path d={line} fill="none" stroke={UP} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
          style={{ strokeDasharray: 4200, strokeDashoffset: 0, animation: 'lpDraw 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
        <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r="3" fill={UP} />
        <style>{`@keyframes lpDraw { from { stroke-dashoffset: 4200 } to { stroke-dashoffset: 0 } }
          @media (prefers-reduced-motion: reduce) { path { animation: none !important } }`}</style>
      </svg>
    </div>
  )
}

// ── Trading ──────────────────────────────────────────────────────────────────

function Trading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={label}>PDF report</span>
        {['This Month', 'Last Month', 'Last Year'].map(b => (
          <span key={b} style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: INK2,
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '5px 11px', background: SURF,
          }}>
            <Icon name="download" size={12} />{b}
          </span>
        ))}
        <span style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: INK2,
          border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '5px 11px', background: SURF,
        }}>
          <Icon name="calendar" size={12} />Custom range
        </span>
      </div>

      <Panel title="Live chart" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 4px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['NAS100', 'XAUUSD'].map((s, i) => (
              <span key={s} style={{
                ...mono, fontSize: '11px', padding: '4px 10px', borderRadius: 'var(--radius-sm)',
                background: i === 0 ? 'var(--color-surface-2)' : 'transparent',
                color: i === 0 ? INK1 : INK3,
              }}>{s}</span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '2px' }}>
            {['M1', 'M5', 'M15', 'H1', 'H4'].map(tf => (
              <span key={tf} style={{
                ...mono, fontSize: '10px', padding: '4px 9px', borderRadius: 'var(--radius-sm)',
                background: tf === 'M5' ? 'var(--color-surface-2)' : 'transparent',
                color: tf === 'M5' ? INK1 : INK3,
              }}>{tf}</span>
            ))}
          </div>
        </div>

        <div style={{ padding: '0 14px 2px', display: 'flex', alignItems: 'baseline', gap: '9px', ...mono, fontSize: '10px' }}>
          <span style={{ color: INK2 }}>US Nas 100 · 5 · OANDA</span>
          <span style={{ color: INK4 }}>O<span style={{ color: DOWN }}>28,051.6</span></span>
          <span style={{ color: INK4 }}>H<span style={{ color: DOWN }}>28,062.0</span></span>
          <span style={{ color: INK4 }}>L<span style={{ color: DOWN }}>27,961.3</span></span>
          <span style={{ color: INK4 }}>C<span style={{ color: DOWN }}>27,963.0</span></span>
          <span style={{ color: DOWN }}>−88.6 (−0.32%)</span>
        </div>

        <Candles />
      </Panel>
    </div>
  )
}

/**
 * A seeded series, so the chart is identical on every render and never
 * disagrees with the O/H/L/C line above it.
 */
function Candles() {
  const w = 906, h = 186, n = 84
  let seed = 20260801
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }

  let price = 28040
  const bars: { o: number; h: number; l: number; c: number }[] = []
  for (let i = 0; i < n; i++) {
    const o = price
    const drift = (rnd() - 0.52) * 22
    const c = o + drift
    const hi = Math.max(o, c) + rnd() * 9
    const lo = Math.min(o, c) - rnd() * 9
    bars.push({ o, h: hi, l: lo, c })
    price = c
  }
  const lows = Math.min(...bars.map(b => b.l))
  const highs = Math.max(...bars.map(b => b.h))
  const Y = (v: number) => h - ((v - lows) / (highs - lows)) * h
  const step = w / n
  const bw = Math.max(2, step * 0.58)

  return (
    <div style={{ padding: '2px 14px 0' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {bars.map((b, i) => {
          const x = i * step + step / 2
          const up = b.c >= b.o
          const col = up ? UP : DOWN
          const top = Y(Math.max(b.o, b.c))
          const bot = Y(Math.min(b.o, b.c))
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={Y(b.h)} y2={Y(b.l)} stroke={col} strokeWidth="1" />
              <rect x={x - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={col} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Journal ──────────────────────────────────────────────────────────────────

const JOURNAL_CARDS = [
  { k: 'Entries this month', to: 14, dec: 0, meta: 'of 21 trading days', plain: true, color: INK1 },
  { k: 'Avg mood',           to: 7.2, dec: 1, suf: '/10', meta: 'Based on entries', plain: true, color: INK1 },
  { k: 'Best mood',          text: 'Neutral', meta: '+€137/day avg', color: INK1 },
  { k: 'Streak',             to: 12, dec: 0, suf: 'd', meta: 'Longest 19d', plain: true, color: INK1 },
]

function Journal() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ flexShrink: 0 }}>
        <Segmented options={['Daily journal', 'Weekly review']} active="Daily journal" size={10} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', flexShrink: 0 }}>
        {JOURNAL_CARDS.map(c => (
          <div key={c.k} style={{
            background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '11px 14px',
          }}>
            <div style={label}>{c.k}</div>
            <div style={{ marginTop: '6px', height: '22px' }}>
              {c.text
                // A mood is a word, so it keeps the words voice — only figures
                // are allowed to touch the mono face.
                ? <span style={{ fontSize: '21px', color: c.color, lineHeight: 1 }}>{c.text}</span>
                : <Num to={c.to!} dec={c.dec} suf={c.suf} plain={c.plain} color={c.color} size={21} />}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: c.k === 'Best mood' ? UP : INK3 }}>{c.meta}</div>
          </div>
        ))}
      </div>

      <Panel title="Mood → P&L correlation" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <div style={{ fontSize: '11px', color: INK3 }}>Average P&amp;L on days you journaled, grouped by mood:</div>
          {[
            ['Great', '4 days', '+€78.68 avg', 0.58],
            ['Good', '5 days', '+€93.40 avg', 0.69],
            ['Neutral', '3 days', '+€136.67 avg', 1],
          ].map(([name, days, avg, frac]) => (
            <div key={name as string}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK3 }} />
                <span style={{ fontSize: '12px', color: INK1 }}>{name}</span>
                <span style={{ ...mono, fontSize: '10px', color: INK4 }}>{days}</span>
                <span style={{ ...mono, fontSize: '11px', color: UP, marginLeft: 'auto' }}>{avg}</span>
              </div>
              <div style={{ height: '2px', background: 'var(--color-surface-2)', borderRadius: '1px' }}>
                <div style={{ width: `${(frac as number) * 100}%`, height: '100%', background: UP, borderRadius: '1px' }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

// ── Analyst ──────────────────────────────────────────────────────────────────

const Q = 'Why am I losing on Nasdaq?'
const A = 'Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You are trading against institutional order flow before direction is established.'

function Analyst() {
  const [typed, setTyped] = useState(0)
  const [answered, setAnswered] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) {
      // Show the finished exchange rather than typing it. Deferred a tick so
      // the server's empty render hydrates first.
      const id = setTimeout(() => { setTyped(Q.length); setAnswered(A.length) }, 0)
      return () => clearTimeout(id)
    }
    const t1 = setInterval(() => setTyped(n => (n < Q.length ? n + 1 : n)), 40)
    let t2: ReturnType<typeof setInterval>
    const kick = setTimeout(() => {
      t2 = setInterval(() => setAnswered(n => (n < A.length ? n + 3 : n)), 16)
    }, Q.length * 40 + 360)
    return () => { clearInterval(t1); clearInterval(t2); clearTimeout(kick) }
  }, [])

  const asking = typed >= Q.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 130px' }}>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
        {/* The question, as the user's own bubble. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: '12px', color: INK1, background: 'var(--color-surface-2)',
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '7px 12px', maxWidth: '70%',
          }}>
            {Q.slice(0, typed)}
            {!asking && <span style={{ color: INK3 }}>|</span>}
          </span>
        </div>

        {asking && (
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{
              width: '22px', height: '22px', flexShrink: 0, borderRadius: 'var(--radius-sm)',
              border: `1px solid ${LINE}`, background: SURF, color: INK2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="spark" size={12} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...label, fontSize: '9px', marginBottom: '5px' }}>Velquor Analyst</div>
              <p style={{ margin: 0, fontSize: '12px', color: INK2, lineHeight: 1.65 }}>
                {A.slice(0, answered)}
                {answered < A.length && <span style={{ color: INK3 }}>|</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', background: SURF, padding: '9px 12px',
      }}>
        <span style={{ ...words, fontSize: '12px', color: INK4 }}>Ask the Analyst about your trading…</span>
        <span style={{
          width: '20px', height: '20px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)',
          color: INK2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
        }}>↑</span>
      </div>
    </div>
  )
}
