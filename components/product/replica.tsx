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

import { useEffect, useRef, useState } from 'react'
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

export function Panel({ title, action, children, style }: {
  title?: string; action?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties
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
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
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
export function Stage({ width: W, height: H, minScale = 0.5, path, sceneKey, children }: StageProps) {
  const boxRef    = useRef<HTMLDivElement>(null)
  const stageRef  = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  // Held in a ref so a new waypoint array on every render does not restart the
  // clock — the clock restarts on `sceneKey`, which is when the path changes.
  const pathRef = useRef(path)
  useEffect(() => { pathRef.current = path })

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

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const age = now - start

      const pts = pathRef.current
      if (pts && cursorRef.current) {
        // A slow drift on top of the spline, so it is never perfectly still
        // even at a waypoint.
        const p  = splineAt(pts, clamp01(age / 6000))
        const dx = Math.sin(now / 430) * 1.6
        const dy = Math.cos(now / 480) * 1.3
        cursorRef.current.style.transform = `translate3d(${(p.x + dx).toFixed(1)}px, ${(p.y + dy).toFixed(1)}px, 0)`
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
  }, [sceneKey])

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
  )
}
