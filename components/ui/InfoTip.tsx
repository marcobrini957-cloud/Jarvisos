'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'

// ── InfoTip ───────────────────────────────────────────────────────────────────
// Small "eye" button (top-right of a card/box). Click → a quick plain-English
// popover explaining what that chart or metric is telling you. Closes on outside
// click or Escape.

export function InfoTip({ text, title }: { text: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0, lineHeight: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-label="What is this?"
        title="What is this?"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer',
          background: open ? 'var(--ac)' : 'var(--s3)',
          border: '1px solid var(--bd2)', padding: 0,
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

      {open && (
        <div
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 30,
            width: '230px', maxWidth: 'calc(100vw - 32px)',
            padding: '11px 13px', borderRadius: '10px',
            background: 'var(--s1)', border: '1px solid var(--bd2)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            textAlign: 'left', cursor: 'default',
          }}
          onClick={e => e.stopPropagation()}
        >
          {title && (
            <p style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>{title}</p>
          )}
          <p style={{ color: 'var(--t3)', fontSize: '11px', lineHeight: 1.55 }}>{text}</p>
        </div>
      )}
    </div>
  )
}
