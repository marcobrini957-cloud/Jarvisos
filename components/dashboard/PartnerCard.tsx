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
  const accent = partner.accent ?? 'var(--ac)'
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
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        textDecoration: 'none', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.15s, transform 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = `0 8px 24px ${accent}22`
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--bd)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* accent hairline top */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: accent, opacity: 0.7 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: compact ? '30px' : '38px', height: compact ? '30px' : '38px',
          borderRadius: '9px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${accent}1f`, color: accent,
          fontWeight: 700, fontSize: compact ? '12px' : '14px',
          overflow: 'hidden',
        }}>
          {partner.logo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={partner.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            : initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: compact ? '13px' : '14px', fontWeight: 700, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partner.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--t3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {partner.headline}
          </div>
        </div>
        {(partner.award ?? partner.plan) && (
          <span style={{
            flexShrink: 0, fontSize: '10px', fontWeight: 700, letterSpacing: '0.02em',
            padding: '3px 8px', borderRadius: '999px',
            background: `${accent}1f`, color: accent, whiteSpace: 'nowrap',
          }}>
            {partner.award ?? partner.plan}
          </span>
        )}
      </div>

      {!compact && (
        <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.55, color: 'var(--t2)' }}>
          {partner.blurb}
        </p>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginTop: 'auto' }}>
        <span style={{
          fontSize: '12px', fontWeight: 600, color: accent,
          display: 'inline-flex', alignItems: 'center', gap: '5px',
        }}>
          {partner.ctaLabel}
          <span aria-hidden style={{ fontSize: '13px' }}>→</span>
        </span>
        <span style={{ fontSize: '9.5px', color: 'var(--t3)', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Ad
        </span>
      </div>
    </a>
  )
}
