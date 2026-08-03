'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { TABS } from './tabs'

/**
 * Search in the header.
 *
 * The reference this layout came from puts a search field top-right, and an
 * input that does nothing would be worse than no input at all — so this one is
 * real: it filters the sections and jumps to the one you pick. Enter takes the
 * first match, ⌘K / Ctrl-K focuses it from anywhere, Escape closes.
 *
 * It switches tabs through the `vq-switch-tab` event the shell already listens
 * for, so it needs no wiring into DashboardShell and cannot fall out of step
 * with the sidebar.
 */
export function QuickSearch() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const matches = q.trim()
    ? TABS.filter(t =>
        t.label.toLowerCase().includes(q.trim().toLowerCase()) ||
        t.hint.toLowerCase().includes(q.trim().toLowerCase()))
    : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  function go(id: number) {
    window.dispatchEvent(new CustomEvent('vq-switch-tab', { detail: id }))
    setQ(''); setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div ref={boxRef} className="vq-search" style={{ position: 'relative', minWidth: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 11px', borderRadius: '999px',
        background: 'var(--color-surface-1)',
        border: `1px solid ${open ? 'var(--color-line-3)' : 'var(--color-line-1)'}`,
        transition: 'border-color 0.14s',
      }}>
        <span style={{ display: 'flex', color: 'var(--color-ink-4)', flexShrink: 0 }}>
          <Icon name="search" size={14} />
        </span>
        <input
          ref={inputRef}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === 'Enter' && matches[0]) go(matches[0].id) }}
          placeholder="Search sections"
          aria-label="Search sections"
          style={{
            width: '150px', minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--color-ink-1)', fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)', padding: 0,
          }}
        />
      </div>

      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 7px)', right: 0, zIndex: 60,
          width: 'max(240px, 100%)',
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-line-1)',
          borderRadius: '12px', padding: '6px',
          boxShadow: '0 24px 50px -20px rgba(0,0,0,0.85)',
        }}>
          {matches.map(m => (
            <button
              key={m.id}
              onClick={() => go(m.id)}
              className="vq-side-item"
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                background: 'transparent', border: 'none', textAlign: 'left',
                color: 'var(--color-ink-2)', fontFamily: 'var(--font-display)',
                fontSize: 'var(--text-base)',
              }}
            >
              <Icon name={m.icon} size={15} />
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 1100px) { .vq-search { display: none; } }
      `}</style>
    </div>
  )
}
