'use client'

import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

// Line icons by item order (no passwords / EU infra / your data / kill switch) —
// same order in every locale, replaces the emoji that undercut the premium look
const ICONS = [
  // key
  <svg key="k" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M16 5l3 3M13 8l2 2"/></svg>,
  // shield
  <svg key="s" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z"/></svg>,
  // download / export
  <svg key="d" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v11m0 0 4-4m-4 4-4-4M4 19h16"/></svg>,
  // power / kill switch
  <svg key="p" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v8"/><path d="M6.3 6.5a8 8 0 1 0 11.4 0"/></svg>,
]

export function TrustSection() {
  const { t } = useLocale()
  const tr = t.trust

  return (
    <section style={{
      padding: 'clamp(48px, 7vw, 80px) clamp(16px, 5vw, 48px)',
      background: 'var(--bg)', borderTop: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <SectionEyebrow align="center" color="#00FF85" rgb="0,255,133">{tr.eyebrow}</SectionEyebrow>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, letterSpacing: '-0.04em', margin: 0, color: 'var(--t1)', lineHeight: 1.08 }}>{tr.h2}</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '14px' }}>
          {tr.items.map((item, i) => (
            <div key={item.title} style={{
              background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '12px',
              padding: '22px 20px', transition: 'border-color 0.18s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,255,133,0.35)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)' }}
            >
              <div style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '34px', height: '34px', borderRadius: '9px', marginBottom: '14px',
                color: '#00FF85', background: 'rgba(0,255,133,0.07)',
                border: '1px solid rgba(0,255,133,0.22)',
                boxShadow: '0 0 14px rgba(0,255,133,0.10)',
              }}>{ICONS[i % ICONS.length]}</div>
              <h3 style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '14px', fontWeight: 700, letterSpacing: '-0.01em' }}>{item.title}</h3>
              <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.65 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
