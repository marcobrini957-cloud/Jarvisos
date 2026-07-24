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
  const accent = partner.accent ?? 'var(--ac)'
  const initials = partner.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '20px',
        border: '1px solid var(--bd2)',
        background: partner.featured
          ? `linear-gradient(105deg, ${accent}26 0%, rgba(122,79,255,0.10) 45%, var(--s1) 78%)`
          : 'var(--s1)',
        padding: 'clamp(20px, 3vw, 30px)',
        display: 'flex', alignItems: 'center', gap: '20px',
        transition: 'border-color 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {partner.featured && (
        <span style={{
          position: 'absolute', top: '16px', right: '16px',
          fontSize: '10px', fontWeight: 800, letterSpacing: '0.08em',
          color: 'var(--t1)', background: 'rgba(255,255,255,0.10)',
          border: '1px solid var(--bd2)', borderRadius: '7px', padding: '4px 9px',
        }}>
          FEATURED
        </span>
      )}

      {/* ── Left: details ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <span style={{ fontSize: 'clamp(18px, 2.4vw, 24px)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
            {partner.name}
          </span>
          {partner.plan && <Chip color="#3B82F6" bg="rgba(59,130,246,0.16)">{partner.plan}</Chip>}
          {partner.award && <Chip color="#E7B84B" bg="rgba(231,184,75,0.15)">{partner.award}</Chip>}
        </div>

        {/* Tradable assets */}
        <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '14px' }}>
          Tradable assets: {partner.assets}
        </div>

        {/* Rating + stats row */}
        {partner.rating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(16px, 3vw, 34px)', flexWrap: 'wrap', marginBottom: partner.promo ? '14px' : '18px' }}>
            {/* rating block */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: 'var(--t1)' }}>{partner.rating.toFixed(1)}</span>
                <span style={{ fontSize: '13px', color: 'var(--t2)' }}>· {ratingLabel(partner.rating)}</span>
                <IconRosetteDiscountCheckFilled size={16} style={{ color: '#3B82F6' }} />
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
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)' }}>{partner.promo}</div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', letterSpacing: '0.02em' }}>Promotion</div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <a
            href={`/api/go/${partner.id}?slot=tab`}
            target="_blank" rel="sponsored noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'var(--t1)', color: 'var(--bg)',
              fontSize: '13px', fontWeight: 700, textDecoration: 'none',
              padding: '10px 18px', borderRadius: '10px',
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
              background: 'transparent', color: 'var(--t1)',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              padding: '10px 18px', borderRadius: '10px',
              border: '1px solid var(--bd2)',
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

function Chip({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em',
      color, background: bg, borderRadius: '6px', padding: '3px 8px',
    }}>
      {children}
    </span>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: 700, color: 'var(--t1)' }}>
        <span style={{ color: 'var(--t3)' }}>{icon}</span>{value}
      </span>
      <span style={{ fontSize: '11px', color: 'var(--t3)' }}>{label}</span>
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
        {[0, 1, 2, 3, 4].map(i => <IconStarFilled key={i} size={13} style={{ color: '#E7B84B', flexShrink: 0 }} />)}
      </div>
    </div>
  )
}

function StackedLogo({ accent, initials, logo }: { accent: string; initials: string; logo?: string }) {
  const size = 96
  const layer = (offset: number, opacity: number, top = false): React.CSSProperties => ({
    position: 'absolute', width: `${size}px`, height: `${size}px`,
    right: `${offset}px`, top: `${offset}px`,
    borderRadius: '22px',
    background: top ? `linear-gradient(145deg, ${accent}, ${accent}bb)` : accent,
    opacity, boxShadow: top ? `0 16px 40px ${accent}55` : 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })
  return (
    <div className="hidden sm:block" style={{ position: 'relative', width: `${size + 24}px`, height: `${size + 24}px`, flexShrink: 0 }}>
      <div style={layer(24, 0.28)} />
      <div style={layer(12, 0.55)} />
      <div style={layer(0, 1, true)}>
        {logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={logo} alt="" style={{ width: '60%', height: '60%', objectFit: 'contain' }} />
          : <span style={{ fontSize: '34px', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em' }}>{initials}</span>}
      </div>
    </div>
  )
}
