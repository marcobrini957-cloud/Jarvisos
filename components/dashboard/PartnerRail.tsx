'use client'

import { useUserProfile } from '@/context/UserProfileContext'
import { getFeaturedPartners } from '@/lib/partners'
import PartnerCard from './PartnerCard'

// Right-hand rail shown to FREE users alongside the main content. Renders a
// couple of featured offers plus an upgrade nudge (ad-free is a Pro perk).
// Paid users — and users still loading — get nothing.
export default function PartnerRail({ className }: { className?: string }) {
  const { profile, loading } = useUserProfile()
  if (loading || profile.tier !== 'free') return null

  const featured = getFeaturedPartners().slice(0, 3)
  if (featured.length === 0) return null

  return (
    <aside
      className={className}
      style={{
        width: '260px', flexShrink: 0, borderLeft: '1px solid var(--bd)',
        padding: 'clamp(16px, 2vw, 24px) 16px', overflowY: 'auto', gap: '12px',
      }}
    >
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--t3)',
      }}>
        Partner offers
      </div>

      {featured.map(p => (
        <PartnerCard key={p.id} partner={p} slot="rail" compact />
      ))}

      {/* Upgrade nudge — remove ads by going Pro */}
      <a
        href="/pricing"
        style={{
          marginTop: '4px', padding: '12px', borderRadius: '12px', display: 'block',
          background: 'linear-gradient(135deg, rgba(122,79,255,0.14), rgba(122,79,255,0.04))',
          border: '1px solid rgba(122,79,255,0.28)', cursor: 'pointer', textAlign: 'left',
          textDecoration: 'none',
        }}
      >
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t1)', marginBottom: '3px' }}>
          Want it ad-free?
        </div>
        <div style={{ fontSize: '11px', color: 'var(--t3)', lineHeight: 1.5 }}>
          Pro & Ultra hide all ads — plus AI coaching and copy trading.
        </div>
      </a>
    </aside>
  )
}
