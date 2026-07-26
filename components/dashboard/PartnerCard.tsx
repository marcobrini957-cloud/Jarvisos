'use client'

import type { Partner } from '@/lib/partners'

// A single affiliate offer. All clicks route through /api/go/[id] so they're
// logged server-side; rel="sponsored noopener" keeps us honest with search
// engines and safe from tab-nabbing.
export default function PartnerCard({
  partner,
  slot = 'tab',
  compact = false,
}: {
  partner: Partner
  slot?: 'tab' | 'rail' | 'ad'
  compact?: boolean
}) {
  // A partner's brand colour belongs to their logo, not to our card: the tinted
  // borders, top rules and CTAs made every offer a different-coloured surface.
  const accent = partner.accent ?? 'var(--color-ink-2)'
  const initials = partner.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <a
      href={`/api/go/${partner.id}?slot=${slot}`}
      target="_blank"
      rel="sponsored noopener noreferrer"
      style={{
        display: 'flex', flexDirection: 'column', gap: compact ? '8px' : '12px',
        padding: compact ? '14px' : '18px',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
        borderRadius: 'var(--radius-md)',
        textDecoration: 'none', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-line-3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line-1)' }}
    >

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {partner.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={partner.logo}
            alt={`${partner.name} logo`}
            style={{
              height: compact ? '18px' : '22px', maxWidth: compact ? '92px' : '112px',
              objectFit: 'contain', objectPosition: 'left center', flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: compact ? '30px' : '38px', height: compact ? '30px' : '38px',
            borderRadius: 'var(--radius-sm)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: accent, color: 'var(--color-void)',
            fontFamily: 'var(--font-display)', fontSize: compact ? 'var(--text-base)' : 'var(--text-md)',
          }}>
            {initials}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partner.name}
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partner.headline}
          </div>
        </div>
        {partner.award && (
          <span style={{
            flexShrink: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '2px 6px', borderRadius: 'var(--radius-xs)',
            background: 'var(--color-surface-2)', color: 'var(--color-ink-2)', whiteSpace: 'nowrap',
          }}>
            {partner.award}
          </span>
        )}
      </div>

      {!compact && (
        <p style={{ margin: 0, fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--color-ink-2)' }}>
          {partner.blurb}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
        <span style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
          background: 'var(--color-action)', color: 'var(--color-action-ink)',
          padding: '5px 11px', borderRadius: 'var(--radius-sm)',
          display: 'inline-flex', alignItems: 'center', gap: '5px',
        }}>
          {partner.ctaLabel}
          <span aria-hidden>→</span>
        </span>
        <span className="vq-label">
          Ad
        </span>
      </div>
    </a>
  )
}
