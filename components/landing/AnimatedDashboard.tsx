'use client'

/**
 * The product, on the landing page.
 *
 * This is a hand-built replica of the signed-in dashboard, rebuilt 2026-07-30
 * against screenshots of the live app taken the same day (Home, Trading,
 * Journal, Copy, Analyst at 1512px). The previous one replicated the app as it
 * looked on 2026-07-17 — before the 2.0 redesign — so a visitor who signed up
 * met a different product than the one advertised: blue accents, glowing cards,
 * emoji streak chips, a gold wordmark. None of that exists any more.
 *
 * Two rules it follows:
 *   · Never designed from memory. Every surface, label and figure below is
 *     copied from a screenshot; where the real screen shows €24,830.50, so does
 *     this. See `scratchpad/ref-*.png` in the session that built it.
 *   · It is drawn at the dashboard's true scale (1440px virtual) and then
 *     scaled to whatever width the hero gives it, so the type sizes, hairlines
 *     and densities are the product's own rather than a smaller redrawing.
 *
 * Motion: one rAF clock drives a cursor along a per-scene spline, the metric
 * count-ups and the equity draw-in. It pauses when off screen and never starts
 * under prefers-reduced-motion (measured: 60 callbacks/sec in view, 0 out).
 */

import { useEffect, useRef, useState } from 'react'
import Icon, { type IconName } from '@/components/ui/Icon'
import { LogoMark } from '@/components/ui/LogoMark'
// The chrome is shared with the login page's replica so the two can never again
// advertise different products — see components/product/replica.tsx.
import {
  Topbar, TabBar, Panel, Num, Segmented,
  INK1, INK2, INK3, INK4, LINE, UP, DOWN, VOID, SURF,
  mono, label, words, easeOutExpo, clamp01, splineAt, SceneCaption,
} from '@/components/product/replica'

// ── Geometry ─────────────────────────────────────────────────────────────────
// The virtual canvas is the real dashboard's width. Everything inside is in
// true dashboard pixels; the whole thing is then scaled to fit.
const W = 1440
const H = 812

const SCENES = ['home', 'trading', 'journal', 'copy', 'analyst'] as const
type Scene = typeof SCENES[number]
const SCENE_MS: Record<Scene, number> = { home: 6200, trading: 5200, journal: 5200, copy: 4600, analyst: 7000 }

// Cursor waypoints per scene, in virtual px. It never rests on one for long —
// overlapping waypoints keep it drifting rather than parking (the cursor rule).
const PATHS: Record<Scene, [number, number][]> = {
  home:    [[300, 120], [180, 230], [520, 250], [900, 300], [1180, 470], [700, 560], [330, 690], [150, 470]],
  trading: [[240, 150], [120, 300], [420, 430], [820, 520], [1150, 620], [780, 700], [300, 690], [180, 420]],
  journal: [[260, 140], [160, 250], [430, 400], [900, 330], [1200, 470], [820, 620], [320, 640], [150, 380]],
  copy:    [[280, 160], [200, 260], [560, 300], [980, 340], [1180, 430], [700, 520], [280, 560], [160, 330]],
  analyst: [[400, 200], [720, 300], [980, 380], [720, 470], [500, 560], [700, 690], [900, 640], [620, 380]],
}

/** The tab strip lights by label, and the scene ids are those labels lowercased. */
const SCENE_TAB: Record<Scene, string> = {
  home: 'Home', trading: 'Trading', journal: 'Journal', copy: 'Copy', analyst: 'Analyst',
}

export function AnimatedDashboard() {
  const boxRef    = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const stageRef  = useRef<HTMLDivElement>(null)
  const [scene, setScene] = useState<Scene>('home')
  const [scale, setScale] = useState(1)
  const sceneRef = useRef<Scene>('home')
  const startRef = useRef(0)

  // ── Fit the true-scale canvas to whatever width the hero gives us ──────────
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const fit = () => {
      const w = box.getBoundingClientRect().width
      // Fill the width exactly, but never past 1:1 — the frame used to be
      // full-bleed, so a 2560px screen drew the replica at 1.78×: soft, 1445px
      // tall, and the whole viewport. Below ~0.5 the type stops reading as type,
      // so on a phone the canvas is cropped from the right instead of shrunk
      // further — the left column stays legible.
      setScale(Math.min(Math.max(w / W, 0.5), 1))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  // ── One clock: scene cycling, the cursor, the count-ups ───────────────────
  useEffect(() => {
    let raf = 0
    startRef.current = performance.now()

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const cur = sceneRef.current
      const dur = SCENE_MS[cur]
      const age = now - startRef.current
      const u = clamp01(age / dur)

      const p = splineAt(PATHS[cur], u)
      if (cursorRef.current) {
        // A slow drift on top of the spline, so it is never perfectly still
        // even at a waypoint.
        const dx = Math.sin(now / 430) * 1.6
        const dy = Math.cos(now / 480) * 1.3
        cursorRef.current.style.transform = `translate3d(${(p.x + dx).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0)`
      }

      // Numbers count up over the first second of a scene.
      const k = easeOutExpo(clamp01(age / 1100))
      stageRef.current?.querySelectorAll<HTMLElement>('[data-to]').forEach(el => {
        const to  = parseFloat(el.dataset.to || '0')
        const dec = parseInt(el.dataset.dec || '0')
        const v   = to * k
        el.textContent =
          (el.dataset.pre || '') +
          (el.dataset.plain != null
            ? v.toFixed(dec)
            : v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })) +
          (el.dataset.suf || '')
      })

      if (age >= dur) {
        const next = SCENES[(SCENES.indexOf(cur) + 1) % SCENES.length]
        sceneRef.current = next
        startRef.current = now
        setScene(next)
      }
    }

    // Runs only while visible, and not at all if the visitor asked for less
    // motion — the loop used to hold 60fps while you read the pricing table.
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const start = () => { if (!raf && !reduced) { startRef.current = performance.now(); raf = requestAnimationFrame(tick) } }
    const stop  = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    const box = boxRef.current
    const io = box ? new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0 }) : null
    if (io && box) io.observe(box); else start()
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)

    return () => { stop(); io?.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [])

  return (
    <>
    {/* The scaled canvas does not affect layout height, so the frame has to be
        told how tall the result is. */}
    <div ref={boxRef} style={{ width: '100%', height: `${Math.round(H * scale)}px`, overflow: 'hidden', background: VOID, position: 'relative' }}>
      <div
        ref={stageRef}
        style={{
          width: `${W}px`, height: `${H}px`,
          transform: `scale(${scale})`, transformOrigin: 'top left',
          position: 'relative', display: 'flex', flexDirection: 'column',
          background: VOID, color: INK1, ...words,
        }}
      >
        <Topbar />
        <TabBar active={SCENE_TAB[scene]} />

        <div key={scene} className="vq-scene" style={{ flex: 1, minHeight: 0, padding: '12px', overflow: 'hidden' }}>
          {scene === 'home'    && <Home />}
          {scene === 'trading' && <Trading />}
          {scene === 'journal' && <Journal />}
          {scene === 'copy'    && <Copy />}
          {scene === 'analyst' && <Analyst />}
        </div>

        {/* The pointer. Drawn, not a real cursor, so it can be styled. */}
        <div ref={cursorRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 40, pointerEvents: 'none', willChange: 'transform' }}>
          <svg width="17" height="22" viewBox="0 0 17 22" fill="none" aria-hidden="true">
            <path d="M1 1 L1 15.5 L4.8 11.6 L7.4 18.6 L10.1 17.5 L7.5 10.6 L13.2 10.6 Z"
              fill="#fff" stroke="rgba(0,0,0,0.55)" strokeWidth="1" strokeLinejoin="round" />
          </svg>
        </div>

        <style>{`
          .vq-scene { animation: vqSceneIn 0.42s cubic-bezier(0.16,1,0.3,1) }
          @keyframes vqSceneIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
          @media (prefers-reduced-motion: reduce) { .vq-scene { animation: none } }
        `}</style>
      </div>
    </div>

    <SceneCaption scenes={SCENES.map(x => SCENE_TAB[x])} active={SCENE_TAB[scene]} />
    </>
  )
}

// ── Scene: Home ──────────────────────────────────────────────────────────────

const METRICS = [
  { k: 'MT5 balance', to: 24830.5, dec: 2, pre: '€', meta: 'Equity €24,960.50', color: INK1 },
  { k: 'Month',       to: 6.38,   dec: 2, pre: '+', suf: '%', meta: '11W · 6L', color: UP, plain: true },
  { k: 'Today',       to: 0,      dec: 2, pre: '€', meta: 'No closed trades', color: INK3 },
  { k: 'Win rate',    to: 67.4,   dec: 1, suf: '%', meta: '29W / 14L decided', color: INK1, plain: true },
  { k: 'Payoff',      to: 1.71,   dec: 2, meta: '€179 / €105 avg', color: UP, plain: true },
]

function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      {/* Status line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '0 2px' }}>
        <span style={{ ...label, color: INK2 }}>Thursday, 30 July 2026</span>
        <span style={{ width: 1, height: 10, background: LINE }} />
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: INK1 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK1 }} />
          London / NY overlap
        </span>
        <span style={{ ...mono, fontSize: '11px', color: INK2 }}>16:54:12</span>
        <span style={{ ...mono, fontSize: '11px', color: INK4 }}>14:54:12 UTC</span>
        <span style={{ fontSize: '11px', color: INK3 }}>London closes in <span style={mono}>1h 36m</span></span>
        <span style={{ marginLeft: 'auto', ...label }}>Habits <span style={{ ...mono, color: INK1 }}>0/3</span></span>
      </div>

      {/* Metric strip */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
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

      {/* Net worth */}
      <Panel title="Net worth" action={<Segmented options={['2024', '2025', '2026']} active="2026" />} style={{ height: '250px' }}>
        <div style={{ padding: '12px 14px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ ...label, fontSize: '9px' }}>17 Jul 2026</div>
            <div style={{ marginTop: '6px' }}><Num to={32245.54} dec={2} pre="€" size={26} /></div>
          </div>
          <div style={{ display: 'flex', gap: '26px', paddingTop: '2px' }}>
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

      {/* Calendar + streaks */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: '10px', flex: 1, minHeight: 0 }}>
        <Panel title="Trading calendar">
          <MiniCalendar />
        </Panel>
        <Panel title="Streaks" action={<span style={{ ...label, fontSize: '9px' }}>last 12 trades</span>}>
          <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <StreakRow icon="trendDown" name="Loss run" sub="Loss in a row" value="1" run />
            <StreakRow icon="journal" name="Journal" sub="Days in a row" value="0" />
            <StreakRow icon="habit" name="Habits" sub="Days in a row" value="0" />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function StreakRow({ icon, name, sub, value, run }: { icon: IconName; name: string; sub: string; value: string; run?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
        <span style={{ color: INK3, paddingTop: '1px' }}><Icon name={icon} size={13} /></span>
        <div>
          <div style={{ fontSize: '12px', color: INK1 }}>{name}</div>
          <div style={{ ...label, fontSize: '8.5px', marginTop: '3px' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {run
          ? <div style={{ display: 'flex', gap: '2px', alignItems: 'flex-end', height: '13px' }}>
              {[UP, UP, DOWN, UP, UP, UP, DOWN, UP, UP, DOWN, UP, DOWN].map((c, i) => (
                <span key={i} style={{ width: '3px', height: '13px', borderRadius: '1px', background: c }} />
              ))}
            </div>
          : <div style={{ display: 'flex', gap: '2px' }}>
              {Array.from({ length: 7 }).map((_, i) => <span key={i} style={{ width: '3px', height: '4px', borderRadius: '1px', background: LINE }} />)}
            </div>}
        <span style={{ ...mono, fontSize: '17px', color: INK1 }}>{value}</span>
      </div>
    </div>
  )
}

/** The equity area, drawn from a fixed series so it is the same shape every time. */
function EquityCurve() {
  const pts = [28521, 28610, 28540, 28720, 28680, 28810, 28900, 28860, 29010, 29180, 29120, 29320, 29500,
               29440, 29680, 29820, 29760, 30010, 30180, 30120, 30380, 30520, 30460, 30740, 30960, 30880,
               31150, 31320, 31260, 31520, 31700, 31640, 31900, 32100, 32020, 32245]
  const w = 1386, h = 128, min = 28300, max = 32500
  const X = (i: number) => (i / (pts.length - 1)) * w
  const Y = (v: number) => h - ((v - min) / (max - min)) * h
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${w} ${h} L0 ${h} Z`

  return (
    <div style={{ padding: '6px 14px 10px' }}>
      <svg width={w} height={h + 16} viewBox={`0 0 ${w} ${h + 16}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="vq-eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C46A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00C46A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#vq-eq)" />
        <path d={line} fill="none" stroke={UP} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
          style={{ strokeDasharray: 4200, strokeDashoffset: 0, animation: 'vqDraw 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
        <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r="3.2" fill={UP} />
        {['Jun', 'Jul'].map((m, i) => (
          <text key={m} x={w * (0.34 + i * 0.42)} y={h + 13} textAnchor="middle"
            style={{ ...words, fontSize: '10px', fill: 'rgba(255,255,255,0.28)' }}>{m}</text>
        ))}
        <style>{`@keyframes vqDraw { from { stroke-dashoffset: 4200 } to { stroke-dashoffset: 0 } }
          @media (prefers-reduced-motion: reduce) { path { animation: none !important } }`}</style>
      </svg>
    </div>
  )
}

/** July 2026, exactly the month the calendar opens on in the app. */
function MiniCalendar() {
  const days: (number | null)[] = [null, null, null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  const pnl: Record<number, number> = { 1: -91, 3: 212, 4: 176, 6: -118, 8: 149, 9: 234, 10: -84, 11: 191, 12: 163, 13: -126, 14: 108, 15: 219, 16: 47, 17: 409 }
  const fmt = (v: number) => `${v >= 0 ? '+' : '−'}€${Math.abs(v)}`

  return (
    <div style={{ padding: '10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '18px', marginBottom: '8px' }}>
        <span style={{ color: INK3, fontSize: '12px' }}>←</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...mono, fontSize: '12px', color: INK1 }}>July 2026</div>
          <div style={{ ...mono, fontSize: '12px', color: UP, marginTop: '1px' }}>+€1,489</div>
        </div>
        <span style={{ color: INK4, fontSize: '12px' }}>→</span>
        <div style={{ marginLeft: 'auto' }}><Segmented options={['Month', 'Year']} active="Month" /></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: '10px', color: INK3, paddingBottom: '4px' }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map((d, i) => {
          const v = d != null ? pnl[d] : undefined
          const bg = v == null ? 'transparent' : v > 0 ? 'rgba(0,196,106,0.09)' : 'rgba(240,80,75,0.10)'
          return (
            <div key={i} style={{ minHeight: '52px', padding: '5px 6px', border: `1px solid ${LINE}`, background: bg }}>
              {d != null && <>
                <div style={{ ...mono, fontSize: '10px', color: v == null ? INK4 : INK2 }}>{d}</div>
                {v != null && <>
                  <div style={{ ...mono, fontSize: '11px', color: v > 0 ? UP : DOWN, marginTop: '3px' }}>{fmt(v)}</div>
                  <div style={{ ...mono, fontSize: '10px', color: INK4, marginTop: '2px' }}>{v > 0 ? '100%' : '0%'}</div>
                </>}
              </>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scene: Trading ───────────────────────────────────────────────────────────

function Trading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ ...label }}>PDF report</span>
        {['This Month', 'Last Month', 'Last Year'].map(b => (
          <span key={b} style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: INK2,
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '6px 12px', background: SURF,
          }}>
            <Icon name="download" size={12} />{b}
          </span>
        ))}
        <span style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: INK2,
          border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '6px 12px', background: SURF,
        }}>
          <Icon name="calendar" size={12} />Custom range
        </span>
      </div>

      <Panel title="Live chart" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px' }}>
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

        <div style={{ padding: '0 14px 4px', display: 'flex', alignItems: 'baseline', gap: '10px', ...mono, fontSize: '11px' }}>
          <span style={{ color: INK2 }}>US Nas 100 · 5 · OANDA</span>
          <span style={{ color: INK4 }}>O<span style={{ color: DOWN }}>28,051.6</span></span>
          <span style={{ color: INK4 }}>H<span style={{ color: DOWN }}>28,062.0</span></span>
          <span style={{ color: INK4 }}>L<span style={{ color: DOWN }}>27,961.3</span></span>
          <span style={{ color: INK4 }}>C<span style={{ color: DOWN }}>27,963.0</span></span>
          <span style={{ color: DOWN }}>−88.6 (−0.32%)</span>
        </div>

        <Candles />
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', flexShrink: 0 }}>
        {[
          { k: 'P&L',           to: 1488.7, dec: 2, pre: '+€', meta: '17 trades',            ring: '3.53', rsub: 'PF',    c: UP },
          { k: 'Win rate',      to: 65,     dec: 0, suf: '%',  meta: '11W · 6L',             ring: '65%',  rsub: '',      c: INK1 },
          { k: 'Return',        to: 6.38,   dec: 2, pre: '+',  suf: '%', meta: '+€1488.70 · 17 trades', ring: '', rsub: '', c: UP },
          { k: 'Overall pips',  to: 363.1,  dec: 1, pre: '+',  suf: 'p', meta: 'across 17 trades', ring: '+363', rsub: 'PIPS', c: UP },
          { k: 'Consistency',   to: 71,     dec: 0, suf: '%',  meta: '10/14 traded days green', ring: '71%', rsub: 'GREEN', c: INK1 },
        ].map(m => (
          <div key={m.k} style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '11px 13px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={label}>{m.k}</span>
              <span style={{ color: INK4 }}><Icon name="search" size={11} /></span>
            </div>
            <div style={{ marginTop: '8px' }}><Segmented options={['D', 'W', 'M', 'Q', 'Y']} active="M" /></div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '10px' }}>
              <div>
                <Num to={m.to} dec={m.dec} pre={m.pre} suf={m.suf} plain color={m.c} size={21} />
                <div style={{ fontSize: '10px', color: INK3, marginTop: '5px' }}>{m.meta}</div>
              </div>
              {m.ring && <Ring text={m.ring} sub={m.rsub} color={m.c === UP ? UP : INK1} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Ring({ text, sub, color }: { text: string; sub: string; color: string }) {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
      <circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
      <circle cx="21" cy="21" r="17" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray="107" strokeDashoffset="30" transform="rotate(-90 21 21)" />
      <text x="21" y={sub ? 20 : 24} textAnchor="middle" style={{ ...mono, fontSize: '10px', fill: '#fff' }}>{text}</text>
      {sub && <text x="21" y="29" textAnchor="middle" style={{ ...words, fontSize: '7px', letterSpacing: '0.1em', fill: 'rgba(255,255,255,0.48)' }}>{sub}</text>}
    </svg>
  )
}

/** Deterministic candles — the same shape on every visit, drawn left to right. */
function Candles() {
  const n = 96, w = 1386, h = 250
  const bars = Array.from({ length: n }, (_, i) => {
    const drift = 27200 + i * 8 + Math.sin(i / 7) * 90 + Math.sin(i / 23) * 160
    const o = drift + Math.sin(i * 2.3) * 22
    const c = drift + Math.cos(i * 1.7) * 26
    return { o, c, hi: Math.max(o, c) + 14 + Math.abs(Math.sin(i * 3.1)) * 20, lo: Math.min(o, c) - 12 - Math.abs(Math.cos(i * 2.7)) * 18 }
  })
  const lo = Math.min(...bars.map(b => b.lo)), hi = Math.max(...bars.map(b => b.hi))
  const Y = (v: number) => h - ((v - lo) / (hi - lo)) * h
  const bw = w / n

  return (
    <div style={{ padding: '0 14px 10px', position: 'relative' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
        {bars.map((b, i) => {
          const up = b.c >= b.o
          const col = up ? UP : DOWN
          const x = i * bw + bw / 2
          return (
            <g key={i} style={{ animation: `vqBar 0.5s ease ${(i / n) * 0.9}s both` }}>
              <line x1={x} x2={x} y1={Y(b.hi)} y2={Y(b.lo)} stroke={col} strokeWidth="1" />
              <rect x={i * bw + bw * 0.18} width={bw * 0.64} y={Y(Math.max(b.o, b.c))}
                height={Math.max(1, Math.abs(Y(b.o) - Y(b.c)))} fill={col} />
            </g>
          )
        })}
        <line x1="0" x2={w} y1={Y(bars[n - 1].c)} y2={Y(bars[n - 1].c)} stroke={DOWN} strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />
        <style>{`@keyframes vqBar { from { opacity: 0 } to { opacity: 1 } }
          @media (prefers-reduced-motion: reduce) { g { animation: none !important } }`}</style>
      </svg>
      <span style={{
        position: 'absolute', right: '14px', top: `${Y(bars[n - 1].c) - 9}px`,
        ...mono, fontSize: '10px', background: DOWN, color: '#fff', padding: '2px 6px', borderRadius: '3px',
      }}>27,963.0</span>
    </div>
  )
}

// ── Scene: Journal ───────────────────────────────────────────────────────────

function Journal() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        {['Daily journal', 'Weekly review'].map((t, i) => (
          <span key={t} style={{
            ...label, fontSize: '10px', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
            background: i === 0 ? 'var(--color-surface-2)' : 'transparent', color: i === 0 ? INK1 : INK3,
          }}>{t}</span>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { k: 'Entries this month', to: 12,  dec: 0, meta: 'of 23 trading days', c: INK1 },
          { k: 'Avg mood',           to: 7.2, dec: 1, suf: '/10', meta: 'Based on entries', c: INK1 },
          { k: 'Best mood',          text: 'Neutral', meta: '+€137/day avg', c: INK1, metaC: UP },
          { k: 'Streak',             to: 0,   dec: 0, suf: 'd', meta: 'Start journaling today', c: INK1 },
        ].map(m => (
          <div key={m.k} style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '11px 14px' }}>
            <div style={label}>{m.k}</div>
            <div style={{ marginTop: '6px' }}>
              {m.text
                ? <span style={{ fontSize: '21px', color: INK1 }}>{m.text}</span>
                : <Num to={m.to!} dec={m.dec} suf={m.suf} plain color={m.c} size={21} />}
            </div>
            <div style={{ marginTop: '4px', fontSize: '11px', color: m.metaC ?? INK3 }}>{m.meta}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: '10px', flex: 1, minHeight: 0 }}>
        <Panel>
          <div style={{ padding: '10px 14px' }}>
            <div style={{ ...mono, fontSize: '12px', color: INK1, textAlign: 'center', marginBottom: '10px' }}>July 2026</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} style={{ ...label, fontSize: '8.5px', textAlign: 'center' }}>{d}</div>
              ))}
              {Array.from({ length: 28 }).map((_, i) => {
                const day = i - 2
                const journaled = day > 5 && day < 18
                const missed = (day >= 1 && day <= 3) || (day >= 20 && day <= 24) || (day >= 27 && day <= 30)
                return (
                  <div key={i} style={{
                    height: '32px', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${missed ? 'rgba(240,80,75,0.22)' : 'transparent'}`,
                    background: missed ? 'rgba(240,80,75,0.06)' : 'transparent',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '3px',
                  }}>
                    {day > 0 && day <= 31 && <>
                      <span style={{ ...mono, fontSize: '10px', color: INK3 }}>{day}</span>
                      <span style={{ width: 4, height: 4, borderRadius: '50%', background: journaled ? INK1 : missed ? DOWN : 'transparent' }} />
                    </>}
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
              {[['Journaled', INK1], ['Missed', DOWN], ['Today', INK4]].map(([t, c]) => (
                <span key={t} style={{ ...label, fontSize: '8.5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: c }} />{t}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Mood → P&L correlation">
          <div style={{ padding: '11px 14px' }}>
            <div style={{ fontSize: '11px', color: INK3, marginBottom: '12px' }}>Average P&amp;L on days you journaled, grouped by mood:</div>
            {[['Great', '4 days', 78.68, 0.58], ['Good', '5 days', 93.4, 0.69], ['Neutral', '3 days', 136.67, 1]].map(([n, d, v, w]) => (
              <div key={n as string} style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px', color: INK1 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: INK2 }} />{n}
                    <span style={{ ...mono, fontSize: '10px', color: INK4 }}>{d}</span>
                  </span>
                  <span style={{ ...mono, fontSize: '11px', color: UP }}>+€{(v as number).toFixed(2)} avg</span>
                </div>
                <div style={{ height: '2px', background: LINE }}>
                  <div style={{ height: '100%', width: `${(w as number) * 100}%`, background: UP }} />
                </div>
              </div>
            ))}
            <div style={{ borderLeft: `1px solid ${LINE}`, paddingLeft: '12px', marginTop: '14px' }}>
              <div style={{ ...label, fontSize: '8.5px' }}>Velquor insight</div>
              <div style={{ fontSize: '11px', color: INK2, lineHeight: 1.6, marginTop: '6px' }}>
                You trade best when feeling <span style={{ color: INK1 }}>neutral</span> (avg <span style={mono}>+€136.67</span>/day).
                Avoid trading when <span style={{ color: INK1 }}>great</span> (avg <span style={mono}>+€78.68</span>/day).
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}

// ── Scene: Copy ──────────────────────────────────────────────────────────────

function Copy() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '17px', color: INK1 }}>Copy trading</div>
          <div style={{ fontSize: '12px', color: INK3, marginTop: '4px' }}>Mirror trades across multiple MT5 accounts in real time</div>
        </div>
        <span style={{ fontSize: '12px', color: INK1, border: `1px solid ${LINE}`, background: SURF, borderRadius: 'var(--radius-sm)', padding: '8px 14px' }}>
          + New group
        </span>
      </div>

      <Panel style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: UP }} />
            <span style={{ fontSize: '13px', color: INK1 }}>Main Group</span>
            <span style={{ ...mono, fontSize: '10px', color: INK3, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-xs)', padding: '2px 7px' }}>0.5× lots</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['Pause', 'Delete'].map(b => (
              <span key={b} style={{ fontSize: '11px', color: INK3, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '5px 12px' }}>{b}</span>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 14px' }}>
          <div style={{ ...label, fontSize: '8.5px', marginBottom: '8px' }}>Leader account</div>
          <AccountRow name="Blueberry Main" meta="#114892 · BlueberryMarkets-Live02 · 2m ago" actions={['Host in Cloud', 'Remove']} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '14px 0 8px' }}>
            <span style={{ ...label, fontSize: '8.5px' }}>Follower accounts (2)</span>
            <span style={{ ...label, fontSize: '8.5px', color: INK2 }}>+ Add follower</span>
          </div>
          <AccountRow name="Blueberry Second" meta="#221040 · BlueberryMarkets-Live02 · 2m ago" actions={['Host in Cloud', 'Pause']} />
          <div style={{ height: '8px' }} />
          <AccountRow name="FTMO Challenge" meta="#58112 · FTMO-Server · 2m ago" actions={['Host in Cloud', 'Pause']} />

          <div style={{
            marginTop: '12px', border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)',
            padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ ...label, fontSize: '8.5px' }}>EA configuration <span style={{ color: INK4 }}>· for accounts on your own MetaTrader</span></span>
            <span style={{ color: INK4 }}>▾</span>
          </div>
        </div>
      </Panel>

      <Panel style={{ flex: 1, minHeight: 0 }}>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ ...label, fontSize: '8.5px', marginBottom: '10px' }}>How it works</div>
          {[
            ['1', 'Create a Copy Group', 'Set up a group with a name and lot sizing config (proportional or fixed).'],
            ['2', 'Connect your accounts', 'Add your leader and your followers. Pick VELQUOR Cloud and we host the terminal for you, 24/7.'],
            ['3', 'Trades mirror automatically', 'When the leader opens or closes a trade, followers receive the signal and execute it.'],
          ].map(([n, t, d]) => (
            <div key={n} style={{ display: 'flex', gap: '11px', padding: '8px 0' }}>
              <span style={{
                ...mono, fontSize: '10px', color: INK2, flexShrink: 0,
                width: '20px', height: '20px', borderRadius: '50%', border: `1px solid ${LINE}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{n}</span>
              <div>
                <div style={{ fontSize: '12px', color: INK1 }}>{t}</div>
                <div style={{ fontSize: '11px', color: INK3, marginTop: '3px', lineHeight: 1.55 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function AccountRow({ name, meta, actions }: { name: string; meta: string; actions: string[] }) {
  return (
    <div style={{
      border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', background: VOID,
      padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK2 }} />
        <div>
          <div style={{ fontSize: '12px', color: INK1 }}>{name}</div>
          <div style={{ ...mono, fontSize: '10px', color: INK4, marginTop: '3px' }}>{meta}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {actions.map(a => (
          <span key={a} style={{
            fontSize: '11px', padding: '5px 11px', borderRadius: 'var(--radius-sm)',
            border: `1px solid ${LINE}`, color: a === 'Remove' ? DOWN : INK2,
          }}>{a}</span>
        ))}
      </div>
    </div>
  )
}

// ── Scene: Analyst ───────────────────────────────────────────────────────────

const Q = 'Why am I losing on Nasdaq?'
const A = 'Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You are trading against institutional order flow before direction is established. Consider a 30-minute wait rule.'

function Analyst() {
  const [typed, setTyped] = useState(0)
  const [answered, setAnswered] = useState(0)

  useEffect(() => {
    let t1 = 0 as unknown as ReturnType<typeof setInterval>
    let t2 = 0 as unknown as ReturnType<typeof setInterval>
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) {
      // Show the finished exchange rather than typing it. Deferred by a tick so
      // the server's empty render hydrates first — setting it synchronously here
      // would be a cascading render, and on the server it cannot be known.
      const id = setTimeout(() => { setTyped(Q.length); setAnswered(A.length) }, 0)
      return () => clearTimeout(id)
    }
    t1 = setInterval(() => setTyped(n => (n < Q.length ? n + 1 : n)), 42)
    const kick = setTimeout(() => {
      t2 = setInterval(() => setAnswered(n => (n < A.length ? n + 3 : n)), 16)
    }, Q.length * 42 + 420)
    return () => { clearInterval(t1); clearInterval(t2); clearTimeout(kick) }
  }, [])

  const asking = typed >= Q.length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '18px', padding: '0 200px' }}>
      {!asking ? (
        <>
          <div style={{
            width: '56px', height: '56px', borderRadius: 'var(--radius-lg)',
            border: `1px solid ${LINE}`, background: SURF,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LogoMark size={30} showBackground={false} />
          </div>
          <div style={{ fontFamily: 'var(--font-mark)', fontSize: '21px', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
            Velquor Analyst
          </div>
          <p style={{ fontSize: '13px', color: INK3, lineHeight: 1.65, textAlign: 'center', maxWidth: '64ch', margin: 0 }}>
            Your trading desk analyst. It reads your actual trade history, journal, and discipline data —
            then answers with your numbers, not generic advice.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%' }}>
            {[
              ['Your MT5 trades', 'P&L, win rate, sessions, setups'],
              ['Journal & mood', 'How psychology moves your numbers'],
              ['Discipline data', 'Habits, streaks, plan adherence'],
              ['Portfolio & macro', 'Holdings, news, market context'],
            ].map(([t, d]) => (
              <div key={t} style={{ background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                <div style={{ fontSize: '12px', color: INK1 }}>{t}</div>
                <div style={{ fontSize: '11px', color: INK3, marginTop: '5px', lineHeight: 1.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '10px 13px', fontSize: '13px', maxWidth: '70%' }}>
              {Q}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <LogoMark size={22} />
            <div style={{
              border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '11px 13px',
              fontSize: '13px', color: INK2, lineHeight: 1.7, maxWidth: '80%', minHeight: '64px',
            }}>
              {A.slice(0, answered)}
              {answered < A.length && <span style={{ opacity: 0.5 }}>▍</span>}
            </div>
          </div>
        </div>
      )}

      {/* The composer, always at the bottom of the scene */}
      <div style={{
        width: '100%', marginTop: 'auto', background: SURF, border: `1px solid ${LINE}`,
        borderRadius: 'var(--radius-md)', padding: '12px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
      }}>
        <span style={{ fontSize: '13px', color: typed ? INK1 : INK4 }}>
          {typed ? Q.slice(0, typed) : 'Ask the Analyst about your trading…'}
          {typed > 0 && typed < Q.length && <span style={{ opacity: 0.6 }}>▍</span>}
        </span>
        <span style={{
          width: '26px', height: '26px', borderRadius: 'var(--radius-sm)',
          background: 'var(--color-surface-3)', color: INK1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>↑</span>
      </div>
    </div>
  )
}
