'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/ui/Icon'
import { Surface, Button } from '@/components/ui/vq'

/**
 * The one thing about this product that genuinely starts from the next trade.
 *
 * Connecting brings the whole history with it, so nothing else needs
 * explaining — but chart captures are taken *as a position opens and closes*,
 * which means the trades already in the account will never have one. Without a
 * sentence saying so, the gallery looks broken for everyone whose history
 * arrived before they signed up.
 *
 * Said once, then never again. It is a fact about how the feature works, not a
 * task, so it gets a line and a dismiss — no checklist, no progress, nothing to
 * come back to.
 */

const SEEN_KEY = 'vq-capture-notice-seen'

export function CaptureNotice({ hasTrades, hasShots }: { hasTrades: boolean; hasShots: boolean }) {
  const [seen, setSeen] = useState(true)   // never flash before localStorage is read

  useEffect(() => { setSeen(localStorage.getItem(SEEN_KEY) === '1') }, [])

  // Nothing to say to an account with no history yet, and nothing to say once
  // the first capture has landed — at that point the feature explains itself.
  if (seen || !hasTrades || hasShots) return null

  return (
    <Surface padded>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ color: 'var(--color-ink-3)', marginTop: '2px', flexShrink: 0, display: 'flex' }}>
          <Icon name="camera" size={16} />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)' }}>
            Chart captures start with your next trade
          </div>
          <div style={{
            marginTop: '3px', maxWidth: '68ch',
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
            color: 'var(--color-ink-3)', lineHeight: 1.5,
          }}>
            Your history came across in full, but a chart image can only be taken while a
            position is open. From your next one, VELQUOR saves the chart as you enter and
            again as you exit, and attaches both to the trade.
          </div>
        </div>
        <Button
          size="sm" variant="ghost" style={{ flexShrink: 0 }}
          onClick={() => { localStorage.setItem(SEEN_KEY, '1'); setSeen(true) }}
        >
          Got it
        </Button>
      </div>
    </Surface>
  )
}
