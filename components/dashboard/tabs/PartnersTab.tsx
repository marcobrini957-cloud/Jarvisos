'use client'

import { CATEGORY_LABELS, partnersByCategory } from '@/lib/partners'
import PartnerCard from '../PartnerCard'

// Full affiliate catalog, grouped by category. Shown to every tier — good
// broker/prop/tool offers are useful to paying users too; only the ad *slots*
// and the free-user rail are tier-gated.
export default function PartnersTab() {
  const groups = partnersByCategory()

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)' }}>Partners & Deals</div>
        <div style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '4px' }}>
          Hand-picked brokers, prop firms and tools the Velquor team actually uses.
        </div>
      </div>

      {groups.map(group => (
        <section key={group.category} style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'var(--t3)', marginBottom: '12px',
          }}>
            {CATEGORY_LABELS[group.category]}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '14px',
          }}>
            {group.items.map(p => (
              <PartnerCard key={p.id} partner={p} slot="tab" />
            ))}
          </div>
          {/* Per-category risk / terms disclosures */}
          {group.items.some(p => p.disclosure) && (
            <div style={{ fontSize: '10.5px', color: 'var(--t3)', opacity: 0.7, marginTop: '10px', lineHeight: 1.5 }}>
              {[...new Set(group.items.map(p => p.disclosure).filter(Boolean))].join(' ')}
            </div>
          )}
        </section>
      ))}

      {/* Affiliate transparency disclosure */}
      <div style={{
        marginTop: '8px', padding: '12px 16px', borderRadius: '12px',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6, opacity: 0.9,
      }}>
        Some links on this page are affiliate links — Velquor may earn a commission if you sign up,
        at no extra cost to you. We only list products we&apos;d use ourselves. This is not financial advice.
      </div>
    </div>
  )
}
