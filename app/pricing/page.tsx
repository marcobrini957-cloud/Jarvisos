'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'

// ── Tier data ─────────────────────────────────────────────────────────────────
type Feature = { text: string; included: boolean }

const F_FREE: Feature[] = [
  { text: 'MT5 auto-sync (30-day history)',         included: true  },
  { text: 'Trade journal (up to 100 trades)',        included: true  },
  { text: 'Core P&L & win rate stats',              included: true  },
  { text: 'Session analytics (London / NY / Asia)', included: false },
  { text: 'Setup analytics (per-setup win rate)',    included: false },
  { text: 'VELQUOR AI analysis',                    included: false },
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
  { text: 'VELQUOR AI analysis',                    included: true  },
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
  { text: 'VELQUOR AI analysis',                    included: true },
  { text: 'Behavior correlations',                  included: true },
  { text: 'PDF trade reports',                      included: true },
  { text: 'Prop firm tracker',                      included: true },
  { text: 'Trade copier (3 groups, 5 slaves each)', included: true },
  { text: 'Priority support',                       included: true },
]

const TIERS = [
  {
    name: 'Free',
    monthly: '€0', annual: '€0',
    annualNote: '',
    period: '/mo',
    tagline: 'Get started. No card needed.',
    cta: 'Start for free',
    href: '/login?mode=signup',
    badge: null as string | null,
    isPro: false,
    isFree: true,
    features: F_FREE,
  },
  {
    name: 'Pro',
    monthly: '€15.99', annual: '€12.99',
    annualNote: 'Billed €155.88/year — save €36',
    period: '/mo',
    tagline: 'Full analytics. Built-in trade copier.',
    cta: 'Start Pro',
    href: '/login?mode=signup&plan=pro',
    badge: 'Most popular',
    isPro: true,
    isFree: false,
    features: F_PRO,
  },
  {
    name: 'Ultra',
    monthly: '€30.99', annual: '€24.99',
    annualNote: 'Billed €299.88/year — save €72',
    period: '/mo',
    tagline: 'Everything in Pro. Multi-group copying.',
    cta: 'Start Ultra',
    href: '/login?mode=signup&plan=ultra',
    badge: null,
    isPro: false,
    isFree: false,
    features: F_ULTRA,
  },
]

const FAQ = [
  { q: 'Do I need a credit card to start?', a: 'No. The Free plan is free forever — no card required. You only need a card when upgrading to Pro or Ultra.' },
  { q: 'How does the MT5 sync work?', a: 'You install a small Expert Advisor inside MT5. It pushes your trades to VELQUOR every 10 seconds. No third-party cloud access to your broker account — your credentials never leave your machine.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your settings at any time — no questions asked. Your data is kept for 30 days after cancellation.' },
  { q: 'What brokers are supported?', a: 'Any MetaTrader 5 broker worldwide — IC Markets, Pepperstone, FTMO live accounts, Blueberry, and any other MT5 broker. Demo and live accounts both work.' },
  { q: 'What is the trade copier?', a: 'VELQUOR\'s built-in trade copier mirrors every trade from your master MT5 account to slave accounts automatically — in under 2 seconds. Pro includes 1 group with 1 slave. Ultra includes 3 groups with up to 5 slaves each.' },
  { q: 'Is my trading data private?', a: 'Your data is encrypted at rest in Supabase and isolated per account with row-level security. The EA authenticates with a unique API key — nobody else can access your account data.' },
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#fff' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)', height: '60px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,5,5,0.90)', backdropFilter: 'blur(12px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
          <LogoMark size={24} />
          <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>VELQUOR</span>
        </Link>
        <Link href="/login?mode=signup" style={{
          padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
          background: '#fff', color: '#000', textDecoration: 'none',
        }}>
          Get started
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ textAlign: 'center', padding: 'clamp(56px, 9vw, 90px) clamp(16px, 5vw, 48px) 48px', maxWidth: '560px', margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 54px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 14px', lineHeight: 1.04 }}>
          Start free.<br />
          <span style={{ color: 'rgba(255,255,255,0.35)' }}>Scale when ready.</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.52)', fontSize: '16px', lineHeight: 1.65, margin: '0 0 28px' }}>
          No card needed. Cancel any time.
        </p>

        {/* Monthly / Annual toggle */}
        <div style={{
          display: 'inline-flex', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '3px', gap: '2px',
        }}>
          {([false, true] as const).map(isAnnual => (
            <button key={String(isAnnual)} onClick={() => setAnnual(isAnnual)} style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 18px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
              background: annual === isAnnual ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: annual === isAnnual ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              color: annual === isAnnual ? '#fff' : 'rgba(255,255,255,0.45)',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {isAnnual ? 'Annual' : 'Monthly'}
              {isAnnual && (
                <span style={{
                  background: 'rgba(0,255,133,0.12)', border: '1px solid rgba(0,255,133,0.25)',
                  color: '#00FF85', fontSize: '10px', fontWeight: 700,
                  padding: '1px 7px', borderRadius: '4px',
                }}>Save 20%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tier cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px', maxWidth: '1060px', margin: '0 auto',
        padding: '0 clamp(16px, 5vw, 48px) 80px',
      }}>
        {TIERS.map(tier => {
          const price = annual ? tier.annual : tier.monthly
          return (
            <div key={tier.name} style={{
              borderRadius: '12px', padding: '28px', position: 'relative',
              background: tier.isPro
                ? 'linear-gradient(160deg, rgba(77,143,255,0.07) 0%, rgba(5,5,5,1) 65%)'
                : 'rgba(255,255,255,0.03)',
              border: `1px solid ${tier.isPro ? 'rgba(77,143,255,0.38)' : 'rgba(255,255,255,0.08)'}`,
              boxShadow: tier.isPro ? '0 0 0 1px rgba(77,143,255,0.08), 0 28px 70px rgba(0,0,0,0.5)' : 'none',
            }}>

              {/* Badge */}
              {tier.badge && (
                <div style={{
                  position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)',
                  background: '#4D8FFF', color: '#fff',
                  fontSize: '10px', fontWeight: 700, letterSpacing: '0.05em',
                  padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                  boxShadow: '0 4px 14px rgba(77,143,255,0.4)',
                }}>{tier.badge}</div>
              )}

              {/* Tier name */}
              <p style={{ margin: '0 0 12px', color: 'rgba(255,255,255,0.38)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {tier.name}
              </p>

              {/* Price — layout from screenshot */}
              <div style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: 'clamp(38px, 5vw, 50px)', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>{price}</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px' }}>{tier.period}</span>
                </div>
                <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                  {annual ? 'Annual billing' : 'Monthly billing'}
                </p>
                {annual && tier.annualNote
                  ? <p style={{ margin: '2px 0 0', color: '#00FF85', fontSize: '11px', fontWeight: 500 }}>{tier.annualNote}</p>
                  : <p style={{ margin: '2px 0 0', color: 'transparent', fontSize: '11px' }}>—</p>
                }
              </div>

              <p style={{ margin: '0 0 18px', color: 'rgba(255,255,255,0.38)', fontSize: '12px', lineHeight: 1.5 }}>{tier.tagline}</p>

              {/* CTA — big button like screenshot */}
              <Link href={tier.href} style={{
                display: 'block', textAlign: 'center',
                padding: '13px', borderRadius: '8px',
                fontSize: '14px', fontWeight: 700, textDecoration: 'none',
                marginBottom: '8px',
                background: tier.isPro ? '#fff' : 'rgba(255,255,255,0.07)',
                color: tier.isPro ? '#000' : '#fff',
                border: tier.isPro ? 'none' : '1px solid rgba(255,255,255,0.12)',
                boxShadow: tier.isPro ? '0 4px 20px rgba(255,255,255,0.12)' : 'none',
                letterSpacing: '0.01em',
              }}>{tier.cta}</Link>

              {/* Secondary billing link — like screenshot's "oder bezahlen Sie jetzt" */}
              {!tier.isFree && (
                <p style={{ textAlign: 'center', margin: '0 0 18px', fontSize: '11px', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  or{' '}
                  <button onClick={() => setAnnual(a => !a)} style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#4D8FFF', fontSize: '11px', textDecoration: 'underline',
                  }}>
                    {annual ? `pay ${tier.monthly}/mo monthly` : `save with annual (${tier.annual}/mo)`}
                  </button>
                </p>
              )}
              {tier.isFree && <div style={{ marginBottom: '18px' }} />}

              {/* Divider */}
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)' }} />

              {/* Feature list — with horizontal dividers between rows (from screenshot) */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {tier.features.map((f, fi) => (
                  <div key={fi} style={{
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                    padding: '9px 0',
                    borderBottom: fi < tier.features.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <span style={{
                      flexShrink: 0, marginTop: '1px', fontSize: '11px', fontWeight: 700, lineHeight: 1.5,
                      color: f.included
                        ? (tier.isPro ? '#4D8FFF' : 'rgba(0,232,122,0.9)')
                        : 'rgba(255,255,255,0.2)',
                    }}>{f.included ? '✓' : '✕'}</span>
                    <span style={{
                      fontSize: '12px', lineHeight: 1.55,
                      color: f.included ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.25)',
                    }}>{f.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Trust bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center', alignItems: 'center',
        padding: '0 clamp(16px, 5vw, 48px) 80px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: '48px',
      }}>
        {[
          ['Any MT5 broker', 'Demo or live accounts, worldwide'],
          ['No manual entry', 'Trades sync automatically every 10s'],
          ['Cancel any time', 'No lock-in, no questions asked'],
          ['Bank-level encryption', 'Your data stays private and isolated'],
        ].map(([label, sub]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <p style={{ margin: '0 0 3px', color: '#fff', fontSize: '13px', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.38)', fontSize: '11px' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 clamp(16px, 5vw, 48px) 100px' }}>
        <h2 style={{ fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 32px', textAlign: 'center', color: '#fff' }}>
          Common questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {FAQ.map((f, i) => (
            <div key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '20px 0' }}>
              <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>{f.q}</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>{f.a}</p>
            </div>
          ))}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
        </div>
      </div>

      {/* Footer CTA */}
      <div style={{
        textAlign: 'center',
        padding: 'clamp(48px, 8vw, 80px) clamp(16px, 5vw, 48px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h2 style={{ fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 12px', lineHeight: 1.04 }}>
          Know your edge today.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 28px', lineHeight: 1.6 }}>
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
