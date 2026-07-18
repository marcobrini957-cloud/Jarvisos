'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'

type Feature = { text: string; included: boolean }

const F_FREE: Feature[] = [
  { text: 'MT5 auto-sync (30-day history)',         included: true  },
  { text: 'Trade journal (up to 100 trades)',        included: true  },
  { text: 'Core P&L & win rate stats',              included: true  },
  { text: 'Session analytics (London / NY / Asia)', included: false },
  { text: 'Setup analytics (per-setup win rate)',    included: false },
  { text: 'VELQUOR Analyst',                    included: false },
  { text: 'Behavior correlations',                  included: false },
  { text: 'PDF trade reports',                      included: false },
  { text: 'Prop firm tracker',                      included: false },
  { text: 'Trade copier',                           included: false },
  { text: 'Priority support',                       included: false },
]

const F_PRO: Feature[] = [
  { text: 'MT5 auto-sync (unlimited history)',       included: true  },
  { text: 'Trade journal (unlimited trades)',         included: true  },
  { text: 'Core P&L & win rate stats',              included: true  },
  { text: 'Session analytics (London / NY / Asia)', included: true  },
  { text: 'Setup analytics (per-setup win rate)',    included: true  },
  { text: 'VELQUOR Analyst',                    included: true  },
  { text: 'Behavior correlations',                  included: true  },
  { text: 'PDF trade reports',                      included: true  },
  { text: 'Prop firm tracker',                      included: true  },
  { text: 'Trade copier (1 group, 1 slave)',         included: true  },
  { text: 'Priority support',                       included: false },
]

const F_ULTRA: Feature[] = [
  { text: 'MT5 auto-sync (unlimited history)',       included: true },
  { text: 'Trade journal (unlimited trades)',         included: true },
  { text: 'Core P&L & win rate stats',              included: true },
  { text: 'Session analytics (London / NY / Asia)', included: true },
  { text: 'Setup analytics (per-setup win rate)',    included: true },
  { text: 'VELQUOR Analyst',                    included: true },
  { text: 'Behavior correlations',                  included: true },
  { text: 'PDF trade reports',                      included: true },
  { text: 'Prop firm tracker',                      included: true },
  { text: 'Trade copier (3 groups, 5 slaves each)', included: true },
  { text: 'Priority support',                       included: true },
]

const TIERS = [
  {
    name: 'Free',
    monthly: '€0',   annual: '€0',
    annualNote: '',
    period: '/mo',
    cta: 'Start free — no card',
    href: '/login?mode=signup',
    isFree: true,
    features: F_FREE,
  },
  {
    name: 'Pro',
    monthly: '€15.99', annual: '€12.99',
    annualNote: 'Save €36 per year',
    period: '/mo',
    cta: 'Get started',
    href: '/login?mode=signup&plan=pro',
    isFree: false,
    features: F_PRO,
  },
  {
    name: 'Ultra',
    monthly: '€30.99', annual: '€24.99',
    annualNote: 'Save €72 per year',
    period: '/mo',
    cta: 'Get started',
    href: '/login?mode=signup&plan=ultra',
    isFree: false,
    features: F_ULTRA,
  },
]

const FAQ = [
  { q: 'Do I need a credit card to start?', a: 'No. The Free plan is free forever — no card required. You only need a card when upgrading to Pro or Ultra.' },
  { q: 'How does the MT5 sync work?', a: 'You install a small Expert Advisor inside MT5. It pushes your trades to VELQUOR every 10 seconds. Your broker credentials never leave your machine.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your settings at any time — no questions asked. Your data is kept for 30 days after cancellation.' },
  { q: 'What brokers are supported?', a: 'Any MetaTrader 5 broker worldwide — IC Markets, Pepperstone, FTMO live accounts, Blueberry, and any other MT5 broker. Demo and live accounts both work.' },
  { q: 'What is the trade copier?', a: 'VELQUOR\'s built-in copier mirrors every trade from your master MT5 to slave accounts in under 2 seconds. Pro includes 1 copy group with 1 slave. Ultra includes 3 groups with up to 5 slaves each.' },
  { q: 'Is my trading data private?', a: 'Your data is encrypted at rest and isolated per account with row-level security. The EA authenticates with a unique API key — nobody else can access your data.' },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)

  // Logo rule: logged out → landing, logged in → dashboard (same as landing Nav)
  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) setLoggedIn(true)
      })
    })
  }, [])

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)', height: '60px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)',
      }}>
        <Link href={loggedIn ? '/dashboard' : '/'} style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
          <LogoMark size={24} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>VELQUOR</span>
        </Link>
        <Link href="/login?mode=signup" style={{
          padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          background: '#fff', color: '#000', textDecoration: 'none',
        }}>Get started</Link>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: 'clamp(56px, 9vw, 90px) clamp(16px, 5vw, 48px) 48px', maxWidth: '520px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 14px', lineHeight: 1.04 }}>
          Start free.<br />
          <span style={{ color: 'rgba(255,255,255,0.32)' }}>Scale when ready.</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.48)', fontSize: '16px', lineHeight: 1.65, margin: '0 0 28px' }}>
          No card needed to start. Cancel any time.
        </p>

        {/* Toggle */}
        <div style={{
          display: 'inline-flex',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px', padding: '3px', gap: '2px',
        }}>
          {([false, true] as const).map(isAnnual => (
            <button key={String(isAnnual)} onClick={() => setAnnual(isAnnual)} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
              background: annual === isAnnual ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: annual === isAnnual ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              color: annual === isAnnual ? '#fff' : 'rgba(255,255,255,0.42)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {isAnnual ? 'Annual' : 'Monthly'}
              {isAnnual && (
                <span style={{
                  background: 'rgba(0,255,133,0.12)', border: '1px solid rgba(0,255,133,0.22)',
                  color: '#00FF85', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '4px',
                }}>Save 20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TIER CARDS — matching screenshot layout exactly ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '0',
        maxWidth: '1020px', margin: '0 auto',
        padding: '0 clamp(16px, 5vw, 48px) 80px',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'rgba(255,255,255,0.025)',
      }}>
        {TIERS.map((tier, idx) => {
          const price = annual ? tier.annual : tier.monthly
          const isLast = idx === TIERS.length - 1

          return (
            <div key={tier.name} style={{
              padding: '28px 24px',
              borderRight: isLast ? 'none' : '1px solid rgba(255,255,255,0.09)',
            }}>

              {/* Tier name — large white, like "Essential" in screenshot */}
              <p style={{ margin: '0 0 18px', color: '#fff', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
                {tier.name}
              </p>

              {/* Price + period on same row, period at baseline */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', marginBottom: '6px' }}>
                <span style={{ fontSize: 'clamp(44px, 5.5vw, 58px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>
                  {price}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '15px', paddingBottom: '8px' }}>
                  {tier.period}
                </span>
              </div>

              {/* "jährliche Abrechnung" equivalent */}
              <p style={{ margin: '0 0 3px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
                {annual ? 'Annual billing' : 'Monthly billing'}
              </p>

              {/* "Sparen Sie €X pro Jahr" equivalent */}
              {annual && tier.annualNote
                ? <p style={{ margin: '0 0 22px', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>{tier.annualNote} ℹ</p>
                : <p style={{ margin: '0 0 22px', color: 'transparent', fontSize: '13px', userSelect: 'none' }}>—</p>
              }

              {/* CTA button — white bg, black text, full width, exactly like screenshot */}
              <Link href={tier.href} style={{
                display: 'block', textAlign: 'center',
                padding: '14px 16px', borderRadius: '8px',
                fontSize: '15px', fontWeight: 700, textDecoration: 'none',
                marginBottom: '10px',
                background: '#fff', color: '#000',
                boxShadow: '0 2px 16px rgba(255,255,255,0.07)',
                letterSpacing: '0.01em',
              }}>{tier.cta}</Link>

              {/* Secondary 2-line text like "oder überspringen... / bezahlen Sie jetzt" */}
              {!tier.isFree ? (
                <p style={{ textAlign: 'center', margin: '0 0 22px', fontSize: '12px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.55 }}>
                  or skip and pay immediately{' '}
                  <button onClick={() => setAnnual(a => !a)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    display: 'block', margin: '2px auto 0',
                    color: '#4B8FFF', fontSize: '12px',
                  }}>
                    {annual ? `pay ${tier.monthly}/mo monthly instead` : `save with annual (${tier.annual}/mo)`}
                  </button>
                </p>
              ) : (
                <div style={{ marginBottom: '22px' }} />
              )}

              {/* Feature list — every row separated by a thin horizontal line, exactly like screenshot */}
              <div>
                {tier.features.map((f, fi) => (
                  <div key={fi} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    padding: '11px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <span style={{
                      flexShrink: 0, marginTop: '2px',
                      fontSize: '13px', lineHeight: 1,
                      color: f.included ? '#00d46a' : 'rgba(255,80,80,0.45)',
                    }}>
                      {f.included ? '✓' : '✕'}
                    </span>
                    <span style={{
                      fontSize: '13px', lineHeight: 1.5,
                      color: f.included ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.28)',
                    }}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          )
        })}
      </div>

      {/* Trust bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center',
        padding: 'clamp(36px,6vw,56px) clamp(16px, 5vw, 48px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        {[
          ['Any MT5 broker', 'Demo or live, worldwide'],
          ['No manual entry', 'Syncs every 10 seconds'],
          ['Cancel any time', 'No lock-in, no questions'],
          ['Bank-level encryption', 'Your data stays private'],
        ].map(([label, sub]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 3px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 48px) 100px' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 32px', textAlign: 'center' }}>
          Common questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQ.map((f, i) => (
            <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 0' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>{f.q}</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.48)', lineHeight: 1.65 }}>{f.a}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        textAlign: 'center',
        padding: 'clamp(48px, 8vw, 80px) clamp(16px, 5vw, 48px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
      }}>
        <h2 style={{ fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', lineHeight: 1.04 }}>
          Know your edge today.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.42)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>
          Free forever. No card needed.
        </p>
        <Link href="/login?mode=signup" style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: '8px',
          background: '#fff', color: '#000', fontSize: '15px', fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 8px 32px rgba(255,255,255,0.1)',
          letterSpacing: '0.01em',
        }}>Get started free →</Link>
      </div>

    </div>
  )
}
