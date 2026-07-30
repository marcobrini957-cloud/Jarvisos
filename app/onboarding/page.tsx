'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/ui/LogoMark'
import Icon, { type IconName } from '@/components/ui/Icon'
import EAConnectWizard from '@/components/ea/EAConnectWizard'

const STEPS = [
  { n: 1, title: 'Welcome to Velquor' },
  { n: 2, title: 'Connect your MT5 account' },
  { n: 3, title: 'Set your trading limits' },
  { n: 4, title: 'Meet VELQUOR AI' },
]

// ── Step 1 ────────────────────────────────────────────────────────────────────
function Step1({ userName, onNext }: { userName: string; onNext: () => void }) {
  // Icon.tsx is the only icon source in the product (DESIGN.md §2); these were
  // four emoji, which render differently on every OS and carry their own colour.
  const features: Array<{ icon: IconName; label: string; desc: string }> = [
    { icon: 'bolt',   label: 'MT5 auto-sync',  desc: 'Every trade pulled from MetaTrader 5 automatically' },
    { icon: 'spark',  label: 'VELQUOR AI',     desc: 'AI that analyses your specific trading patterns'    },
    { icon: 'chart',  label: 'Full analytics', desc: 'Win rate, P&L, and performance by setup and session' },
    { icon: 'trophy', label: 'Prop Firm mode', desc: 'Real-time tracking for any funded challenge'         },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div>
        <div style={{ marginBottom: '20px' }}>
          <LogoMark size={56} />
        </div>
        <h1 style={{ fontSize: '30px', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 10px', color: 'var(--t1)' }}>
          Welcome{userName ? `, ${userName}` : ''}
        </h1>
        <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
          You&apos;re setting up your personal trading OS. This takes about 2 minutes.
          You can skip any step and come back later from Settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {features.map(f => (
          <div key={f.label} style={{
            background: 'var(--s2)', border: '1px solid var(--bd)',
            borderRadius: '12px', padding: '16px',
          }}>
            <div style={{ color: 'var(--color-ink-3)', marginBottom: '10px' }}><Icon name={f.icon} size={17} /></div>
            <p style={{ margin: '0 0 4px', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>{f.label}</p>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.5 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      <button onClick={onNext} style={{
        width: '100%', padding: '14px', borderRadius: '10px',
        background: 'var(--color-ink-1)', border: 'none', color: 'var(--color-void)',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', cursor: 'pointer',
      }}>
        Let&apos;s get started
      </button>
    </div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────────
function Step2({ onNext }: { onNext: () => void }) {
  const [eaConnected, setEaConnected] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ color: 'var(--color-ink-3)', marginBottom: '14px' }}><Icon name="bolt" size={22} /></div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--t1)' }}>
          Install the VELQUOR EA
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          A small Expert Advisor runs inside MT5 and sends your data directly to VELQUOR — no third-party cloud access to your account.
        </p>
      </div>

      <EAConnectWizard onConnected={() => setEaConnected(true)} />

      <button onClick={onNext} style={{
        width: '100%', padding: '12px', borderRadius: '9px',
        background: eaConnected ? 'var(--color-ink-1)' : 'transparent',
        border: eaConnected ? 'none' : '1px solid var(--bd2)',
        color: eaConnected ? 'var(--color-void)' : 'var(--color-ink-2)',
        fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', cursor: 'pointer',
      }}>
        {eaConnected ? 'Continue' : 'Skip for now'}
      </button>
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────
function Step3({ onNext }: { onNext: () => void }) {
  const [dailyLimit, setDailyLimit] = useState('200')
  const [propEnabled, setPropEnabled] = useState(false)
  const [accountSize, setAccountSize] = useState('10000')
  const [saved, setSaved] = useState(false)

  function handleSave() {
    // Save daily limit to localStorage (matches DailyMaxLoss component)
    localStorage.setItem('velquor-daily-limit', dailyLimit)
    // Save prop firm config if enabled
    if (propEnabled) {
      const config = {
        enabled: true,
        accountSize: parseFloat(accountSize),
        maxDailyLossPct: 5,
        maxTotalDDPct: 10,
        profitTargetPct: 10,
        minTradingDays: 10,
        startingBalance: parseFloat(accountSize),
      }
      localStorage.setItem('velquor-prop-firm', JSON.stringify(config))
    }
    setSaved(true)
    setTimeout(onNext, 800)
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '9px',
    padding: '10px 13px', color: 'var(--t1)', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ color: 'var(--color-ink-3)', marginBottom: '14px' }}><Icon name="shield" size={22} /></div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--t1)' }}>
          Set your trading limits
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          These protect your account. You can change them anytime in the dashboard.
        </p>
      </div>

      <div>
        <label style={{ display: 'block', color: 'var(--t2)', fontSize: '12px', marginBottom: '5px', fontWeight: 500 }}>
          Daily max loss (€)
        </label>
        <input
          type="number" value={dailyLimit} onChange={e => setDailyLimit(e.target.value)}
          style={inputStyle}
          onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
          onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
        />
        <p style={{ margin: '6px 0 0', color: 'var(--t3)', fontSize: '11px' }}>
          VELQUOR will warn you when you&apos;re approaching this limit during the trading day.
        </p>
      </div>

      {/* Prop firm toggle */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: propEnabled ? '16px' : 0 }}>
          <div>
            <p style={{ margin: 0, color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>Prop Firm Mode</p>
            <p style={{ margin: '2px 0 0', color: 'var(--t2)', fontSize: '11px' }}>Track a funded challenge in real time</p>
          </div>
          <button
            onClick={() => setPropEnabled(!propEnabled)}
            style={{
              width: '40px', height: '22px', borderRadius: '11px', border: 'none', cursor: 'pointer',
              background: propEnabled ? 'var(--color-ink-1)' : 'var(--s3)',
              position: 'relative', transition: 'background 0.2s',
            }}
          >
            <span style={{
              position: 'absolute', top: '3px', left: propEnabled ? '20px' : '3px',
              width: '16px', height: '16px', borderRadius: '50%',
              background: propEnabled ? 'var(--color-void)' : 'var(--color-ink-2)',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
        {propEnabled && (
          <div>
            <label style={{ display: 'block', color: 'var(--t2)', fontSize: '12px', marginBottom: '5px', fontWeight: 500 }}>
              Account size (€)
            </label>
            <input
              type="number" value={accountSize} onChange={e => setAccountSize(e.target.value)}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
            />
            <p style={{ margin: '6px 0 0', color: 'var(--t3)', fontSize: '11px' }}>
              Default rules: 5% max daily loss, 10% max drawdown, 10% profit target. Customise in the dashboard.
            </p>
          </div>
        )}
      </div>

      {saved ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', color: 'var(--color-ink-2)', fontSize: 'var(--text-md)', padding: '12px' }}><Icon name="check" size={13} />Saved</div>
      ) : (
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onNext} style={{
            flex: 1, padding: '12px', borderRadius: '9px', background: 'transparent',
            border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: '13px', cursor: 'pointer',
          }}>Skip</button>
          <button onClick={handleSave} style={{
            flex: 2, padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--color-ink-1)',
            border: 'none', color: 'var(--color-void)', fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)', cursor: 'pointer',
          }}>Save & continue</button>
        </div>
      )}
    </div>
  )
}

// ── Step 4 ────────────────────────────────────────────────────────────────────
function Step4({ onFinish }: { onFinish: () => void }) {
  const quickActions = [
    'Full performance analysis — what\'s working?',
    'What setup wins most for me?',
    'Am I overtrading?',
    'How does my mood affect my P&L?',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <div style={{ marginBottom: '14px' }}><LogoMark size={40} /></div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--t1)' }}>
          Meet VELQUOR AI
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
          VELQUOR is your personal AI trading coach. It reads your trade history, journal entries, mood logs, and habits — and gives you analysis that&apos;s specific to your trading.
        </p>
      </div>

      <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoMark size={22} />
          <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>VELQUOR</span>
          <span style={{ color: 'var(--gr2)', fontSize: '10px', marginLeft: '2px' }}>● Online</span>
        </div>
        <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px' }}>Try asking VELQUOR:</p>
          {quickActions.map(q => (
            <div key={q} style={{
              padding: '9px 12px', borderRadius: '8px',
              background: 'rgba(77,143,255,0.07)', border: '1px solid rgba(77,143,255,0.15)',
              color: 'var(--t2)', fontSize: '12px', cursor: 'default',
            }}>→ {q}</div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '14px 16px', borderRadius: '10px',
        background: 'linear-gradient(135deg, rgba(77,143,255,0.06), rgba(168,126,255,0.06))',
        border: '1px solid rgba(77,143,255,0.15)',
      }}>
        <p style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>VELQUOR gets smarter over time</p>
        <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.5 }}>
          The more you trade, journal, and log your mood — the more personalised and accurate VELQUOR&apos;s analysis becomes. Start logging from day one.
        </p>
      </div>

      <button onClick={onFinish} style={{
        width: '100%', padding: '14px', borderRadius: '10px',
        background: 'var(--ac)', border: 'none', color: 'white',
        fontSize: '14px', fontWeight: 600, cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(77,143,255,0.3)',
      }}>
        Enter Velquor →
      </button>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }
      const name = data.user.user_metadata?.display_name
        || data.user.user_metadata?.full_name
        || data.user.email?.split('@')[0]
        || ''
      setUserName(name)
    })
  }, [router])

  function finish() {
    router.replace('/dashboard')
  }

  return (
    // body{overflow:hidden} in the root layout means this page must scroll
    // itself; the inner min-height:100% wrapper keeps short steps centred
    // without clipping the top of tall ones.
    <div className="vq2" style={{ height: '100dvh', overflowY: 'auto', background: 'var(--bg)' }}>
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '32px' }}>
          {STEPS.map(s => (
            <div key={s.n} style={{
              flex: 1, height: '3px', borderRadius: '2px',
              background: step >= s.n ? 'var(--ac)' : 'var(--s3)',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        {/* Step label */}
        <p style={{ color: 'var(--t3)', fontSize: '12px', margin: '0 0 24px', fontWeight: 500 }}>
          Step {step} of {STEPS.length} — {STEPS[step - 1].title}
        </p>

        {/* Step content */}
        <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', padding: '28px' }}>
          {step === 1 && <Step1 userName={userName} onNext={() => setStep(2)} />}
          {step === 2 && <Step2 onNext={() => setStep(3)} />}
          {step === 3 && <Step3 onNext={() => setStep(4)} />}
          {step === 4 && <Step4 onFinish={finish} />}
        </div>

        {/* Skip all */}
        {step < 4 && (
          <p style={{ textAlign: 'center', marginTop: '16px' }}>
            <button onClick={finish} style={{
              background: 'none', border: 'none', color: 'var(--t3)',
              fontSize: '12px', cursor: 'pointer', textDecoration: 'underline',
            }}>
              Skip setup — go straight to dashboard
            </button>
          </p>
        )}
        </div>
      </div>
    </div>
  )
}
