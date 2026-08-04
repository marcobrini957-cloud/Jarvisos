'use client'

import Icon from '@/components/ui/Icon'

// ── Plan Gate Banner ──────────────────────────────────────────────────────────
export function PlanGateBanner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
        color: 'var(--color-ink-2)', marginBottom: '20px',
      }}>
        <Icon name="bolt" size={24} />
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', color: 'var(--color-ink-1)', marginBottom: '10px' }}>
        Copy Trading requires Pro or Ultra
      </div>
      <div style={{ fontSize: 'var(--text-md)', color: 'var(--color-ink-3)', maxWidth: '340px', margin: '0 auto 28px', lineHeight: 1.6 }}>
        Automatically mirror your trades across multiple MT5 accounts. Upgrade to unlock this feature.
      </div>
      <div style={{
        display: 'inline-flex', gap: '12px', padding: '16px 24px',
        background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-card)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>Pro</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)' }}>1 copy group · 1 follower</div>
        </div>
        <div style={{ width: 1, background: 'var(--color-line-1)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>Ultra</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-ink-3)' }}>3 copy groups · 5 followers each</div>
        </div>
      </div>
    </div>
  )
}
