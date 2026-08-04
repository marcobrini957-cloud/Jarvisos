'use client'

import { useMemo, useState } from 'react'
import { PARTNERS, PARTNER_FILTERS, type PartnerCategory } from '@/lib/partners'
import BrokerCard from '../BrokerCard'
import OrdersCounter from '../OrdersCounter'
import { Segmented } from '@/components/ui/vq'

type Filter = 'all' | PartnerCategory

// Affiliate directory, styled after the TradingView broker page: atmospheric
// hero + live "orders executed" odometer, filter pills, then the offer cards.
// Shown to every tier — good offers are useful to paying users too; only the
// ad *slots* and the free-user rail are tier-gated.
export default function PartnersTab() {
  const [filter, setFilter] = useState<Filter>('all')

  const items = useMemo(() => {
    const list = filter === 'all' ? PARTNERS : PARTNERS.filter(p => p.category === filter)
    // Featured first, then keep catalog order.
    return [...list].sort((a, b) => Number(b.featured) - Number(a.featured))
  }, [filter])

  return (
    <div style={{ maxWidth: '1100px' }}>
      {/* ── Hero ──
          Was a radial-gradient sky with a blurred horizon glow behind a 56px
          headline. The odometer is the interesting part; it now sits on one
          hairline band with the wordmark face carrying the line. */}
      <div style={{
        borderRadius: 'var(--radius-card)', border: '1px solid var(--color-line-1)',
        background: 'var(--color-surface-1)',
        padding: '18px 20px', marginBottom: '12px', textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-mark)', textTransform: 'uppercase',
          fontSize: 'clamp(21px, 3.4vw, 30px)', color: 'var(--color-ink-1)',
          letterSpacing: '0.02em', lineHeight: 1.05, margin: '0 0 14px',
        }}>
          Built for trading
        </h1>
        <OrdersCounter />
      </div>

      {/* ── Filter ──
          Kept, but only earns its place once the list grows past a screenful;
          with three offers it is one tap that changes nothing. */}
      {PARTNERS.length > 4 && (
        <div style={{ display: 'flex', marginBottom: '12px' }}>
          <Segmented
            options={PARTNER_FILTERS.map(f => ({ key: f.id, label: f.label }))}
            value={filter}
            onChange={setFilter}
          />
        </div>
      )}

      {/* ── Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {items.map(p => <BrokerCard key={p.id} partner={p} />)}
      </div>

      {/* ── Affiliate transparency disclosure ────────────────────── */}
      <div style={{
        marginTop: '12px', padding: '10px 12px', borderRadius: 'var(--radius-card)',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
        fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)', lineHeight: 1.6,
      }}>
        Some links on this page are affiliate links — Velquor may earn a commission if you sign up,
        at no extra cost to you. Star ratings are each partner&apos;s Trustpilot score at the time of
        writing; check the current one before you decide. Market turnover is from the BIS Triennial
        Central Bank Survey, April 2025. Trading leveraged products carries a high risk of loss.
        This is not financial advice.
      </div>
    </div>
  )
}
