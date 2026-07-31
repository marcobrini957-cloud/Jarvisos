'use client'

import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Icon from '@/components/ui/Icon'
import { Label, Segmented } from '@/components/ui/vq'
import { tabLabel } from './tabs'
import { getCookieConsent, onConsentChange } from '@/components/CookieConsent'

/**
 * Tell Marco something is wrong, without leaving the screen it happened on.
 *
 * The whole beta rests on five people bothering to report things. An address
 * buried in the privacy policy is not a channel anyone uses mid-session, so
 * this is a button in the product — and it captures the tab, path and viewport
 * itself, because a tester will not think to mention any of that and those
 * three answer most "works for me" reports on their own.
 *
 * Rendered through a portal at the document root, deliberately: a fixed-position
 * modal inside the tab wrapper is exactly the bug that put the annotation modal
 * 1600px below the viewport (see .vq-tab-in in globals.css). Nothing about this
 * component should ever live inside a tab.
 */

type Kind = 'bug' | 'idea' | 'confusing' | 'praise'

const KINDS: { key: Kind; label: string }[] = [
  { key: 'bug',       label: 'Broken' },
  { key: 'confusing', label: 'Confusing' },
  { key: 'idea',      label: 'Idea' },
  { key: 'praise',    label: 'Good' },
]

const PROMPT: Record<Kind, string> = {
  bug:       'What did you do, and what happened instead?',
  confusing: 'What did you expect this to mean?',
  idea:      'What would you want it to do?',
  praise:    'What worked well? Worth knowing what to keep.',
}

export default function FeedbackButton({ activeTab, showSettings }: {
  activeTab: number
  showSettings: boolean
}) {
  const [open,    setOpen]    = useState(false)
  const [kind,    setKind]    = useState<Kind>('bug')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')
  // The cookie banner is a full-width fixed bar pinned to the same corner at
  // z-index 9999, so while it is up this button is both hidden behind it and
  // unclickable. Wait for the choice rather than fight it — a first-time user's
  // next action is the consent decision anyway. Consent lives in localStorage
  // plus a custom event, which is an external store; reading it in an effect
  // would render the button and then yank it away on the first paint.
  const consented = useSyncExternalStore(
    onConsentChange,
    () => getCookieConsent() !== null,
    () => false,               // server: assume not yet chosen
  )
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    areaRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function close() {
    setOpen(false)
    setError('')
    // Leave the text alone on close — a half-written report survives an
    // accidental Escape.
    if (sent) { setSent(false); setMessage('') }
  }

  async function send() {
    if (!message.trim() || sending) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          message,
          tab:      tabLabel(activeTab, showSettings),
          path:     window.location.pathname,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
        }),
      })
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? 'Could not send that.')
        return
      }
      setSent(true)
      setTimeout(close, 1800)
    } catch {
      setError('Could not reach VELQUOR — check your connection.')
    } finally {
      setSending(false)
    }
  }

  const trigger = (
    <button
      onClick={() => setOpen(true)}
      title="Report a problem or an idea"
      aria-label="Send feedback"
      style={{
        position: 'fixed', right: '16px', bottom: '16px', zIndex: 60,
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '8px 13px', borderRadius: '999px',
        background: 'var(--color-surface-2)',
        border: '1px solid var(--color-line-1)',
        color: 'var(--color-ink-2)',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
        cursor: 'pointer', transition: 'color 0.12s, border-color 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--color-ink-1)'
        e.currentTarget.style.borderColor = 'var(--color-line-2)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--color-ink-2)'
        e.currentTarget.style.borderColor = 'var(--color-line-1)'
      }}
    >
      <Icon name="mail" size={14} />
      <span className="vq-feedback-label">Feedback</span>
    </button>
  )

  const modal = open && (
    <div
      onClick={close}
      style={{
        position: 'fixed', inset: 0, zIndex: 70,
        // Matches the journal and annotation modals. --color-surface-1 is 4%
        // white, meant to sit on the void as a panel — floated over a dimmed
        // page it is see-through, and the card read as a ghost.
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Send feedback"
        style={{
          width: '100%', maxWidth: '430px',
          background: 'var(--s1)',
          border: '1px solid var(--bd2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}
      >
        {sent ? (
          <div style={{ padding: '18px 4px', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-up)', marginBottom: '10px' }}>
              <Icon name="check" size={22} />
            </div>
            <p style={{ margin: 0, color: 'var(--color-ink-1)', fontFamily: 'var(--font-display)' }}>
              Sent. Thank you — that genuinely helps.
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <Label>Send feedback</Label>
              <button
                onClick={close}
                aria-label="Close"
                style={{ background: 'none', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer', padding: '2px' }}
              >
                <Icon name="close" size={14} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <Segmented options={KINDS} value={kind} onChange={setKind} />
            </div>

            <textarea
              ref={areaRef}
              value={message}
              onChange={e => { setMessage(e.target.value); setError('') }}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send() }}
              placeholder={PROMPT[kind]}
              rows={5}
              maxLength={4000}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-line-1)',
                borderRadius: 'var(--radius-sm)',
                padding: '10px 12px',
                color: 'var(--color-ink-1)',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                outline: 'none', resize: 'vertical',
              }}
            />

            <p style={{
              margin: '9px 0 0', color: 'var(--color-ink-3)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)', lineHeight: 1.5,
            }}>
              Sent with the screen you are on ({tabLabel(activeTab, showSettings)}) and your window
              size, so it can be reproduced. Nothing else.
            </p>

            {error && (
              <p style={{ margin: '9px 0 0', color: 'var(--color-down)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
              <button
                onClick={close}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                  background: 'transparent', border: '1px solid var(--color-line-1)',
                  color: 'var(--color-ink-2)', fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending || !message.trim()}
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                  background: 'var(--color-ink-1)', border: 'none',
                  color: 'var(--color-void)', fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-base)',
                  cursor: sending || !message.trim() ? 'default' : 'pointer',
                  opacity: sending || !message.trim() ? 0.4 : 1,
                }}
              >
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (!consented) return null

  return (
    <>
      {trigger}
      {/* No mount guard needed: `open` starts false, so the portal is never
          reached during SSR or the first client render — nothing to mismatch. */}
      {modal && typeof document !== 'undefined' && createPortal(modal, document.body)}
    </>
  )
}
