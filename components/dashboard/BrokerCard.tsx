'use client'

import {
  IconRosetteDiscountCheckFilled, IconFlag3Filled, IconUserFilled,
  IconStarFilled, IconExternalLink,
} from '@tabler/icons-react'
import type { Partner } from '@/lib/partners'
import { ratingLabel } from '@/lib/partners'

// Big TradingView-broker-directory-style offer card. Featured partners get a
// gradient wash + "FEATURED" ribbon. All clicks route through /api/go/[id].
export default function BrokerCard({ partner }: { partner: Partner }) {
  // The brand colour survives on the logo tile only — a featured offer used to
  // wash the whole card in it.
  const accent = partner.accent ?? 'var(--color-ink-2)'
  const initials = partner.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-line-1)',
        borderLeft: partner.featured ? '2px solid var(--color-line-3)' : undefined,
        background: 'var(--color-surface-1)',
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: '18px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-line-3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line-1)' }}
    >
      {partner.featured && (
        <span style={{
          position: 'absolute', top: '14px', right: '14px',
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
          color: 'var(--color-ink-2)', background: 'var(--color-surface-2)',
          borderRadius: 'var(--radius-xs)', padding: '2px 6px',
        }}>
          Featured
        </span>
      )}

      {/* ── Left: details ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-ink-1)' }}>
            {partner.name}
          </span>
          {partner.plan && <Chip>{partner.plan}</Chip>}
          {partner.award && <Chip>{partner.award}</Chip>}
        </div>

        {/* Tradable assets */}
        <div style={{ fontSize: 'var(--text-base)', color: 'var(--t3)', marginBottom: '14px' }}>
          Tradable assets: {partner.assets}
        </div>

        {/* Rating + stats row */}
        {partner.rating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 34px)', flexWrap: 'wrap', marginBottom: partner.promo ? '14px' : '18px' }}>
            {/* rating block */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="vq-num" style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--t1)' }}>{partner.rating.toFixed(1)}</span>
                <span style={{ fontSize: 'var(--text-base)', color: 'var(--t2)' }}>· {ratingLabel(partner.rating)}</span>
                <IconRosetteDiscountCheckFilled size={16} style={{ color: '#FFFFFF' }} />
              </div>
              <Stars rating={partner.rating} />
            </div>
            {/* reviews */}
            {partner.reviews && (
              <Stat icon={<IconFlag3Filled size={14} />} value={partner.reviews} label="Reviews" />
            )}
            {/* accounts */}
            {partner.accounts && (
              <Stat icon={<IconUserFilled size={14} />} value={partner.accounts} label="Accounts" />
            )}
          </div>
        )}

        {/* Promotion */}
        {partner.promo && (
          <div style={{ marginBottom: '18px' }}>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--t1)' }}>{partner.promo}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', letterSpacing: '0.02em' }}>Promotion</div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href={`/api/go/${partner.id}?slot=tab`}
            target="_blank" rel="sponsored noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'var(--color-ink-1)', color: 'var(--color-void)',
              fontSize: 'var(--text-base)', textDecoration: 'none',
              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
            }}
          >
            {partner.ctaLabel}
            <IconExternalLink size={15} stroke={2.2} />
          </a>
          <a
            href={`/api/go/${partner.id}?slot=learn`}
            target="_blank" rel="sponsored noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'transparent', color: 'var(--color-ink-1)',
              fontSize: 'var(--text-base)', textDecoration: 'none',
              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-line-1)',
            }}
          >
            Learn more
          </a>
        </div>
      </div>

      {/* ── Right: 3D stacked logo ─────────────────────────────── */}
      <StackedLogo accent={accent} initials={initials} logo={partner.logo} />
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--color-ink-2)', background: 'var(--color-surface-2)',
      borderRadius: 'var(--radius-xs)', padding: '2px 6px',
    }}>
      {children}
    </span>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--t1)' }}>
        <span style={{ color: 'var(--t3)' }}>{icon}</span>{value}
      </span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>{label}</span>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <div style={{ position: 'relative', display: 'inline-flex', gap: '2px', marginTop: '3px' }}>
      {/* base (muted) */}
      {[0, 1, 2, 3, 4].map(i => <IconStarFilled key={i} size={13} style={{ color: 'var(--s3)' }} />)}
      {/* filled overlay clipped to pct */}
      <div style={{ position: 'absolute', top: 0, left: 0, display: 'inline-flex', gap: '2px', width: `${pct}%`, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {[0, 1, 2, 3, 4].map(i => <IconStarFilled key={i} size={13} style={{ color: '#FFFFFF', flexShrink: 0 }} />)}
      </div>
    </div>
  )
}

function StackedLogo({ accent, initials, logo }: { accent: string; initials: string; logo?: string }) {
  // Was three offset layers at 28/55/100% opacity — a 3D card stack. One tile is
  // enough: the logo is identification, not an illustration.
  const size = 64
  return (
    <div className="hidden sm:flex" style={{
      width: `${size}px`, height: `${size}px`, flexShrink: 0,
      borderRadius: 'var(--radius-md)', background: accent,
      alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {logo
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={logo} alt="" style={{ width: '62%', height: '62%', objectFit: 'contain' }} />
        : <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-void)' }}>{initials}</span>}
    </div>
  )
}
