'use client'

import { useEffect, useRef } from 'react'
import Icon from '@/components/ui/Icon'
import { Label } from '@/components/ui/vq'
import { TABS } from './tabs'

/**
 * Mobile navigation — a sheet that comes down from the top bar.
 *
 * It replaced a fixed bottom bar. That bar cost 65px of an 844px screen on
 * every single view, sat under the iOS home indicator, and still only reached
 * four of the ten sections — its fifth button opened a drawer for the rest, so
 * half the product was two taps away behind a control that looked like a
 * destination. Navigation is now one button in the top bar, beside the name of
 * wherever you already are, and every section is one tap from it.
 */

interface Props {
  open:             boolean
  onClose:          () => void
  activeTab:        number
  onTabChange:      (id: number) => void
  showSettings:     boolean
  onSettingsToggle: () => void
}

export default function MobileNav({
  open, onClose, activeTab, onTabChange, showSettings, onSettingsToggle,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const touchY   = useRef<number | null>(null)

  // Escape closes, and the page behind must not scroll while the sheet is up —
  // otherwise dismissing it leaves you somewhere you never navigated to.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  // Move focus into the sheet so the first target is reachable, and so screen
  // readers announce the menu instead of staying on the page behind it.
  useEffect(() => {
    if (open) sheetRef.current?.focus()
  }, [open])

  function select(id: number) {
    onTabChange(id)
    onClose()
  }

  // Swipe up dismisses — back the way it came.
  function onTouchStart(e: React.TouchEvent) { touchY.current = e.touches[0].clientY }
  function onTouchMove(e: React.TouchEvent) {
    if (touchY.current === null) return
    if (touchY.current - e.touches[0].clientY > 55) { touchY.current = null; onClose() }
  }

  const itemBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '12px',
    width: '100%', textAlign: 'left', padding: '11px 10px',
    borderRadius: 'var(--radius-sm)',
    border: 'none', borderLeft: '2px solid transparent',
    cursor: 'pointer',
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Sheet — anchored under the top bar, slides down */}
      <div
        ref={sheetRef}
        id="vq-mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Sections"
        tabIndex={-1}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        style={{
          position: 'fixed', left: 0, right: 0,
          top: 'calc(48px + env(safe-area-inset-top))',
          maxHeight: 'calc(100dvh - 48px - env(safe-area-inset-top))',
          overflowY: 'auto',
          zIndex: 61,
          background: '#0A0A0A',
          borderBottom: '1px solid var(--color-line-2)',
          borderRadius: '0 0 var(--radius-xl) var(--radius-xl)',
          transform: open ? 'translateY(0)' : 'translateY(-102%)',
          // A translated-away sheet is still a fixed, hit-testable box. Without
          // this it sat invisibly over the top bar and swallowed taps on the
          // very button meant to open it.
          pointerEvents: open ? 'auto' : 'none',
          visibility: open ? 'visible' : 'hidden',
          transition: open
            ? 'transform 0.26s cubic-bezier(0.16,1,0.3,1)'
            : 'transform 0.26s cubic-bezier(0.16,1,0.3,1), visibility 0s linear 0.26s',
          outline: 'none',
        }}
      >
        <div style={{ padding: '10px 12px 6px' }}>
          <Label>Go to</Label>
        </div>

        <nav style={{ padding: '0 8px 4px' }}>
          {TABS.map(tab => {
            const isActive = !showSettings && activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => select(tab.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  ...itemBase,
                  // A lead bar marks the section you are in, so opening the menu
                  // says where you are as well as where you can go.
                  borderLeftColor: isActive ? 'var(--color-ink-1)' : 'transparent',
                  background: isActive ? 'var(--color-surface-2)' : 'transparent',
                  color: isActive ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
                }}
              >
                <Icon name={tab.icon} size={16} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: '1px', minWidth: 0 }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                    color: 'inherit', lineHeight: 1.2,
                  }}>
                    {tab.label}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                    color: 'var(--color-ink-4)', lineHeight: 1.3,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {tab.hint}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>

        <div style={{ height: '1px', background: 'var(--color-line-1)', margin: '4px 10px' }} />

        <div style={{ padding: '6px 8px calc(14px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={() => { onSettingsToggle(); onClose() }}
            aria-current={showSettings ? 'page' : undefined}
            style={{
              ...itemBase,
              borderLeftColor: showSettings ? 'var(--color-ink-1)' : 'transparent',
              background: showSettings ? 'var(--color-surface-2)' : 'transparent',
              color: showSettings ? 'var(--color-ink-1)' : 'var(--color-ink-2)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
            }}
          >
            <Icon name="settings" size={16} />
            Settings
          </button>
        </div>
      </div>
    </>
  )
}

/** The three-line button that opens the sheet. Lives in the top bar. */
export function MobileMenuButton({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="vq-mobile-menu"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '28px', flexShrink: 0,
        background: open ? 'var(--color-surface-2)' : 'transparent',
        border: '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-ink-1)',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
    >
      {/* Three lines that fold into a cross while the sheet is open, so the
          button reads as one control in both states rather than two. */}
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
        <line x1="2.5" y1="4.5" x2="13.5" y2="4.5"
          style={{
            transform: open ? 'translateY(3.5px) rotate(45deg)' : 'none',
            transformOrigin: 'center', transition: 'transform 0.2s ease',
          }} />
        <line x1="2.5" y1="8" x2="13.5" y2="8"
          style={{ opacity: open ? 0 : 1, transition: 'opacity 0.12s ease' }} />
        <line x1="2.5" y1="11.5" x2="13.5" y2="11.5"
          style={{
            transform: open ? 'translateY(-3.5px) rotate(-45deg)' : 'none',
            transformOrigin: 'center', transition: 'transform 0.2s ease',
          }} />
      </svg>
    </button>
  )
}
