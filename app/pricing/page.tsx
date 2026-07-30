'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/ui/Icon'
import { Nav } from '@/components/landing/Nav'
import { Footer } from '@/components/landing/Footer'
import { Section, SectionHead, inkButton } from '@/components/landing/Section'

/**
 * The standalone price list, on the 2.0 language.
 *
 * It had its own nav, its own toggle, its own button styles and its own idea of
 * a heading — a second design system for one page. It now wears the site's:
 * the landing nav and footer, the `Section` rhythm, the tier grid the landing
 * pricing block uses, ink buttons. The green ✓ / red ✕ column is gone; whether
 * a plan includes a feature is not a claim about money, so it is drawn in ink,
 * and the check mark comes from Icon.tsx rather than from a font's glyph table.
 */

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
  { text: 'Trade copier (1 group, 1 follower)',         included: true  },
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
  { text: 'Trade copier (3 groups, 5 followers each)', included: true },
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
  { q: 'What is the trade copier?', a: 'VELQUOR\'s built-in copier mirrors every trade from your leader MT5 to follower accounts in under 2 seconds. Pro includes 1 copy group with 1 follower. Ultra includes 3 groups with up to 5 followers each.' },
  { q: 'Is my trading data private?', a: 'Your data is encrypted at rest and isolated per account with row-level security. The EA authenticates with a unique API key — nobody else can access your data.' },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(true)

  return (
    <div className="vq2" style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--t1)' }}>
      <Nav />

      <Section>
        <SectionHead
          label="Pricing"
          title={<>Start free.<br /><span style={{ color: 'var(--color-ink-3)' }}>Scale when ready.</span></>}
          lead="No card needed to start. Cancel any time."
          action={
            <div style={{ display: 'flex', gap: '1px', padding: '1px', background: 'var(--color-surface-2)', borderRadius: 'var(--radius-sm)' }}>
              {([false, true] as const).map(isAnnual => {
                const on = annual === isAnnual
                return (
                  <button
                    key={String(isAnnual)}
                    onClick={() => setAnnual(isAnnual)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                      padding: '6px 14px', borderRadius: 'var(--radius-xs)', border: 'none',
                      background: on ? 'var(--color-surface-3)' : 'transparent',
                      color: on ? 'var(--color-ink-1)' : 'var(--color-ink-3)',
                      cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
                    }}
                  >
                    {isAnnual ? 'Annual' : 'Monthly'}
                    {isAnnual && (
                      <span className="vq-num" style={{ fontSize: 'var(--text-2xs)', color: on ? 'var(--color-up)' : 'var(--color-ink-4)' }}>
                        −20%
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          }
        />

        <div className="vq-tier-grid">
          {TIERS.map(tier => {
            const price = annual ? tier.annual : tier.monthly
            const isPro = tier.name === 'Pro'

            return (
              <div key={tier.name} style={{
                background: isPro ? 'var(--color-surface-1)' : 'transparent',
                padding: 'clamp(18px, 2vw, 26px)', minWidth: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                    letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-3)',
                  }}>{tier.name}</span>
                  {isPro && (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                      letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--color-ink-1)',
                    }}>Most popular</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', marginBottom: '6px' }}>
                  <span className="vq-num" style={{
                    fontSize: 'clamp(var(--text-3xl), 3.6vw, var(--text-d1))', lineHeight: 1,
                    letterSpacing: '-0.04em', color: 'var(--color-ink-1)',
                  }}>{price}</span>
                  <span style={{
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    color: 'var(--color-ink-4)', paddingBottom: '5px',
                  }}>{tier.period}</span>
                </div>

                <p style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>
                  {annual ? 'Annual billing' : 'Monthly billing'}
                </p>
                <p style={{ margin: '0 0 18px', minHeight: '17px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>
                  {annual && tier.annualNote ? tier.annualNote : ''}
                </p>

                <Link href={tier.href} style={{
                  display: 'block', textAlign: 'center', padding: '11px',
                  borderRadius: 'var(--radius-sm)', marginBottom: '6px',
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', textDecoration: 'none',
                  background: isPro ? 'var(--color-ink-1)' : 'transparent',
                  color: isPro ? 'var(--color-void)' : 'var(--color-ink-1)',
                  border: isPro ? '1px solid var(--color-ink-1)' : '1px solid var(--color-line-2)',
                }}>{tier.cta}</Link>

                {!tier.isFree ? (
                  <button onClick={() => setAnnual(a => !a)} style={{
                    display: 'block', width: '100%', margin: '0 0 18px', padding: '6px 0',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                    color: 'var(--color-ink-4)', textAlign: 'center',
                  }}>
                    {annual ? `or pay ${tier.monthly}/mo monthly` : `or save with annual — ${tier.annual}/mo`}
                  </button>
                ) : <div style={{ height: '18px' }} />}

                <div>
                  {tier.features.map((f, fi) => (
                    <div key={fi} style={{
                      display: 'flex', gap: '9px', alignItems: 'flex-start',
                      padding: '9px 0', borderTop: '1px solid var(--color-line-1)',
                    }}>
                      <span style={{
                        flexShrink: 0, marginTop: '2px', lineHeight: 1,
                        color: f.included ? 'var(--color-ink-1)' : 'var(--color-ink-4)',
                      }}>
                        {f.included
                          ? <Icon name="check" size={12} />
                          : <span aria-hidden style={{ display: 'block', width: '12px', height: '12px', textAlign: 'center' }}>–</span>}
                      </span>
                      <span style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', lineHeight: 1.5,
                        color: f.included ? 'var(--color-ink-2)' : 'var(--color-ink-4)',
                      }}>{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      <div className="vq-statband" style={{ borderTop: '1px solid var(--color-line-1)', borderBottom: '1px solid var(--color-line-1)' }}>
        {[
          ['Any MT5 broker', 'Demo or live, worldwide'],
          ['No manual entry', 'Syncs every 10 seconds'],
          ['Cancel any time', 'No lock-in, no questions'],
          ['Bank-level encryption', 'Your data stays private'],
        ].map(([label, sub]) => (
          <div key={label} style={{ padding: 'clamp(18px, 2.6vw, 26px) clamp(14px, 4vw, 32px)', minWidth: 0 }}>
            <p style={{ margin: '0 0 5px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)' }}>{label}</p>
            <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-3)' }}>{sub}</p>
          </div>
        ))}
      </div>

      <Section>
        <SectionHead label="Questions" title="Common questions" />
        <div style={{ maxWidth: '860px' }}>
          {FAQ.map((f, i) => (
            <div key={i} style={{ borderTop: '1px solid var(--color-line-1)', padding: '18px 0' }}>
              <p style={{ margin: '0 0 7px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)' }}>{f.q}</p>
              <p style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-3)', lineHeight: 1.7, maxWidth: '68ch' }}>{f.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section band>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(var(--text-2xl), 3.8vw, var(--text-d2))',
          lineHeight: 1.02, letterSpacing: '-0.035em', color: 'var(--color-ink-1)', margin: '0 0 14px',
        }}>
          Know your edge today.
        </h2>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
          color: 'var(--color-ink-3)', margin: '0 0 26px',
        }}>
          Free forever. No card needed.
        </p>
        <Link href="/login?mode=signup" style={inkButton}>Get started free</Link>
      </Section>

      <Footer />
    </div>
  )
}
