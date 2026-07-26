'use client'

import { IconStarFilled, IconExternalLink } from '@tabler/icons-react'
import type { Partner } from '@/lib/partners'
import { ratingLabel } from '@/lib/partners'
import { Label, Num } from '@/components/ui/vq'

/**
 * Offer card for the Partners tab.
 *
 * The partner's own logo carries the top-right corner at full size — it is the
 * one place brand colour is welcome, because it is *their* mark and not our UI.
 * The primary action is the one deliberately coloured control in the product:
 * an outbound commercial click should look pressable, and ink-on-ink did not.
 */
export default function BrokerCard({ partner }: { partner: Partner }) {
  const initials = partner.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-line-1)',
        background: 'var(--color-surface-1)',
        padding: '18px 20px',
        display: 'flex', alignItems: 'flex-start', gap: '20px',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-line-3)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-line-1)' }}
    >
      {/* ── Left: details ──────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name + chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexWrap: 'wrap', marginBottom: '5px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-ink-1)' }}>
            {partner.name}
          </span>
          {partner.award && <Chip>{partner.award}</Chip>}
          {partner.featured && <Chip>Featured</Chip>}
        </div>

        <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-3)', marginBottom: '12px' }}>
          {partner.assets}
        </div>

        {/* Rating — always with its source named */}
        {partner.rating != null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            <Num size="lg" tone="neutral">{partner.rating.toFixed(1)}</Num>
            <Stars rating={partner.rating} />
            <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-2)' }}>
              {ratingLabel(partner.rating)}
            </span>
            {partner.ratingSource && <Label>on {partner.ratingSource}</Label>}
          </div>
        )}

        {/* What it does for the trader, and what we actually wired up */}
        <p style={{ margin: '0 0 10px', fontSize: 'var(--text-base)', lineHeight: 1.55, color: 'var(--color-ink-2)', maxWidth: '78ch' }}>
          {partner.blurb}
        </p>

        {partner.integration && (
          <div style={{
            marginBottom: '14px', padding: '8px 11px',
            background: 'var(--color-surface-1)',
            borderLeft: '2px solid var(--color-line-3)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
          }}>
            <Label>In Velquor</Label>
            <p style={{ margin: '3px 0 0', fontSize: 'var(--text-base)', lineHeight: 1.5, color: 'var(--color-ink-2)' }}>
              {partner.integration}
            </p>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '9px', flexWrap: 'wrap' }}>
          <a
            href={`/api/go/${partner.id}?slot=tab`}
            target="_blank" rel="sponsored noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              background: 'var(--color-action)', color: 'var(--color-action-ink)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              textDecoration: 'none',
              padding: '8px 15px', borderRadius: 'var(--radius-sm)',
              transition: 'background 0.14s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-action-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-action)' }}
          >
            {partner.ctaLabel}
            <IconExternalLink size={14} stroke={2} />
          </a>
          <a
            href={`/api/go/${partner.id}?slot=learn`}
            target="_blank" rel="sponsored noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center',
              background: 'transparent', color: 'var(--color-ink-1)',
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
              textDecoration: 'none',
              padding: '8px 15px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-line-1)',
            }}
          >
            Learn more
          </a>
        </div>
      </div>

      {/* ── Right: the partner's mark, big ─────────────────────── */}
      <PartnerLogo name={partner.name} logo={partner.logo} initials={initials} accent={partner.accent} />
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

function Stars({ rating }: { rating: number }) {
  const pct = Math.max(0, Math.min(100, (rating / 5) * 100))
  return (
    <div style={{ position: 'relative', display: 'inline-flex', gap: '2px' }}>
      {[0, 1, 2, 3, 4].map(i => <IconStarFilled key={i} size={12} style={{ color: 'var(--color-surface-3)' }} />)}
      <div style={{ position: 'absolute', top: 0, left: 0, display: 'inline-flex', gap: '2px', width: `${pct}%`, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        {[0, 1, 2, 3, 4].map(i => <IconStarFilled key={i} size={12} style={{ color: 'var(--color-ink-1)', flexShrink: 0 }} />)}
      </div>
    </div>
  )
}

/**
 * The official mark, as large as the card allows. All three files are the
 * vendors' own white-on-dark versions, so they need no tile behind them — the
 * initials fallback keeps the partner's colour for anyone we have no file for.
 */
function PartnerLogo({ name, logo, initials, accent }: {
  name: string; logo?: string; initials: string; accent?: string
}) {
  if (!logo) {
    return (
      <div className="hidden sm:flex" style={{
        width: '72px', height: '72px', flexShrink: 0,
        borderRadius: 'var(--radius-md)', background: accent ?? 'var(--color-surface-2)',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-void)' }}>
          {initials}
        </span>
      </div>
    )
  }
  return (
    <div className="hidden sm:flex" style={{
      flexShrink: 0, width: 'clamp(150px, 17vw, 230px)', height: '64px',
      alignItems: 'flex-start', justifyContent: 'flex-end',
    }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logo}
        alt={`${name} logo`}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', objectPosition: 'right top' }}
      />
    </div>
  )
}
