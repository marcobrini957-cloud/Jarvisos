'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/ui/Icon'
import { TOUR_STEPS, type TourStep } from './steps'

/**
 * The first-run walkthrough.
 *
 * A new account meets ten tabs, none of which have any data in them yet, and
 * nothing says which one matters or in what order. The /onboarding wizard
 * covers setup; this covers the product.
 *
 * It drives the real dashboard rather than describing it — each step switches
 * to the actual tab and spotlights the actual element, so what you are told
 * about is the thing in front of you. The dimming is one element with an
 * enormous `box-shadow` spread: the "hole" is just an unfilled div, which keeps
 * the cut-out crisp at any size without an SVG mask or four positioned panes.
 *
 * Rendered through a portal at the document root. A fixed-position overlay
 * inside the tab wrapper is the bug that put the annotation modal 1600px below
 * the viewport — see `.vq-tab-in` in globals.css.
 */

const PAD = 8          // breathing room around the spotlit element
const CARD_W = 340
const GAP = 14         // between the hole and the card

interface Rect { top: number; left: number; width: number; height: number }

export default function ProductTour({
  onFinish,
  isEmptyAccount,
}: {
  onFinish: (completed: boolean) => void
  isEmptyAccount: boolean
}) {
  const steps = TOUR_STEPS.filter(s => !s.onlyWhenEmpty || isEmptyAccount)

  const [i, setI] = useState(0)
  // The measurement carries the step it belongs to, so "have we measured THIS
  // step yet" is derived rather than a second piece of state that has to be
  // reset in lockstep — which is what made the transition animate from the
  // previous element's position.
  const [measured, setMeasured] = useState<{ step: number; rect: Rect | null } | null>(null)
  const step: TourStep | undefined = steps[i]
  const ready = measured?.step === i
  const rect  = ready ? measured!.rect : null
  const liveRegion = useRef<HTMLDivElement>(null)

  // Switch to the step's tab, then find its anchor. The tab content remounts on
  // change, so the element cannot be measured until React has painted it —
  // hence the double rAF rather than a fixed timeout.
  useEffect(() => {
    if (!step) return
    let cancelled = false

    if (step.tab !== undefined) {
      window.dispatchEvent(new CustomEvent('vq-switch-tab', { detail: step.tab }))
    }

    const find = (attempt = 0) => {
      if (cancelled) return
      if (!step.anchor) { setMeasured({ step: i, rect: null }); return }

      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (!el) {
        // Give the tab a few frames to mount before giving up. A missing anchor
        // is not fatal: the step still shows, just centred.
        if (attempt < 20) { requestAnimationFrame(() => find(attempt + 1)); return }
        setMeasured({ step: i, rect: null }); return
      }

      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      // Let the smooth scroll settle before measuring, or the hole lands where
      // the element used to be.
      setTimeout(() => {
        if (cancelled) return
        const r = el.getBoundingClientRect()
        setMeasured({ step: i, rect: { top: r.top, left: r.left, width: r.width, height: r.height } })
      }, 320)
    }

    requestAnimationFrame(() => requestAnimationFrame(() => find()))
    return () => { cancelled = true }
  }, [i, step])

  // Keep the hole on the element if the window changes underneath it.
  useEffect(() => {
    if (!step?.anchor) return
    const remeasure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
      if (!el) return
      const r = el.getBoundingClientRect()
      setMeasured({ step: i, rect: { top: r.top, left: r.left, width: r.width, height: r.height } })
    }
    window.addEventListener('resize', remeasure)
    return () => window.removeEventListener('resize', remeasure)
  }, [step, i])

  const next = useCallback(() => {
    if (i + 1 >= steps.length) onFinish(true)
    else setI(v => v + 1)
  }, [i, steps.length, onFinish])

  const back = useCallback(() => setI(v => Math.max(0, v - 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { e.preventDefault(); onFinish(false) }
      if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); next() }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); back() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [next, back, onFinish])

  // Announce each step for anyone on a screen reader — the spotlight is a
  // purely visual cue and carries none of this on its own.
  useEffect(() => {
    if (liveRegion.current && step) {
      liveRegion.current.textContent = `Step ${i + 1} of ${steps.length}. ${step.title}.`
    }
  }, [i, step, steps.length])

  if (!step || typeof document === 'undefined') return null

  const body = isEmptyAccount && step.emptyBody ? step.emptyBody : step.body
  const isLast = i + 1 >= steps.length

  // Card placement: below the hole when there is room, above when there is not,
  // centred when there is no hole at all. On a phone it sits at the bottom
  // regardless — there is never room beside a spotlit element at 390px.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const mobile = vw < 640

  let cardStyle: React.CSSProperties
  if (mobile) {
    cardStyle = { left: 12, right: 12, bottom: 16, width: 'auto' }
  } else if (!rect) {
    cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: CARD_W }
  } else {
    const below = rect.top + rect.height + PAD + GAP
    const fitsBelow = below + 230 < vh
    const left = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw - CARD_W - 12)
    cardStyle = fitsBelow
      ? { top: below, left, width: CARD_W }
      : { top: Math.max(12, rect.top - PAD - GAP - 230), left, width: CARD_W }
  }

  return createPortal(
    <div
      role="dialog"
      aria-label="Product tour"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, pointerEvents: 'none' }}
    >
      <div ref={liveRegion} aria-live="polite" style={{
        position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)',
      }} />

      {/* The dimming. One div, one very large shadow spread — the cut-out is
          the element's own box, so it stays exact at any size. */}
      <div
        onClick={() => onFinish(false)}
        style={{
          position: 'absolute',
          pointerEvents: 'auto',
          transition: ready ? 'top 0.28s cubic-bezier(0.16,1,0.3,1), left 0.28s cubic-bezier(0.16,1,0.3,1), width 0.28s, height 0.28s' : 'none',
          ...(rect
            ? {
                top: rect.top - PAD, left: rect.left - PAD,
                width: rect.width + PAD * 2, height: rect.height + PAD * 2,
                borderRadius: 'var(--radius-md)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
                border: '1.5px solid rgba(255,255,255,0.55)',
              }
            : {
                top: '50%', left: '50%', width: 0, height: 0,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.72)',
              }),
        }}
      />

      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', pointerEvents: 'auto',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          boxSizing: 'border-box',
          transition: 'top 0.28s cubic-bezier(0.16,1,0.3,1), left 0.28s cubic-bezier(0.16,1,0.3,1)',
          ...cardStyle,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.14em', color: 'var(--color-ink-3)',
          }}>
            {i + 1} / {steps.length}
          </span>
          <button
            onClick={() => onFinish(false)}
            aria-label="Close tour"
            style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', padding: 2 }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        <h2 style={{
          margin: '0 0 7px', color: 'var(--color-ink-1)',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700,
          letterSpacing: '-0.01em',
        }}>
          {step.title}
        </h2>
        <p style={{
          margin: 0, color: 'var(--color-ink-2)',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', lineHeight: 1.62,
        }}>
          {body}
        </p>

        {/* Progress: a step count alone does not show how far in you are. */}
        <div style={{ display: 'flex', gap: '3px', margin: '15px 0 13px' }}>
          {steps.map((s, n) => (
            <div key={s.id} style={{
              flex: 1, height: '2px', borderRadius: '1px',
              background: n <= i ? 'var(--color-ink-1)' : 'var(--color-line-1)',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            onClick={() => onFinish(false)}
            style={{
              background: 'none', border: 'none', padding: '6px 0',
              color: 'var(--color-ink-3)', fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)', cursor: 'pointer',
            }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {i > 0 && (
              <button
                onClick={back}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'transparent', border: '1px solid var(--color-line-1)',
                  color: 'var(--color-ink-2)', fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)', cursor: 'pointer',
                }}
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              autoFocus
              style={{
                padding: '8px 18px', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-ink-1)', border: 'none',
                color: 'var(--color-void)', fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {isLast ? 'Start trading' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
