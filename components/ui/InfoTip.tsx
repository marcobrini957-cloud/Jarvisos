'use client'

import { useState, useRef, useEffect, useCallback, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ── InfoTip ───────────────────────────────────────────────────────────────────
// Small "eye" button (top-right of a card/box). Click → a quick plain-English
// popover explaining what that chart or metric is telling you.
//
// The popover is rendered in a portal on <body> with fixed positioning, so it is
// never clipped by a parent's `overflow: hidden`. It opens ABOVE the eye by
// default (so it doesn't cover the card's own numbers) and flips below only when
// there isn't room above. Closes on outside-click or Escape.

export function InfoTip({ text, title }: { text: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState<{ left: number; top?: number; bottom?: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const reposition = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const W = Math.min(240, window.innerWidth - 24)
    let left = r.right - W          // right-align the popover to the eye
    if (left < 12) left = 12
    if (left + W > window.innerWidth - 12) left = window.innerWidth - 12 - W
    // Prefer opening above the eye so the card's data stays visible.
    if (r.top > 170) {
      setPos({ left, bottom: window.innerHeight - r.top + 8 })
    } else {
      setPos({ left, top: r.bottom + 8 })
    }
  }, [])

  useEffect(() => {
    if (!open) return
    reposition()
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [open, reposition])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="What is this?"
        title="What is this?"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
          background: open ? 'var(--ac)' : 'var(--s3)',
          border: '1px solid var(--bd2)', padding: 0, flexShrink: 0,
          transition: 'background 0.12s',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--s2)' }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'var(--s3)' }}
      >
        {/* eye icon */}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
          stroke={open ? '#fff' : 'var(--t3)'} strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={popRef}
          role="tooltip"
          style={{
            position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom,
            zIndex: 1000, width: 'min(240px, calc(100vw - 24px))',
            padding: '12px 14px', borderRadius: '10px',
            background: 'var(--s1)', border: '1px solid var(--bd2)',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
            textAlign: 'left',
          }}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{title}</p>
          )}
          <p style={{ color: 'var(--t2)', fontSize: '11.5px', lineHeight: 1.55 }}>{text}</p>
        </div>,
        document.body,
      )}
    </>
  )
}
