'use client'

import { useCallback, useEffect } from 'react'
import Icon from '@/components/ui/Icon'
import { Label } from '@/components/ui/vq'

/**
 * Chart captures, viewed without leaving the page.
 *
 * They used to be `<a target="_blank">`: clicking the entry chart on a trade
 * threw you into a browser tab holding a bare image on a white background, with
 * the trade you were reading now behind a tab switch. On a phone that is worse
 * again — a new tab is a context you have to navigate back out of.
 *
 * ScreenshotGallery already had a lightbox; the trade modal simply never used
 * it. This is that idea as one component, so there is one way to look at an
 * image in this product.
 *
 * Escape and the backdrop close it. Arrow keys move between shots, because a
 * trade has an entry and an exit and comparing them is the entire point.
 */
export interface LightboxShot {
  url:   string
  label: string
  /** Optional line under the image — symbol, time, whatever names it. */
  meta?: string
}

export function ImageLightbox({ shots, index, onIndex, onClose }: {
  shots:   LightboxShot[]
  index:   number
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const count = shots.length
  const step = useCallback((d: number) => {
    if (count > 1) onIndex((index + d + count) % count)
  }, [count, index, onIndex])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { e.stopPropagation(); onClose() }
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft')  step(-1)
    }
    // Capture: this sits on top of a modal that also closes on Escape, and the
    // one in front should be the one that answers.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [step, onClose])

  const shot = shots[index]
  if (!shot) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1200,
        background: 'rgba(0,0,0,0.86)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '14px', padding: 'clamp(16px, 4vw, 48px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '100%', maxHeight: '100%' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <Label>{shot.label}</Label>
            {shot.meta && (
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)',
                color: 'var(--color-ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {shot.meta}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 30, height: 30, borderRadius: '999px', flexShrink: 0,
              background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
              color: 'var(--color-ink-1)', cursor: 'pointer',
            }}
          >
            <Icon name="close" size={13} />
          </button>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={shot.url}
          alt={shot.label}
          style={{
            maxWidth: '100%', maxHeight: '74vh', objectFit: 'contain',
            borderRadius: 'var(--radius-card)', border: '1px solid var(--color-line-1)',
            display: 'block',
          }}
        />

        {count > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {shots.map((s, i) => (
              <button
                key={s.label + i}
                onClick={() => onIndex(i)}
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  padding: '4px 12px', borderRadius: '999px', cursor: 'pointer',
                  border: '1px solid transparent',
                  background: i === index ? 'var(--color-ink-1)' : 'var(--color-surface-2)',
                  color:      i === index ? 'var(--color-void)' : 'var(--color-ink-3)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
