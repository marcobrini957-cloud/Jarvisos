'use client'

import { useLocale } from '@/hooks/useLocale'

export function PropFirmSection() {
  const { t } = useLocale()
  const pf = t.propFirm

  return (
    <section style={{ padding: '0 clamp(16px, 5vw, 48px) clamp(60px, 10vw, 100px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,255,133,0.04) 0%, rgba(77,143,255,0.04) 100%)',
        border: '1px solid rgba(0,255,133,0.15)', borderRadius: '20px',
        padding: 'clamp(28px, 5vw, 56px) clamp(20px, 5vw, 60px)',
      }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 5vw, 60px)', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', marginBottom: '20px', background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.25)' }}>
              <span style={{ color: 'var(--gr2)', fontSize: '12px', fontWeight: 500 }}>{pf.badge}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)', lineHeight: 1.2 }}>{pf.h2}</h2>
            <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 22px' }}>{pf.subtitle}</p>
            {pf.firms.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>✓</span>
                <span style={{ color: 'var(--t2)', fontSize: '13px' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{
            background: 'var(--s1)', borderRadius: '14px', padding: '22px',
            border: '1px solid rgba(0,255,133,0.22)',
            boxShadow: '0 0 36px rgba(0,255,133,0.07), 0 18px 48px rgba(0,0,0,0.4)',
          }}>
            <p style={{ margin: '0 0 18px', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>FTMO Challenge — Phase 1</p>
            {[
              { label: 'Profit Target',  current: 6.8, max: 10, color: 'var(--gr2)', unit: '%' },
              { label: 'Max Daily Loss', current: 1.2, max: 5,  color: 'var(--go2)', unit: '%' },
              { label: 'Max Drawdown',   current: 2.1, max: 10, color: 'var(--ac)',  unit: '%' },
              { label: 'Trading Days',   current: 7,   max: 10, color: 'var(--pu)',  unit: ' days' },
            ].map(r => (
              <div key={r.label} style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--t2)', fontSize: '11px' }}>{r.label}</span>
                  <span style={{ color: r.color, fontSize: '11px', fontWeight: 600 }}>{r.current}{r.unit} / {r.max}{r.unit}</span>
                </div>
                <div style={{ height: '5px', borderRadius: '3px', background: 'var(--s3)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: '3px', width: `${(r.current / r.max) * 100}%`, background: r.color }} />
                </div>
              </div>
            ))}
            <div style={{ marginTop: '16px', padding: '9px 12px', borderRadius: '8px', background: 'rgba(0,255,133,0.07)', border: '1px solid rgba(0,255,133,0.18)', display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ color: 'var(--gr2)', fontSize: '13px' }}>●</span>
              <span style={{ color: 'var(--gr2)', fontSize: '11px', fontWeight: 500 }}>{pf.trackNote}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

