'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useLocale } from '@/hooks/useLocale'

export function Pricing() {
  const { t } = useLocale()
  const pr = t.pricing
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      borderTop: '1px solid var(--bd)', background: 'var(--s1)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: 'clamp(30px, 6vw, 46px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', color: 'var(--t1)', lineHeight: 1.04 }}>{pr.h2}</h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.65, margin: '0 auto 28px', maxWidth: '360px' }}>{pr.subtitle}</p>

          {/* Monthly / Annual toggle */}
          <div style={{
            display: 'inline-flex', background: 'var(--s2)',
            border: '1px solid var(--bd)', borderRadius: '8px', padding: '3px', gap: '2px',
          }}>
            {([false, true] as const).map(isAnnual => (
              <button key={String(isAnnual)} onClick={() => setAnnual(isAnnual)} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                background: annual === isAnnual ? 'var(--s3)' : 'transparent',
                border: annual === isAnnual ? '1px solid var(--bd2)' : '1px solid transparent',
                color: annual === isAnnual ? 'var(--t1)' : 'var(--t3)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}>
                {isAnnual ? pr.toggle.annual : pr.toggle.monthly}
                {isAnnual && (
                  <span style={{
                    background: 'rgba(0,255,133,0.12)', border: '1px solid rgba(0,255,133,0.25)',
                    color: '#00FF85', fontSize: '10px', fontWeight: 700,
                    padding: '1px 6px', borderRadius: '4px',
                  }}>{pr.toggle.save}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '12px', alignItems: 'start' }}>
          {pr.tiers.map((tier) => {
            const isPro   = !!tier.badge
            const price   = annual ? tier.annual : tier.monthly
            const isFree  = tier.monthly === '€0'

            return (
              <div key={tier.name} style={{
                background: isPro
                  ? 'linear-gradient(160deg, rgba(77,143,255,0.055) 0%, var(--s1) 55%)'
                  : 'var(--s1)',
                border: `1px solid ${isPro ? 'rgba(77,143,255,0.38)' : 'var(--bd)'}`,
                borderRadius: '12px', padding: '26px', position: 'relative',
                boxShadow: isPro ? '0 0 0 1px rgba(77,143,255,0.08), 0 20px 50px rgba(0,0,0,0.28)' : 'none',
              }}>

                {/* Badge */}
                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #2196F3 0%, #7B2FBF 60%, #C432DC 100%)', color: 'white',
                    fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                    padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 14px rgba(123,47,191,0.4)',
                  }}>{tier.badge}</div>
                )}

                {/* Tier name — large white text like screenshot */}
                <p style={{ margin: '0 0 16px', color: 'var(--t1)', fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>{tier.name}</p>

                {/* Price — very large, /mo sitting at baseline right next to it */}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', marginBottom: '5px' }}>
                  <span style={{ fontSize: 'clamp(42px, 5vw, 54px)', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1 }}>{price}</span>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', paddingBottom: '7px' }}>{tier.period}</span>
                </div>
                {/* Billing type — grey, own line */}
                <p style={{ margin: '0 0 2px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                  {annual ? 'Annual billing' : 'Monthly billing'}
                </p>
                {/* Savings — grey, own line (matches screenshot "Sparen Sie €X pro Jahr") */}
                {annual && tier.annualNote
                  ? <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{tier.annualNote}</p>
                  : <p style={{ margin: '0 0 20px', color: 'transparent', fontSize: '13px' }}>—</p>
                }

                {/* CTA button — full width, white bg black text like screenshot */}
                <Link href={`/login?mode=signup${isFree ? '' : `&plan=${tier.name.toLowerCase()}`}`} style={{
                  display: 'block', textAlign: 'center', padding: '14px', borderRadius: '8px',
                  fontSize: '15px', fontWeight: 700, textDecoration: 'none', marginBottom: '10px',
                  background: '#fff', color: '#000',
                  boxShadow: '0 2px 12px rgba(255,255,255,0.08)',
                  letterSpacing: '0.01em',
                }}>{tier.cta}</Link>

                {/* Secondary 2-line link like screenshot "oder überspringen... / bezahlen Sie jetzt" */}
                {!isFree ? (
                  <p style={{ textAlign: 'center', margin: '0 0 20px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
                    or skip the trial and{' '}
                    <button onClick={() => setAnnual(a => !a)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'block', margin: '0 auto',
                      color: 'var(--ac)', fontSize: '11px', textDecoration: 'none', fontWeight: 500,
                    }}>
                      {annual ? `pay ${tier.monthly}/mo monthly` : `pay ${tier.annual}/mo annually`}
                    </button>
                  </p>
                ) : <div style={{ marginBottom: '20px' }} />}

                {/* Feature list — items separated by thin lines exactly like screenshot */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {tier.features.map((f, fi) => (
                    <div key={fi} style={{
                      display: 'flex', gap: '10px', alignItems: 'flex-start',
                      padding: '10px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>
                      <span style={{
                        flexShrink: 0, marginTop: '2px', fontSize: '12px', lineHeight: 1.4,
                        color: f.included ? '#00d46a' : 'rgba(255,255,255,0.22)',
                      }}>{f.included ? '✓' : '✕'}</span>
                      <span style={{
                        fontSize: '13px', lineHeight: 1.5,
                        color: f.included ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.28)',
                      }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '12px', marginTop: '28px', lineHeight: 1.6 }}>{pr.footer}</p>
      </div>
    </section>
  )
}

