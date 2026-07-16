'use client'

import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'
import { SectionEyebrow } from './SectionEyebrow'

export function HowItWorks() {
  const { t } = useLocale()
  const hw = t.howItWorks
  const nums = ['01', '02', '03', '04']

  return (
    <section id="how" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--s1)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <SectionEyebrow align="center">{hw.eyebrow}</SectionEyebrow>
          <h2 style={{ fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 14px', color: 'var(--t1)', lineHeight: 1.04 }}>{hw.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.65 }}>{hw.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px', position: 'relative' }}>
          {hw.steps.map((s, i) => (
            <div key={nums[i]}>
              <p style={{
                margin: '0 0 16px',
                color: 'var(--ac)', fontSize: '13px', fontWeight: 700,
                letterSpacing: '0.04em', fontFamily: 'monospace',
              }}>{nums[i]}</p>
              <h3 style={{ margin: '0 0 7px', color: 'var(--t1)', fontSize: '14px', fontWeight: 600 }}>{s.title}</h3>
              <p style={{ margin: '0 0 7px', color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>{s.desc}</p>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '11px', lineHeight: 1.5 }}>{s.detail}</p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <Link href="/login?mode=signup" style={{
            background: 'var(--ac)', color: 'white', padding: '13px 30px', borderRadius: '10px',
            fontSize: '14px', fontWeight: 600, textDecoration: 'none', display: 'inline-block',
            boxShadow: '0 8px 24px rgba(77,143,255,0.3)',
          }}>{hw.cta}</Link>
        </div>
      </div>
    </section>
  )
}

