'use client'

/**
 * The product, on a phone.
 *
 * The landing hero used to show one replica to everybody: a 1440×812 desktop
 * canvas. Below ~720px that canvas cannot shrink any further without the type
 * dissolving, so it was cropped from the right — a phone visitor got the left
 * half of a desktop dashboard at half size, in landscape, on a portrait screen.
 * It advertised a shape the product does not have on the device they were
 * holding.
 *
 * This is the real thing instead. VELQUOR has a genuine mobile layout — the
 * dashboard swaps to it at 639px (`useIsMobile`) — and it is a different screen,
 * not a squeezed one: a hamburger and a section name where the desktop has a
 * ten-tab strip, the session line promoted to its own card, the five-across
 * metric strip split into two rows of three, a taller chart.
 *
 * Measured from the running app at 390px on 2026-08-01 (`m-*.png` plus the DOM
 * geometry behind them): top bar 48px, main padding 10/10/14, content gap 12,
 * cards 123×98 at 11px/14px, values 21px mono, labels 10px at 0.16em. Drawn at
 * that true scale and fitted to the hero, so the density is the product's own.
 *
 * The figures are the desktop replica's figures — same account, one story.
 */

import { useEffect, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import Icon from '@/components/ui/Icon'
import {
  Panel, Num, Segmented, Stage, SceneCaption, LiveChartShot, ChartAttribution, CHART_QUOTE,
  INK1, INK2, INK3, INK4, LINE, UP, DOWN, VOID, SURF,
  mono, label, words,
} from '@/components/product/replica'

// A phone, in true device pixels. Portrait — the whole point.
const W = 390
const H = 560

const SCENES = ['Home', 'Trading', 'Journal', 'Copy', 'Analyst'] as const
type Scene = typeof SCENES[number]
// Scene lengths, cut 35% on 2026-08-01 — the sequence read as a slideshow
// at the old pace. The Analyst scene stays the longest because it has to
// finish typing a question and an answer inside its own cut.
const SCENE_MS: Record<Scene, number> = {
  Home: 3640, Trading: 3120, Journal: 3120, Copy: 2860, Analyst: 4290,
}

// A thumb, not a cursor — this is a touch device. It drifts between the places
// a thumb would actually land, and never parks (the cursor rule).
const PATHS: Record<Scene, [number, number][]> = {
  Home:    [[180, 150], [110, 230], [250, 300], [320, 380], [190, 450], [90, 360], [230, 210], [300, 130]],
  Trading: [[150, 140], [250, 210], [330, 320], [200, 420], [100, 350], [180, 250], [300, 180], [120, 200]],
  Journal: [[200, 130], [120, 220], [280, 290], [330, 400], [180, 460], [90, 330], [240, 240], [310, 160]],
  Copy:    [[170, 160], [280, 230], [320, 330], [190, 400], [100, 320], [210, 260], [300, 190], [130, 220]],
  Analyst: [[200, 200], [290, 280], [200, 350], [120, 300], [230, 420], [310, 350], [160, 250], [250, 170]],
}

export function MobileDashboard() {
  const [scene, setScene] = useState<Scene>('Home')
  const sceneRef = useRef<Scene>('Home')

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) return
    const id = setTimeout(() => {
      const next = SCENES[(SCENES.indexOf(sceneRef.current) + 1) % SCENES.length]
      sceneRef.current = next
      setScene(next)
    }, SCENE_MS[scene])
    return () => clearTimeout(id)
  }, [scene])

  return (
    <>
      <Stage width={W} height={H} minScale={0.62} sceneKey={scene} path={PATHS[scene]}
             durationMs={SCENE_MS[scene]} zoom={0.022}>
        <MobileTopbar section={scene} />
        <div key={scene} className="mb-scene" style={{
          flex: 1, minHeight: 0, padding: '10px 10px 14px',
          display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden',
        }}>
          {scene === 'Home'    && <Home />}
          {scene === 'Trading' && <Trading />}
          {scene === 'Journal' && <Journal />}
          {scene === 'Copy'    && <Copy />}
          {scene === 'Analyst' && <Analyst />}
        </div>
        <style>{`
          .mb-scene { animation: mbSceneIn 0.42s cubic-bezier(0.16,1,0.3,1) }
          @keyframes mbSceneIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
          @media (prefers-reduced-motion: reduce) { .mb-scene { animation: none } }
        `}</style>
      </Stage>

      <SceneCaption scenes={SCENES} active={scene} />
    </>
  )
}

// ── Chrome ───────────────────────────────────────────────────────────────────

/**
 * The phone's top bar: hamburger, mark, section name, account pill.
 *
 * Note what the real app drops here and this drops with it — the ten-tab strip
 * (it lives in a sheet behind the hamburger), the "MT5" label and staleness
 * inside the pill, and the account name beside the avatar. Keeping them would
 * be inventing a bar the product does not have.
 */
function MobileTopbar({ section }: { section: string }) {
  return (
    <div style={{
      height: '48px', flexShrink: 0, padding: '0 12px',
      borderBottom: `1px solid ${LINE}`, background: VOID,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{
          width: '30px', height: '34px', border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="15" height="15" viewBox="0 0 15 15" stroke={INK1} strokeWidth="1.4" strokeLinecap="round">
            <line x1="2.5" y1="4.5" x2="12.5" y2="4.5" />
            <line x1="2.5" y1="8" x2="12.5" y2="8" />
            <line x1="2.5" y1="11.5" x2="12.5" y2="11.5" />
          </svg>
        </span>
        <LogoMark size={20} />
        <span style={{ ...label, fontSize: '10px', letterSpacing: '0.14em' }}>{section}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: '8px', height: '34px',
          border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '0 10px',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: UP }} />
          <span style={{ ...mono, fontSize: '12px' }}>€24,830.50</span>
          <span style={{ fontSize: '10px', color: INK4 }}>▾</span>
        </span>
        <span style={{
          width: '26px', height: '34px', border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: INK3,
        }}>€</span>
        <span style={{
          width: '24px', height: '24px', background: 'var(--color-surface-2)',
          border: `1px solid ${LINE}`, borderRadius: 'var(--radius-xs)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', ...mono, fontSize: '11px',
        }}>M</span>
      </div>
    </div>
  )
}

/** The 3-up metric row the phone uses in place of the desktop's 5-across strip. */
function MetricRow({ cells }: {
  cells: { k: string; to: number; dec?: number; pre?: string; suf?: string; plain?: boolean; meta: string; color?: string }[]
}) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', flexShrink: 0,
      background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      {cells.map((c, i) => (
        <div key={c.k} style={{ padding: '11px 12px', borderRight: i < 2 ? `1px solid ${LINE}` : undefined, minWidth: 0 }}>
          <div style={{ ...label, fontSize: '9px', letterSpacing: '0.14em' }}>{c.k}</div>
          <div style={{ marginTop: '7px' }}>
            <Num to={c.to} dec={c.dec} pre={c.pre} suf={c.suf} plain={c.plain} color={c.color ?? INK1} size={19} />
          </div>
          <div style={{ marginTop: '5px', fontSize: '10px', color: INK3, whiteSpace: 'nowrap', overflow: 'hidden' }}>{c.meta}</div>
        </div>
      ))}
    </div>
  )
}

// ── Home ─────────────────────────────────────────────────────────────────────

function Home() {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <span style={{ ...label, fontSize: '10px' }}>Fri 17 Jul</span>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ ...label, fontSize: '10px' }}>Habits</span>
          <span style={{ ...mono, fontSize: '11px', color: INK3 }}>0 / 3</span>
        </span>
      </div>

      {/* The session line gets its own card on a phone — it does not fit the
          status row once the width is gone. */}
      <div style={{
        flexShrink: 0, background: SURF, border: `1px solid ${LINE}`,
        borderRadius: 'var(--radius-md)', padding: '9px 12px',
        display: 'flex', flexDirection: 'column', gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: INK1 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK1 }} />
            London session
          </span>
          <span style={{ width: 1, height: 11, background: 'var(--color-line-2)' }} />
          <span style={{ ...mono, fontSize: '11px' }}>16:54:12</span>
          <span style={{ ...mono, fontSize: '11px', color: INK3 }}>14:54:12 UTC</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: INK3 }}>
          New York opens in <span style={{ ...mono, color: INK1 }}>1h 22m</span>
        </div>
      </div>

      <MetricRow cells={[
        { k: 'MT5 balance', to: 24831, pre: '€', meta: 'Eq €24,961' },
        { k: 'Month', to: 6.38, dec: 2, pre: '+', suf: '%', plain: true, meta: '11W · 6L', color: UP },
        { k: 'Today', to: 0, pre: '€', meta: 'No trades', color: INK3 },
      ]} />
      <MetricRow cells={[
        { k: 'Net worth', to: 32177, pre: '€', meta: 'MT5 + portfolio' },
        { k: 'Win rate', to: 67.4, dec: 1, suf: '%', plain: true, meta: '29W / 14L' },
        { k: 'Trades', to: 43, plain: true, meta: 'all time', color: INK3 },
      ]} />

      <Panel
        title="Net worth"
        action={<Segmented options={['2024', '2025', '2026']} active="2026" size={9} />}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div style={{ padding: '10px 12px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...label, fontSize: '9px' }}>17 Jul 2026</div>
            <div style={{ marginTop: '5px' }}><Num to={32245.54} dec={2} pre="€" size={20} /></div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ ...label, fontSize: '9px' }}>2026 change</div>
            <div style={{ ...mono, fontSize: '12px', color: UP, marginTop: '5px' }}>+€3,725</div>
          </div>
        </div>
        <MiniCurve />
      </Panel>
    </>
  )
}

/** A fixed series, so the shape is the same on every visit. */
function MiniCurve() {
  const pts = [28521, 28610, 28540, 28720, 28680, 28810, 28900, 28860, 29010, 29180, 29120, 29320, 29500,
               29440, 29680, 29820, 29760, 30010, 30180, 30120, 30380, 30520, 30460, 30740, 30960, 30880,
               31150, 31320, 31260, 31520, 31700, 31640, 31900, 32100, 32020, 32245]
  const w = 346, h = 62, min = 28300, max = 32500
  const X = (i: number) => (i / (pts.length - 1)) * w
  const Y = (v: number) => h - ((v - min) / (max - min)) * h
  const line = pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`).join(' ')

  return (
    <div style={{ padding: '6px 12px 0' }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="mb-eq" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00C46A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00C46A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${line} L${w} ${h} L0 ${h} Z`} fill="url(#mb-eq)" />
        <path d={line} fill="none" stroke={UP} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round"
          style={{ strokeDasharray: 1400, strokeDashoffset: 0, animation: 'mbDraw 1.5s cubic-bezier(0.16,1,0.3,1)' }} />
        <circle cx={X(pts.length - 1)} cy={Y(pts[pts.length - 1])} r="3" fill={UP} />
        <style>{`@keyframes mbDraw { from { stroke-dashoffset: 1400 } to { stroke-dashoffset: 0 } }
          @media (prefers-reduced-motion: reduce) { path { animation: none !important } }`}</style>
      </svg>
    </div>
  )
}

// ── Trading ──────────────────────────────────────────────────────────────────

function Trading() {
  return (
    <>
      {/* On a phone the report buttons wrap onto two rows — they do in the app too. */}
      <div style={{
        flexShrink: 0, background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)',
        padding: '9px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px',
      }}>
        <span style={{ ...label, fontSize: '9px' }}>PDF report</span>
        {['This Month', 'Last Month'].map(b => (
          <span key={b} style={{
            display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: INK2,
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '5px 9px',
          }}>
            <Icon name="download" size={11} />{b}
          </span>
        ))}
      </div>

      <Panel title="Live chart" column style={{ flex: 1, minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '8px 12px 4px', flexWrap: 'wrap' }}>
          {['NAS100', 'XAUUSD'].map((s, i) => (
            <span key={s} style={{
              ...mono, fontSize: '10px', padding: '4px 9px', borderRadius: 'var(--radius-sm)',
              background: i === 0 ? 'var(--color-surface-2)' : 'transparent', color: i === 0 ? INK1 : INK3,
            }}>{s}</span>
          ))}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: '2px' }}>
            {['M1', 'M5', 'M15'].map(tf => (
              <span key={tf} style={{
                ...mono, fontSize: '9px', padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                background: tf === 'M5' ? 'var(--color-surface-2)' : 'transparent', color: tf === 'M5' ? INK1 : INK3,
              }}>{tf}</span>
            ))}
          </span>
        </div>
        <div style={{ padding: '0 12px 3px', ...mono, fontSize: '9px', color: INK4 }}>
          {CHART_QUOTE.symbol} <span style={{ color: DOWN }}>{CHART_QUOTE.chg}</span>
        </div>
        <LiveChartShot />
        <ChartAttribution size={8} />
      </Panel>

      <MetricRow cells={[
        { k: 'P&L', to: 1488.7, dec: 0, pre: '+€', meta: '17 trades', color: UP },
        { k: 'Win rate', to: 65, suf: '%', plain: true, meta: '11W · 6L' },
        { k: 'Pips', to: 363, pre: '+', plain: true, meta: 'this month', color: UP },
      ]} />
    </>
  )
}


// ── Journal ──────────────────────────────────────────────────────────────────

function Journal() {
  return (
    <>
      <div style={{ flexShrink: 0 }}>
        <Segmented options={['Daily journal', 'Weekly review']} active="Daily journal" size={9} />
      </div>

      <MetricRow cells={[
        { k: 'Entries', to: 14, plain: true, meta: 'of 21 days' },
        { k: 'Avg mood', to: 7.2, dec: 1, suf: '/10', plain: true, meta: 'from entries' },
        { k: 'Streak', to: 12, suf: 'd', plain: true, meta: 'best 19d' },
      ]} />

      <Panel title="Mood → P&L" style={{ flexShrink: 0 }}>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '10px', color: INK3 }}>Average P&amp;L on days you journaled:</div>
          {[
            ['Great', '4 days', '+€78.68', 0.58],
            ['Good', '5 days', '+€93.40', 0.69],
            ['Neutral', '3 days', '+€136.67', 1],
          ].map(([name, days, avg, frac]) => (
            <div key={name as string}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK3 }} />
                <span style={{ fontSize: '12px', color: INK1 }}>{name}</span>
                <span style={{ ...mono, fontSize: '9px', color: INK4 }}>{days}</span>
                <span style={{ ...mono, fontSize: '11px', color: UP, marginLeft: 'auto' }}>{avg}</span>
              </div>
              <div style={{ height: '2px', background: 'var(--color-surface-2)', borderRadius: '1px' }}>
                <div style={{ width: `${(frac as number) * 100}%`, height: '100%', background: UP, borderRadius: '1px' }} />
              </div>
            </div>
          ))}

          {/* The conclusion the tab actually draws from those three bars. It is
              the point of the screen, and without it the panel ends here with
              300px of empty surface under it. */}
          <div style={{
            marginTop: '4px', borderLeft: `2px solid ${LINE}`, paddingLeft: '10px',
          }}>
            <div style={{ ...label, fontSize: '8.5px', marginBottom: '5px' }}>Velquor insight</div>
            <p style={{ margin: 0, fontSize: '11px', color: INK2, lineHeight: 1.6 }}>
              You trade best when feeling <span style={{ color: INK1 }}>neutral</span> (avg{' '}
              <span style={{ ...mono, color: UP }}>+€136.67</span>/day). Your <span style={{ color: INK1 }}>great</span>{' '}
              days average <span style={{ ...mono, color: UP }}>+€78.68</span> — confidence is costing you.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Recent entries" style={{ flex: 1, minHeight: 0 }}>
        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            ['Fri 17 Jul', 'great · 9/10', '+€408.70', 'Took 2 XAUUSD trades during London open. Both hit target — waited for the OB confirmation.'],
            ['Thu 16 Jul', 'good · 7/10', '+€47.00', 'Followed the plan, waited for confirmation, no revenge trades.'],
          ].map(([d, mood, pnl, note]) => (
            <div key={d}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: INK3, flexShrink: 0 }} />
                <span style={{ ...mono, fontSize: '10px', color: INK1 }}>{d}</span>
                <span style={{ fontSize: '10px', color: INK3 }}>{mood}</span>
                <span style={{ ...mono, fontSize: '11px', color: UP, marginLeft: 'auto' }}>{pnl}</span>
              </div>
              <p style={{ margin: '4px 0 0 11px', fontSize: '10px', color: INK3, lineHeight: 1.5 }}>{note}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

// ── Copy ─────────────────────────────────────────────────────────────────────

function Copy() {
  return (
    <>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: '15px', color: INK1 }}>Copy trading</div>
        <div style={{ fontSize: '11px', color: INK3, marginTop: '3px' }}>Mirror trades across MT5 accounts in real time</div>
      </div>

      <Panel style={{ flex: 1, minHeight: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 12px', borderBottom: `1px solid ${LINE}`,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: UP }} />
          <span style={{ fontSize: '13px', color: INK1 }}>Main Group</span>
          <span style={{
            ...mono, fontSize: '9px', color: INK3, marginLeft: 'auto',
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-xs)', padding: '2px 6px',
          }}>1:1 lots</span>
        </div>

        <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ ...label, fontSize: '8.5px' }}>Leader account</div>
          <AccountRow name="Blueberry Main" meta="#114892 · 2m ago" />
          <div style={{ ...label, fontSize: '8.5px', marginTop: '2px' }}>Followers (2)</div>
          <AccountRow name="Blueberry Second" meta="#221040 · 2m ago" />
          <AccountRow name="FTMO Challenge" meta="#58112 · 2m ago" />

          {/* The app's own explainer sits under the accounts — without it the
              panel ends a third of the way down and the rest is dead surface. */}
          <div style={{ ...label, fontSize: '8.5px', marginTop: '6px' }}>How it works</div>
          {[
            ['1', 'Create a group', 'Name it, pick proportional or fixed lots.'],
            ['2', 'Connect accounts', 'Leader and followers. We can host the terminal.'],
            ['3', 'Trades mirror', 'Followers execute the moment the leader does.'],
          ].map(([n, t, d]) => (
            <div key={n} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <span style={{
                ...mono, fontSize: '9px', color: INK2, flexShrink: 0,
                width: '18px', height: '18px', borderRadius: '50%', border: `1px solid ${LINE}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{n}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '11px', color: INK1 }}>{t}</div>
                <div style={{ fontSize: '10px', color: INK3, marginTop: '2px', lineHeight: 1.45 }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </>
  )
}

function AccountRow({ name, meta }: { name: string; meta: string }) {
  return (
    <div style={{
      border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', background: VOID,
      padding: '9px 11px', display: 'flex', alignItems: 'center', gap: '9px',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: INK2, flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '12px', color: INK1 }}>{name}</div>
        <div style={{ ...mono, fontSize: '9px', color: INK4, marginTop: '2px' }}>{meta}</div>
      </div>
      <span style={{
        marginLeft: 'auto', flexShrink: 0, fontSize: '10px', color: INK3,
        border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', padding: '4px 9px',
      }}>Cloud</span>
    </div>
  )
}

// ── Analyst ──────────────────────────────────────────────────────────────────

const Q = 'Why am I losing on Nasdaq?'
const A = 'Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. Consider a 30-minute wait rule.'

function Analyst() {
  const [typed, setTyped] = useState(0)
  const [answered, setAnswered] = useState(0)

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (reduced) {
      const id = setTimeout(() => { setTyped(Q.length); setAnswered(A.length) }, 0)
      return () => clearTimeout(id)
    }
    const t1 = setInterval(() => setTyped(n => (n < Q.length ? n + 1 : n)), 30)
    let t2: ReturnType<typeof setInterval>
    const kick = setTimeout(() => {
      t2 = setInterval(() => setAnswered(n => (n < A.length ? n + 3 : n)), 16)
    }, Q.length * 30 + 260)
    return () => { clearInterval(t1); clearInterval(t2); clearTimeout(kick) }
  }, [])

  const asking = typed >= Q.length

  return (
    <>
      {/* The prompt chips are the real Analyst's own — without them the scene
          spends its first second as an empty panel with a blinking cursor,
          which is the one moment a visitor is deciding whether to keep
          watching. They also give the composer something to sit under. */}
      <div style={{ flexShrink: 0, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {['Full trend analysis', 'Weakness audit', 'Psychology check'].map(c => (
          <span key={c} style={{
            fontSize: '11px', color: INK2, border: `1px solid ${LINE}`,
            borderRadius: 'var(--radius-sm)', padding: '6px 10px', background: SURF,
          }}>{c}</span>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '10px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span style={{
            fontSize: '12px', color: INK1, background: 'var(--color-surface-2)',
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', padding: '7px 11px', maxWidth: '82%',
          }}>
            {Q.slice(0, typed)}
            {!asking && <span style={{ color: INK3 }}>|</span>}
          </span>
        </div>

        {asking && (
          <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
            <span style={{
              width: '22px', height: '22px', flexShrink: 0, borderRadius: 'var(--radius-sm)',
              border: `1px solid ${LINE}`, background: SURF, color: INK2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name="spark" size={12} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ ...label, fontSize: '8.5px', marginBottom: '4px' }}>Velquor Analyst</div>
              <p style={{ margin: 0, fontSize: '12px', color: INK2, lineHeight: 1.6 }}>
                {A.slice(0, answered)}
                {answered < A.length && <span style={{ color: INK3 }}>|</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      <div style={{
        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)', background: SURF, padding: '9px 11px',
      }}>
        <span style={{ ...words, fontSize: '12px', color: INK4 }}>Ask the Analyst…</span>
        <span style={{
          width: '20px', height: '20px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface-2)',
          color: INK2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
        }}>↑</span>
      </div>
    </>
  )
}
