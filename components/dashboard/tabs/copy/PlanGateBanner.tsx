'use client'

// ── Plan Gate Banner ──────────────────────────────────────────────────────────
export function PlanGateBanner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: 'var(--radius-lg)',
        background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
        fontSize: 'var(--text-2xl)', marginBottom: '20px',
      }}>
        ⚡
      </div>
      <div style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--t1)', marginBottom: '10px' }}>
        Copy Trading requires Pro or Ultra
      </div>
      <div style={{ fontSize: 'var(--text-md)', color: 'var(--t3)', maxWidth: '340px', margin: '0 auto 28px', lineHeight: 1.6 }}>
        Automatically mirror your trades across multiple MT5 accounts. Upgrade to unlock this feature.
      </div>
      <div style={{
        display: 'inline-flex', gap: '12px', padding: '16px 24px',
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 'var(--radius-lg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--t1)' }}>Pro</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>1 copy group · 1 follower</div>
        </div>
        <div style={{ width: 1, background: 'var(--bd)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#FFFFFF' }}>Ultra</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>3 copy groups · 5 followers each</div>
        </div>
      </div>
    </div>
  )
}
