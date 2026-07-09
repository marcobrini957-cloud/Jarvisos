import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'

export const metadata = { title: 'Pricing — VELQUOR', description: 'Simple, transparent pricing. Start free.' }

const TIERS = [
  {
    name: 'Starter',
    price: '€0',
    period: '/month',
    tagline: 'For traders getting started',
    cta: 'Start free',
    href: '/login?mode=signup',
    highlighted: false,
    features: [
      'Full trade journal — auto-synced from MT5',
      'Win rate, P&L, and session analytics',
      'Mood & habit tracking',
      '30-day trade history',
      '50 VELQUOR AI messages / month',
      'PDF reports (last 7 days)',
    ],
  },
  {
    name: 'Pro',
    price: '€29',
    period: '/month',
    tagline: 'For traders who trade to win',
    cta: 'Start 7-day free trial',
    href: '/login?mode=signup&plan=pro',
    highlighted: true,
    features: [
      'Everything in Starter, plus:',
      'Unlimited trade history',
      'Unlimited VELQUOR AI messages',
      'Prop Firm Mode (unlimited challenges)',
      'Advanced setup & session analytics',
      'Weekly AI performance reviews',
      'PDF reports — any date range',
      'Priority support',
    ],
  },
]

const FAQ = [
  { q: 'Do I need a credit card to start?', a: 'No. The Starter plan is free forever — no card required.' },
  { q: 'How does the MT5 sync work?', a: 'You install a tiny Expert Advisor inside MT5. It pushes your trades to VELQUOR every 10 seconds. No third-party cloud access to your broker account.' },
  { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your settings — no questions asked. Pro data is kept for 30 days after cancellation.' },
  { q: 'What brokers are supported?', a: 'Any MetaTrader 5 broker. The EA works with any MT5 account — demo or live.' },
  { q: 'Is my trading data private?', a: 'Your data is encrypted at rest in Supabase. The EA authenticates with a unique API key — nobody else can access your account data.' },
]

export default function PricingPage() {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', color: '#fff' }}>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px, 4vw, 48px)', height: '60px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(5,5,5,0.88)', backdropFilter: 'blur(12px)',
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
      <div style={{ textAlign: 'center', padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px) 48px', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: '#4D8FFF', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '14px' }}>
          Simple pricing
        </p>
        <h1 style={{ fontSize: 'clamp(32px, 7vw, 52px)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.05 }}>
          One tool.{' '}
          <span style={{ color: '#4D8FFF' }}>Two plans.</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '16px', lineHeight: 1.6, margin: 0 }}>
          Start free. Upgrade when you need more firepower.
        </p>
      </div>

      {/* Tier cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px', maxWidth: '820px', margin: '0 auto',
        padding: '0 clamp(16px, 5vw, 48px) 80px',
      }}>
        {TIERS.map(tier => (
          <div key={tier.name} style={{
            borderRadius: '20px', padding: '32px',
            position: 'relative',
            background: tier.highlighted
              ? 'linear-gradient(160deg, rgba(77,143,255,0.09) 0%, rgba(5,5,5,1) 70%)'
              : 'rgba(255,255,255,0.03)',
            border: `1px solid ${tier.highlighted ? 'rgba(77,143,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            boxShadow: tier.highlighted ? '0 0 0 1px rgba(77,143,255,0.1), 0 32px 80px rgba(0,0,0,0.5)' : 'none',
          }}>
            {tier.highlighted && (
              <div style={{
                position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                background: '#4D8FFF', color: '#fff', fontSize: '11px', fontWeight: 700,
                padding: '3px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(77,143,255,0.45)',
              }}>Most popular</div>
            )}

            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 10px' }}>{tier.name}</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', margin: '0 0 8px' }}>
              <span style={{ fontSize: '48px', fontWeight: 900, letterSpacing: '-0.04em', color: '#fff', lineHeight: 1 }}>{tier.price}</span>
              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '14px', paddingBottom: '8px' }}>{tier.period}</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: '0 0 28px', lineHeight: 1.5 }}>{tier.tagline}</p>

            <Link href={tier.href} style={{
              display: 'block', textAlign: 'center',
              padding: '13px', borderRadius: '10px',
              fontSize: '14px', fontWeight: 700, textDecoration: 'none', marginBottom: '26px',
              background: tier.highlighted ? '#fff' : 'rgba(255,255,255,0.07)',
              color: tier.highlighted ? '#000' : '#fff',
              border: tier.highlighted ? 'none' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: tier.highlighted ? '0 4px 20px rgba(255,255,255,0.15)' : 'none',
              transition: 'opacity 0.14s',
            }}>{tier.cta}</Link>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tier.features.map(f => (
                <div key={f} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: tier.highlighted ? '#4D8FFF' : 'rgba(0,232,122,0.9)', fontSize: '12px', flexShrink: 0, marginTop: '2px' }}>✓</span>
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '13px', lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Trust badges */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '32px', justifyContent: 'center',
        padding: '0 clamp(16px, 5vw, 48px) 80px',
      }}>
        {[
          ['🔒', 'Bank-level encryption', 'Your data stays yours'],
          ['⚡', 'Real-time sync', 'Every 10 seconds from MT5'],
          ['🏦', 'Any MT5 broker', 'Demo or live accounts'],
          ['🛡', 'Cancel anytime', 'No lock-in, no questions'],
        ].map(([icon, label, sub]) => (
          <div key={label as string} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '22px', marginBottom: '6px' }}>{icon}</div>
            <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 600 }}>{label}</p>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div style={{
        maxWidth: '620px', margin: '0 auto',
        padding: '0 clamp(16px, 5vw, 48px) 100px',
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 32px', textAlign: 'center' }}>Common questions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
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
        textAlign: 'center', padding: 'clamp(48px, 8vw, 80px) clamp(16px, 5vw, 48px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h2 style={{ fontSize: 'clamp(24px, 5vw, 36px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          Start knowing your edge today.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 28px' }}>Free forever. No card needed.</p>
        <Link href="/login?mode=signup" style={{
          display: 'inline-block', padding: '14px 36px', borderRadius: '12px',
          background: '#fff', color: '#000', fontSize: '15px', fontWeight: 700,
          textDecoration: 'none', boxShadow: '0 8px 32px rgba(255,255,255,0.12)',
        }}>Get started free →</Link>
      </div>
    </div>
  )
}
