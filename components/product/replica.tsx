'use client'

/**
 * The product, drawn rather than screenshotted.
 *
 * Two surfaces show a picture of the signed-in dashboard to people who cannot
 * sign in yet: the landing hero and the login page. Both used to draw their own
 * from scratch, and the login one drifted for months — it was still showing
 * "Overview" and "VELQUOR AI" tabs, a blue-to-purple avatar tile and a gold
 * progress bar long after none of that existed. A visitor met one product on
 * the login page and a different one a second later.
 *
 * So the chrome lives here once. In particular the tab strip is built from
 * `components/dashboard/tabs.ts` — the same list the real dashboard renders —
 * which is the one part that cannot be allowed to drift, because it is the part
 * that names the product's sections.
 *
 * Everything is written in true dashboard pixels and then scaled by `Stage`, so
 * a replica is never a smaller redrawing with its own type sizes; it is the
 * product's own scale, shrunk. Measured against the live app at 960px on
 * 2026-08-01 (`ref-n-*.png`): topbar 40px, tab strip 34px, metric cells
 * 11px/14px padding, values 21px mono, labels 10px at 0.16em.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { LogoMark } from '@/components/ui/LogoMark'
import Icon from '@/components/ui/Icon'
import { TABS } from '@/components/dashboard/tabs'

// ── Tokens, as the dashboard writes them ─────────────────────────────────────
export const INK1 = 'var(--color-ink-1)'
export const INK2 = 'var(--color-ink-2)'
export const INK3 = 'var(--color-ink-3)'
export const INK4 = 'var(--color-ink-4)'
export const LINE = 'var(--color-line-1)'
export const UP   = 'var(--color-up)'
export const DOWN = 'var(--color-down)'
export const VOID = 'var(--color-void)'
export const SURF = 'var(--color-surface-1)'

export const mono  = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' } as const
export const label = { fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: INK3 } as const
export const words = { fontFamily: 'var(--font-display)' } as const

export const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -9 * t))
export const clamp01     = (t: number) => Math.min(Math.max(t, 0), 1)

/**
 * Re-times travel along the path so the pointer accelerates between waypoints
 * and eases through them, instead of sliding at one constant speed like a
 * machine. Monotonic by construction, and its derivative bottoms out at
 * `1 - amp` — so it slows near a target but never actually stops, which is the
 * standing rule for these cursors.
 */
export function paced(x: number, n: number, amp = 0.55): number {
  return x + (amp / (2 * Math.PI * n)) * Math.sin(2 * Math.PI * n * x)
}

/** How fast the pointer is travelling right now, 1 = its average. */
export function pacedSpeed(x: number, n: number, amp = 0.55): number {
  return 1 + amp * Math.cos(2 * Math.PI * n * x)
}

/** Catmull-Rom through the waypoints, so the cursor curves instead of darting. */
export function splineAt(pts: [number, number][], u: number): { x: number; y: number } {
  const n = pts.length
  const f = clamp01(u) * n
  const i = Math.min(Math.floor(f), n - 1)
  const t = f - i
  const p = (k: number) => pts[(k + n) % n]
  const [x0, y0] = p(i - 1), [x1, y1] = p(i), [x2, y2] = p(i + 1), [x3, y3] = p(i + 2)
  const cr = (a: number, b: number, c: number, d: number) =>
    0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
  return { x: cr(x0, x1, x2, x3), y: cr(y0, y1, y2, y3) }
}

// ── Chrome ───────────────────────────────────────────────────────────────────

/**
 * The top bar. `compact` drops the account name block, which has nowhere to go
 * once the canvas is narrower than a real laptop window.
 */
export function Topbar({ stale = '2m ago' }: { stale?: string }) {
  return (
    <div style={{
      position: 'relative',
      height: '40px', flexShrink: 0, padding: '0 12px',
      borderBottom: `1px solid ${LINE}`, background: VOID,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <LogoMark size={20} />
        <span style={{ fontFamily: 'var(--font-mark)', fontSize: '17px', lineHeight: 1, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Velquor
        </span>
      </div>

      {/* The account pill sits dead centre in the real bar. */}
      <div style={{
        position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: '9px',
        background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)',
        padding: '5px 10px',
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: UP }} />
        <span style={{ ...label, fontSize: '10px', letterSpacing: '0.14em' }}>MT5</span>
        <span style={{ ...mono, fontSize: '13px' }}>€24,830.50</span>
        <span style={{ ...mono, fontSize: '11px', color: INK4 }}>{stale}</span>
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" stroke={INK4} strokeWidth="2" strokeLinecap="round"><path d="M3 5.5 8 10.5l5-5" /></svg>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          width: '24px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', fontSize: '11px', color: INK2,
        }}>€</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{
            width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `1px solid ${LINE}`, borderRadius: 'var(--radius-sm)', fontSize: '11px', color: INK2,
          }}>M</span>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontSize: '11px', color: INK1 }}>MobileTest</div>
            <div style={{ ...label, fontSize: '8.5px' }}>Vienna · EUR</div>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * The section strip, built from the dashboard's own tab list.
 *
 * `active` is a tab label; anything that is not a label just leaves the strip
 * with nothing lit, which is what the real bar does mid-navigation.
 */
export function TabBar({ active }: { active: string }) {
  return (
    <div style={{
      height: '34px', flexShrink: 0, borderBottom: `1px solid ${LINE}`,
      display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', background: VOID,
    }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        {TABS.map(t => {
          const on = t.label === active
          return (
            <div key={t.label} style={{
              display: 'flex', alignItems: 'center', gap: '7px', padding: '0 14px',
              borderBottom: `2px solid ${on ? INK1 : 'transparent'}`,
              background: on ? SURF : 'transparent',
              color: on ? INK1 : INK3,
              transition: 'color 0.2s, background 0.2s, border-color 0.2s',
            }}>
              <Icon name={t.icon} size={13} />
              <span style={{ ...label, fontSize: '10px', color: 'inherit' }}>{t.label}</span>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 12px', color: INK3 }}>
        <Icon name="settings" size={13} />
      </div>
    </div>
  )
}

export function Panel({ title, action, children, style, column }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties
  /**
   * Make the body a flex column. Needed by anything inside that wants to claim
   * the leftover height with `flex: 1` — the body is a plain block otherwise, so
   * a `flex: 1` child silently collapses to its intrinsic size. That is exactly
   * how the chart ended up a wide strip floating in a tall panel on mobile.
   */
  column?: boolean
}) {
  return (
    <div style={{
      background: SURF, border: `1px solid ${LINE}`, borderRadius: 'var(--radius-md)',
      display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden', ...style,
    }}>
      {title && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 14px', borderBottom: `1px solid ${LINE}`,
        }}>
          <span style={{ fontSize: '13px', color: INK1 }}>{title}</span>
          {action}
        </div>
      )}
      <div style={{
        flex: 1, minHeight: 0,
        ...(column ? { display: 'flex', flexDirection: 'column' as const } : null),
      }}>{children}</div>
    </div>
  )
}

/** A figure that counts up when its scene opens. Driven by `Stage`'s clock. */
export function Num({ to, pre = '', suf = '', dec = 0, plain, size = 21, color = INK1 }: {
  to: number; pre?: string; suf?: string; dec?: number; plain?: boolean; size?: number; color?: string
}) {
  return (
    <span
      data-to={to} data-pre={pre} data-suf={suf} data-dec={dec} {...(plain ? { 'data-plain': '1' } : {})}
      style={{ ...mono, fontSize: `${size}px`, color, lineHeight: 1 }}
    >
      {pre}0{suf}
    </span>
  )
}

export function Segmented({ options, active, size = 9 }: { options: string[]; active: string; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: '1px', padding: '1px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
      {options.map(o => (
        <span key={o} style={{
          ...label, fontSize: `${size}px`, letterSpacing: '0.1em', padding: '3px 8px',
          borderRadius: 'var(--radius-xs)',
          background: o === active ? 'var(--color-surface-3)' : 'transparent',
          color: o === active ? INK1 : INK3,
        }}>{o}</span>
      ))}
    </div>
  )
}

// ── The scaled canvas ────────────────────────────────────────────────────────

export interface StageProps {
  /** Virtual canvas, in true dashboard pixels. */
  width: number
  height: number
  /**
   * Below this the type stops reading as type, so the canvas is cropped from
   * the right instead of shrunk further — the left column stays legible.
   */
  minScale?: number
  /** Cursor waypoints in virtual px, or none for a still replica. */
  path?: [number, number][]
  /**
   * How long the current scene lasts. The cursor used to be hardcoded to a
   * 6-second lap regardless, so on the 7s Analyst scene it finished its path
   * and then sat perfectly still for a second — the one thing these cursors are
   * never allowed to do.
   */
  durationMs?: number
  /**
   * Ken Burns push, as a fraction. The frame creeps in over the scene and
   * resets on the cut, which is what makes a sequence of screens read as footage
   * rather than as a slideshow. 0 disables it.
   */
  zoom?: number
  /** Restarts the count-ups and the entry animation when it changes. */
  sceneKey: string
  children: React.ReactNode
}

/**
 * Draws its children at true dashboard scale and fits them to the width it is
 * given, then runs one rAF clock for the cursor and the count-ups.
 *
 * The clock stops when the replica scrolls out of view or the tab is hidden,
 * and never starts under prefers-reduced-motion — this used to hold 60fps while
 * you read the pricing table further down the page.
 */
export function Stage({
  width: W, height: H, minScale = 0.5, path, sceneKey,
  durationMs = 6000, zoom = 0.03, children,
}: StageProps) {
  const boxRef    = useRef<HTMLDivElement>(null)
  const stageRef  = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const zoomRef   = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  // Held in a ref so a new waypoint array on every render does not restart the
  // clock — the clock restarts on `sceneKey`, which is when the path changes.
  const pathRef = useRef(path)
  useEffect(() => { pathRef.current = path })
  // Where the pointer actually is, and where it was when the last scene ended.
  // A cut used to teleport it to the next path's first waypoint — measured at
  // 7,500 px/s across one frame. A real pointer does not jump when a tab
  // changes under it, so the new scene eases out of the old position instead.
  const atRef   = useRef<{ x: number; y: number } | null>(null)
  const fromRef = useRef<{ x: number; y: number } | null>(null)

  /**
   * Where the push comes from. Horizontally it follows the middle of this
   * scene's cursor path, so the frame drifts toward whatever is being worked on.
   *
   * Vertically it is pinned high on purpose. A centred origin pushes the top
   * edge out of frame — at 3% with the origin at mid-height that is 11px, and
   * the top bar's mark sits at y=10, so the logo lost its head on every scene.
   * Anchored near the top, the crop happens at the bottom instead, where the
   * content is already running past the edge of the frame.
   */
  const origin = useMemo(() => {
    if (!path || !path.length) return '50% 14%'
    const cx = path.reduce((a, [x]) => a + x, 0) / path.length
    const pct = Math.min(Math.max((cx / W) * 100, 22), 78)
    return `${pct.toFixed(1)}% 14%`
  }, [path, W])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const fit = () => {
      const w = box.getBoundingClientRect().width
      // Never upscale — a replica blown up past its true size goes soft.
      setScale(Math.min(Math.max(w / W, minScale), 1))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(box)
    return () => ro.disconnect()
  }, [W, minScale])

  // Count-ups restart with the scene; the cursor runs off the same clock.
  useEffect(() => {
    let raf = 0
    let start = 0
    // Runs before this scene's first frame, so it holds the previous scene's
    // final position.
    fromRef.current = atRef.current

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const age = now - start

      const pts = pathRef.current
      if (pts && cursorRef.current) {
        // One lap of the path per scene, looped rather than clamped so a long
        // scene never leaves the pointer parked at the last waypoint.
        const lap   = (age / durationMs) % 1
        const n     = pts.length
        const t     = splineAt(pts, paced(lap, n))
        const speed = pacedSpeed(lap, n)

        // Carry the pointer over the cut rather than snapping it.
        let p = t
        const blend = clamp01(age / 340)
        if (fromRef.current && blend < 1) {
          const e = blend * blend * (3 - 2 * blend)   // smoothstep
          p = {
            x: fromRef.current.x + (t.x - fromRef.current.x) * e,
            y: fromRef.current.y + (t.y - fromRef.current.y) * e,
          }
        }

        // Two tremors, both scaled by how slowly it is moving: a hand is
        // steadiest mid-travel and shakiest hovering over a target. Without the
        // fast one the drift reads as a float rather than as a hand.
        const shake = 1.35 / (0.55 + speed)
        const dx = Math.sin(now / 430) * 1.5 * shake + Math.sin(now / 97) * 0.32 * shake
        const dy = Math.cos(now / 480) * 1.2 * shake + Math.cos(now / 111) * 0.28 * shake
        // Hand over the *rendered* position, tremor included, so the seam at a
        // cut is exact rather than off by the tremor's current offset.
        atRef.current = { x: p.x + dx, y: p.y + dy }
        cursorRef.current.style.transform = `translate3d(${(p.x + dx).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0)`
      }

      // Ken Burns. Eased so the push is quickest just after the cut and settles
      // as the scene runs — a linear creep reads as a slow drift, not a move.
      if (zoomRef.current && zoom > 0) {
        const z = 1 + zoom * easeOutExpo(clamp01(age / (durationMs * 1.35)))
        zoomRef.current.style.transform = `scale(${z.toFixed(4)})`
      }

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
    }

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const run  = () => { if (!raf && !reduced) { start = performance.now(); raf = requestAnimationFrame(tick) } }
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0 } }

    // With motion off the figures still have to arrive at their real values,
    // or the replica advertises a dashboard of zeroes.
    if (reduced) {
      if (zoomRef.current) zoomRef.current.style.transform = 'none'
      stageRef.current?.querySelectorAll<HTMLElement>('[data-to]').forEach(el => {
        const to  = parseFloat(el.dataset.to || '0')
        const dec = parseInt(el.dataset.dec || '0')
        el.textContent =
          (el.dataset.pre || '') +
          (el.dataset.plain != null
            ? to.toFixed(dec)
            : to.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })) +
          (el.dataset.suf || '')
      })
    }

    const box = boxRef.current
    const io = box ? new IntersectionObserver(([e]) => (e.isIntersecting ? run() : stop()), { threshold: 0 }) : null
    if (io && box) io.observe(box); else run()
    const onVis = () => (document.hidden ? stop() : run())
    document.addEventListener('visibilitychange', onVis)

    return () => { stop(); io?.disconnect(); document.removeEventListener('visibilitychange', onVis) }
  }, [sceneKey, durationMs, zoom])

  return (
    // The scaled canvas does not affect layout height, so the frame has to be
    // told how tall the result is.
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
        {/*
          The Ken Burns layer. The pointer lives inside it so it stays over the
          content it is pointing at as the frame pushes in, and the origin sits
          on the centre of this scene's path — so the push drifts toward
          whatever the cursor is working on rather than always the middle.
        */}
        <div
          ref={zoomRef}
          style={{
            flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            transformOrigin: origin, willChange: zoom > 0 ? 'transform' : undefined,
          }}
        >
          {children}

          {path && (
            // The pointer. Drawn, not a real cursor, so it can be styled.
            <div ref={cursorRef} style={{ position: 'absolute', top: 0, left: 0, zIndex: 40, pointerEvents: 'none', willChange: 'transform' }}>
              <svg width="17" height="22" viewBox="0 0 17 22" fill="none" aria-hidden="true">
                <path d="M1 1 L1 15.5 L4.8 11.6 L7.4 18.6 L10.1 17.5 L7.5 10.6 L13.2 10.6 Z"
                  fill="#fff" stroke="rgba(0,0,0,0.55)" strokeWidth="1" strokeLinejoin="round" />
              </svg>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── The caption strip ────────────────────────────────────────────────────────

/**
 * What each scene is actually showing.
 *
 * Without these a hero cycles tabs and a visitor watches competent motion
 * without ever being able to say what the product does. Keyed by tab label so
 * the desktop and portrait replicas cannot drift into telling different
 * stories about the same screen.
 */
export const SCENE_CAPTIONS: Record<string, string> = {
  Home:    'Everything in one place — and not one number typed in by hand.',
  Trading: 'Every fill pulled from MetaTrader the moment it closes.',
  Journal: 'Why you took it, not just what it paid.',
  Copy:    'One account trades. The others follow, in under two seconds.',
  Analyst: 'Ask it why you lose on gold. It answers from your own fills.',
}

/**
 * One line under the replica, plus a dot per scene.
 *
 * Under prefers-reduced-motion the animation never starts, so `active` would
 * sit on the first scene for ever and this would show one line of five. In that
 * case it lists them all instead — the information is the point, the cycling is
 * not.
 */
export function SceneCaption({ scenes, active }: { scenes: readonly string[]; active: string }) {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener?.('change', apply)
    return () => mq.removeEventListener?.('change', apply)
  }, [])

  if (reduced) {
    return (
      <ul style={{
        listStyle: 'none', margin: 0, padding: '16px clamp(12px, 3vw, 24px)',
        display: 'flex', flexDirection: 'column', gap: '7px',
        borderTop: `1px solid ${LINE}`,
      }}>
        {scenes.map(s => (
          <li key={s} style={{
            color: INK2, fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)', lineHeight: 1.55,
          }}>
            {SCENE_CAPTIONS[s]}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2vw, 18px)',
      padding: '14px clamp(12px, 3vw, 24px)',
      borderTop: `1px solid ${LINE}`,
      minHeight: '56px', boxSizing: 'border-box',
    }}>
      <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }} aria-hidden="true">
        {scenes.map(s => (
          <span key={s} style={{
            width: '5px', height: '5px', borderRadius: '50%',
            background: s === active ? INK1 : 'var(--color-line-2)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      {/* Keyed so each line fades in on its own rather than cross-fading into
          a half-legible blend of two sentences. */}
      <p key={active} className="vq-caption" style={{
        margin: 0, color: INK2,
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
        lineHeight: 1.5, minWidth: 0,
      }}>
        {SCENE_CAPTIONS[active]}
      </p>
      <style>{`
        .vq-caption { animation: vqCapIn 0.4s cubic-bezier(0.16,1,0.3,1) }
        @keyframes vqCapIn { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
        @media (prefers-reduced-motion: reduce) { .vq-caption { animation: none } }
      `}</style>
    </div>
  )
}

// ── The live chart ───────────────────────────────────────────────────────────

/**
 * The Trading tab's chart, as a frame of the real thing.
 *
 * Every replica used to draw this panel's candles from a seeded random walk,
 * and it looked exactly like what it was — uniform bar widths, no volume, no
 * price axis, a price that belonged to no instrument. It was the one element on
 * the hero a trader would clock as fake in a second, which is a bad thing for
 * the element whose whole job is "this is a real terminal".
 *
 * So this is a capture of the **real TradingView widget inside VELQUOR's own
 * Trading tab** — the same official embed the product ships
 * (`components/widgets/TradingViewWidget.tsx`), real NAS100 5-minute data, real
 * volume pane, real price axis, TradingView's own mark and attribution left in
 * frame. It is the product's actual screen, not a drawing of it.
 *
 * Why a still and not a clip: the live widget cannot run here — it only loads
 * after `vq-cookie-consent` is `'all'`, and a first-time visitor meets the hero
 * long before they meet the cookie banner, so the panel would advertise a
 * consent placeholder. A recording was the alternative, but it was captured on
 * a Saturday with the market shut: 29 seconds of footage moved 0.03% of its
 * pixels. That is a 500 kB video of a still image. This is 82 kB and sharper.
 * Re-shoot on a weekday if the panel should ever actually tick.
 *
 * `cover` + right alignment means a narrower panel shows *fewer, most recent*
 * candles at native scale with the price axis intact — which is what a real
 * chart does in a narrow window — rather than squashing the whole series.
 *
 * The frame is cropped to the **plot area only**. TradingView's toolbar and its
 * O/H/L/C line are left-aligned, so on a narrow panel they cropped away and left
 * an empty band above the candles. The quote line is drawn below instead, in our
 * own type, carrying the same figures the capture shows — and the attribution
 * goes with it, since TradingView's own mark sits bottom-left of the plot and
 * would be cropped off on a phone.
 */
export const CHART_QUOTE = {
  symbol: 'US Nas 100 · 5 · OANDA',
  o: '28,233.2', h: '28,233.2', l: '28,183.7', c: '28,191.8',
  chg: '−41.6 (−0.15%)',
}

export function LiveChartShot({ radius }: { radius?: string }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, overflow: 'hidden', background: VOID,
      borderRadius: radius, display: 'flex',
    }}>
      {/* Deliberately a plain <img>, not next/image: this asset is already a
          hand-encoded WebP at exactly the size the largest surface needs
          (2814px for a 1416px panel at 2x). Routing it through the optimizer
          would re-encode an optimal file and bill image-optimization units for
          the privilege. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/tv-nas100-m5.webp"
        decoding="async"
        alt="NAS100 five-minute chart in the VELQUOR trading tab"
        draggable={false}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: '100% 50%',
          display: 'block', userSelect: 'none',
        }}
      />
    </div>
  )
}

/** "Chart by TradingView" — their attribution, and the app shows it too. */
export function ChartAttribution({ size = 9 }: { size?: number }) {
  return (
    <div style={{
      ...label, fontSize: `${size}px`, letterSpacing: '0.1em',
      color: INK4, textAlign: 'center', padding: '4px 0 6px', flexShrink: 0,
    }}>
      Chart by TradingView
    </div>
  )
}
