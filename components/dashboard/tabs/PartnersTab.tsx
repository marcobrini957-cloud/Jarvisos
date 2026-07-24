'use client'

import { useMemo, useState } from 'react'
import { PARTNERS, PARTNER_FILTERS, type PartnerCategory } from '@/lib/partners'
import BrokerCard from '../BrokerCard'
import OrdersCounter from '../OrdersCounter'

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
    <div style={{ maxWidth: '920px', margin: '0 auto' }}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        borderRadius: '24px', border: '1px solid var(--bd2)',
        padding: 'clamp(32px, 6vw, 56px) 24px clamp(28px, 4vw, 40px)',
        marginBottom: '20px', textAlign: 'center',
        background: 'radial-gradient(120% 90% at 50% -20%, rgba(76,141,255,0.28) 0%, rgba(122,79,255,0.14) 30%, var(--s1) 62%)',
      }}>
        {/* atmospheric horizon glow */}
        <div style={{
          position: 'absolute', top: '-40%', left: '50%', transform: 'translateX(-50%)',
          width: '160%', height: '120%', pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 100%, rgba(76,141,255,0.35), transparent 55%)',
          filter: 'blur(20px)',
        }} />
        <div style={{ position: 'relative' }}>
          <h1 style={{
            fontSize: 'clamp(30px, 6vw, 56px)', fontWeight: 800, color: 'var(--t1)',
            letterSpacing: '-0.03em', lineHeight: 1.02, margin: '0 0 26px',
          }}>
            Built for trading
          </h1>
          <OrdersCounter />
        </div>
      </div>

      {/* ── Filter pills ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {PARTNER_FILTERS.map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                padding: '9px 18px', borderRadius: '999px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: '1px solid ' + (active ? 'var(--t1)' : 'var(--bd2)'),
                background: active ? 'var(--t1)' : 'var(--s2)',
                color: active ? 'var(--bg)' : 'var(--t2)',
                transition: 'all 0.14s',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* ── Cards ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {items.map(p => <BrokerCard key={p.id} partner={p} />)}
      </div>

      {/* ── Affiliate transparency disclosure ────────────────────── */}
      <div style={{
        marginTop: '20px', padding: '12px 16px', borderRadius: '12px',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6, opacity: 0.9,
      }}>
        Some links on this page are affiliate links — Velquor may earn a commission if you sign up,
        at no extra cost to you. Ratings and figures are indicative. Trading leveraged products
        carries a high risk of loss. This is not financial advice.
      </div>
    </div>
  )
}
