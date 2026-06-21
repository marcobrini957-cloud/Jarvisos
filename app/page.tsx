'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── Intro splash ──────────────────────────────────────────────────────────────
function IntroSplash({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'zoom'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 600)
    const t2 = setTimeout(() => setPhase('zoom'), 1400)
    const t3 = setTimeout(() => onDone(),         2000)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  return (
    <>
      <style>{`
        @keyframes splash-in {
          0%   { opacity: 0; transform: scale(0.7); }
          60%  { opacity: 1; transform: scale(1.04); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes splash-zoom {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(14); }
        }
        @keyframes glow-pulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.12); }
        }
        @keyframes tagline-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 999,
        background: '#000',
        opacity: phase === 'zoom' ? 0 : 1,
        transition: phase === 'zoom' ? 'opacity 0.55s ease 0.1s' : 'none',
        pointerEvents: phase === 'zoom' ? 'none' : 'all',
      }} />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column',
        pointerEvents: 'none',
        animation: phase === 'zoom' ? 'splash-zoom 0.6s cubic-bezier(0.55,0,1,0.45) forwards' : 'none',
      }}>
        {phase === 'hold' && (
          <div style={{
            position: 'absolute',
            width: '320px', height: '320px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,152,10,0.22) 0%, transparent 68%)',
            animation: 'glow-pulse 1.2s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px',
          animation: phase === 'in' ? 'splash-in 0.6s cubic-bezier(0.34,1.4,0.64,1) forwards' : 'none',
        }}>
          <div style={{
            width: '96px', height: '96px',
            background: 'linear-gradient(145deg, var(--go2), var(--go))',
            borderRadius: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '48px',
            boxShadow: phase === 'hold'
              ? '0 0 0 1px rgba(255,184,48,0.25), 0 12px 60px rgba(232,152,10,0.55), 0 0 120px rgba(232,152,10,0.2)'
              : '0 8px 40px rgba(232,152,10,0.4)',
            transition: 'box-shadow 0.5s ease',
          }}>⬡</div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#F2F2F2', fontWeight: 800, fontSize: '32px', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Velquor
            </div>
            <div style={{
              color: '#505050', fontSize: '11px', marginTop: '10px',
              letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500,
              opacity: phase === 'hold' ? 1 : 0,
              animation: phase === 'hold' ? 'tagline-in 0.4s ease forwards' : 'none',
            }}>
              Your Trading Operating System
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Animated counter ──────────────────────────────────────────────────────────
function Counter({ target, prefix = '', suffix = '', decimals = 0 }: {
  target: number; prefix?: string; suffix?: string; decimals?: number
}) {
  const [val, setVal] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      obs.disconnect()
      let start = 0
      const step = target / 60
      const t = setInterval(() => {
        start = Math.min(start + step, target)
        setVal(start)
        if (start >= target) clearInterval(t)
      }, 16)
    })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{prefix}{val.toFixed(decimals)}{suffix}</span>
}

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  const trades = [
    { symbol: 'XAUUSD', type: 'BUY',  pnl: +142.50 },
    { symbol: 'NAS100', type: 'SELL', pnl: -38.20  },
    { symbol: 'XAUUSD', type: 'BUY',  pnl: +88.00  },
    { symbol: 'NAS100', type: 'BUY',  pnl: +195.00 },
  ]
  const points = [30, 45, 38, 60, 52, 75, 65, 88, 78, 95, 85, 100]
  const w = 280, h = 60
  const xs = points.map((_, i) => (i / (points.length - 1)) * w)
  const ys = points.map(p => h - (p / 100) * h)
  const path = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`

  return (
    <div style={{
      width: '100%', maxWidth: '540px',
      background: 'var(--s1)', border: '1px solid var(--bd)',
      borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
    }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '22px', height: '22px',
            background: 'linear-gradient(145deg, var(--go2), var(--go))',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px',
          }}>⬡</div>
          <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>Velquor</span>
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {['Overview', 'Trading', 'Journal', 'Macro', 'Jarvis'].map(t => (
            <span key={t} style={{
              fontSize: '10px', padding: '3px 8px', borderRadius: '5px',
              color: t === 'Overview' ? 'var(--ac)' : 'var(--t3)',
              background: t === 'Overview' ? 'rgba(77,143,255,0.12)' : 'transparent',
              whiteSpace: 'nowrap',
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[
            { label: 'Today P&L', value: '+€408.70', color: 'var(--gr2)' },
            { label: 'Win Rate',  value: '80%',      color: 'var(--ac)' },
            { label: 'Balance',   value: '€12,408',  color: 'var(--t1)' },
          ].map(m => (
            <div key={m.label} style={{
              background: 'var(--s2)', borderRadius: '8px', padding: '9px 11px', border: '1px solid var(--bd)',
            }}>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '9px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ margin: '3px 0 0', color: m.color, fontSize: '13px', fontWeight: 600 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '11px', border: '1px solid var(--bd)' }}>
          <p style={{ margin: '0 0 6px', color: 'var(--t2)', fontSize: '10px', fontWeight: 500 }}>Weekly P&L</p>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '44px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--ac)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="var(--ac)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill="url(#cg)" />
            <path d={path} fill="none" stroke="var(--ac)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Trades */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid var(--bd)', overflow: 'hidden' }}>
          <p style={{ margin: 0, padding: '8px 11px', borderBottom: '1px solid var(--bd)', color: 'var(--t2)', fontSize: '9px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Trades</p>
          {trades.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 11px', borderBottom: i < trades.length - 1 ? '1px solid var(--bd)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{
                  fontSize: '9px', padding: '2px 5px', borderRadius: '4px', fontWeight: 600,
                  background: t.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)',
                  color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)',
                }}>{t.type}</span>
                <span style={{ color: 'var(--t1)', fontSize: '11px', fontWeight: 500 }}>{t.symbol}</span>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 600, color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)' }}>
                {t.pnl >= 0 ? '+' : ''}€{t.pnl.toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Jarvis insight */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(77,143,255,0.07), rgba(168,126,255,0.07))',
          border: '1px solid rgba(77,143,255,0.18)', borderRadius: '8px', padding: '10px 12px',
          display: 'flex', gap: '8px', alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: '13px' }}>⬡</span>
          <p style={{ margin: 0, color: 'var(--t2)', fontSize: '11px', lineHeight: 1.5 }}>
            <strong style={{ color: 'var(--ac)' }}>Jarvis:</strong> Your XAUUSD win rate is 83% — highest of any instrument. Consider scaling up on ICT Order Block setups during London session.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data }) => {
        if (data.user) setLoggedIn(true)
      })
    })
  }, [])

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: '56px',
      background: scrolled ? 'rgba(0,0,0,0.88)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--bd)' : '1px solid transparent',
      transition: 'all 0.25s',
      padding: '0 16px',
    }}>
      {/* Logo */}
      <button
        onClick={() => {
          if (loggedIn) {
            window.location.href = '/dashboard'
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      >
        <div style={{
          width: '28px', height: '28px',
          background: 'linear-gradient(145deg, var(--go2), var(--go))',
          borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px',
          boxShadow: '0 4px 12px rgba(232,152,10,0.4)',
        }}>⬡</div>
        <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '14px', letterSpacing: '-0.01em' }}>
          Velquor
        </span>
      </button>

      {/* Desktop nav links — hidden on mobile */}
      <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '28px' }}>
        {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']].map(([l, h]) => (
          <a key={l} href={h} style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 500, textDecoration: 'none' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t1)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}
          >{l}</a>
        ))}
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <Link href="/login" style={{ color: 'var(--t2)', fontSize: '13px', fontWeight: 500, textDecoration: 'none', padding: '8px 10px' }}>
          Sign in
        </Link>
        <Link href="/login?mode=signup" style={{
          background: 'var(--ac)', color: 'white', fontSize: '12px', fontWeight: 600,
          textDecoration: 'none', padding: '8px 14px', borderRadius: '8px',
          boxShadow: '0 4px 16px rgba(77,143,255,0.3)',
          whiteSpace: 'nowrap',
        }}>Get Started</Link>
      </div>
    </nav>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ padding: 'clamp(40px, 8vw, 80px) clamp(16px, 5vw, 48px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(32px, 5vw, 64px)' }}>
        {/* Text */}
        <div style={{ flex: '1 1 280px', maxWidth: '480px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '4px 12px', borderRadius: '20px', marginBottom: '24px',
            background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.25)',
          }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--ac)', display: 'block' }} />
            <span style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 500 }}>Built for serious MT5 traders</span>
          </div>

          <h1 style={{
            fontSize: 'clamp(36px, 8vw, 54px)', fontWeight: 800, lineHeight: 1.08,
            letterSpacing: '-0.04em', margin: '0 0 20px', color: 'var(--t1)',
          }}>
            Your Trading<br />
            <span style={{
              background: 'linear-gradient(90deg, var(--go2) 0%, var(--ac) 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>Operating System</span>
          </h1>

          <p style={{ fontSize: 'clamp(14px, 3vw, 16px)', color: 'var(--t2)', lineHeight: 1.7, margin: '0 0 32px' }}>
            Most traders lose money without knowing why. They blame the market, tweak their entries,
            and repeat the same mistakes. Connect your MT5 account and get the one thing they&apos;re
            missing — a clear, data-driven picture of your real patterns, real edge, and real leaks.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '28px' }}>
            <Link href="/login?mode=signup" style={{
              background: 'var(--ac)', color: 'white', padding: '13px 24px', borderRadius: '10px',
              fontSize: '14px', fontWeight: 600, textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(77,143,255,0.35)', whiteSpace: 'nowrap',
            }}>Start free — no card needed →</Link>
            <a href="#showcase" style={{ color: 'var(--t2)', fontSize: '14px', fontWeight: 500, textDecoration: 'none', padding: '13px 0' }}>
              See inside ↓
            </a>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {['Any MT5 Broker', 'Live & Demo Accounts', 'AI-Powered', 'Mobile PWA'].map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>✓</span>
                <span style={{ color: 'var(--t3)', fontSize: '12px' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mockup */}
        <div style={{ flex: '1 1 280px', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', minWidth: 0 }}>
          <div style={{
            position: 'absolute', width: 'min(450px, 100%)', height: 'min(450px, 100%)',
            background: 'radial-gradient(circle, rgba(77,143,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%', pointerEvents: 'none',
          }} />
          <div style={{ width: '100%', maxWidth: '480px' }}>
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function StatsBar() {
  return (
    <div style={{ borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)', background: 'var(--s1)' }}>
      <div className="grid grid-cols-2 sm:grid-cols-4" style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: 'clamp(24px, 5vw, 32px) clamp(16px, 5vw, 48px)',
        gap: '24px',
      }}>
        {[
          { label: 'Trades tracked', value: 50000, suffix: '+' },
          { label: 'Avg win rate uplift', value: 23, suffix: '%', prefix: '+' },
          { label: 'MT5 sync time', value: 1.2, suffix: 's', decimals: 1 },
          { label: 'AI insights per week', value: 12, suffix: '' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(26px, 6vw, 34px)', fontWeight: 800, color: 'var(--t1)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              <Counter target={s.value} prefix={s.prefix ?? ''} suffix={s.suffix} decimals={s.decimals ?? 0} />
            </div>
            <div style={{ color: 'var(--t3)', fontSize: '12px', marginTop: '6px' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Trading Tab Showcase ──────────────────────────────────────────────────────
function TradingTabMockup() {
  const tradeRows = [
    { symbol: 'XAUUSD', type: 'BUY',  open: '08:14', close: '10:32', setup: 'Order Block',    emotion: 'confident', pnl: +284.50, tags: ['London', 'ICT'] },
    { symbol: 'NAS100', type: 'SELL', open: '15:31', close: '15:58', setup: 'BOS / CHoCH',    emotion: 'neutral',   pnl: -112.20, tags: ['NY open', 'FOMO'] },
    { symbol: 'XAUUSD', type: 'BUY',  open: '09:02', close: '11:14', setup: 'Fair Value Gap', emotion: 'confident', pnl: +196.00, tags: ['London'] },
    { symbol: 'EURUSD', type: 'BUY',  open: '13:20', close: '14:05', setup: 'Support / Res',  emotion: 'neutral',   pnl: +44.80,  tags: ['NY'] },
    { symbol: 'NAS100', type: 'BUY',  open: '16:10', close: '17:30', setup: 'Trend Follow',   emotion: 'anxious',   pnl: -88.30,  tags: ['Revenge'] },
  ]
  const emotionColor: Record<string, string> = {
    confident: 'var(--gr2)', neutral: 'var(--t2)', anxious: 'var(--am2)', tired: 'var(--re)',
  }

  const equity = [10000, 10284, 10172, 10368, 10413, 10325, 10237, 10433, 10580, 10491, 10627, 10715]
  const w = 560, h = 80
  const min = Math.min(...equity), max = Math.max(...equity)
  const xs = equity.map((_, i) => (i / (equity.length - 1)) * w)
  const ys = equity.map(v => h - ((v - min) / (max - min)) * (h * 0.85) - h * 0.07)
  const linePath = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x},${ys[i]}`).join(' ')
  const areaPath = `${linePath} L${w},${h} L0,${h} Z`

  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px', overflow: 'hidden',
      boxShadow: '0 40px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
    }}>
      {/* Topbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 16px', borderBottom: '1px solid var(--bd)', background: 'var(--bg)',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'nowrap', overflow: 'hidden' }}>
          {['Overview', 'Trading', 'Journal', 'Macro', 'Jarvis'].map(t => (
            <span key={t} style={{
              fontSize: '10px', padding: '3px 7px', borderRadius: '5px',
              color: t === 'Trading' ? 'var(--ac)' : 'var(--t3)',
              background: t === 'Trading' ? 'rgba(77,143,255,0.12)' : 'transparent',
              fontWeight: t === 'Trading' ? 600 : 400,
              whiteSpace: 'nowrap',
            }}>{t}</span>
          ))}
        </div>
        <div className="hidden sm:flex" style={{ gap: '3px' }}>
          {['Today', 'Week', 'Month', 'All'].map(p => (
            <span key={p} style={{
              fontSize: '9px', padding: '3px 7px', borderRadius: '4px', cursor: 'default',
              color: p === 'Month' ? 'var(--t1)' : 'var(--t3)',
              background: p === 'Month' ? 'var(--s3)' : 'transparent',
              border: p === 'Month' ? '1px solid var(--bd2)' : '1px solid transparent',
            }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Metrics */}
        <div className="grid grid-cols-3 sm:grid-cols-5" style={{ gap: '8px' }}>
          {[
            { label: 'Total P&L',    value: '+€1,824', color: 'var(--gr2)' },
            { label: 'Win Rate',     value: '67%',     color: 'var(--ac)' },
            { label: 'Profit Factor',value: '2.14',    color: 'var(--am2)' },
            { label: 'Avg Win',      value: '+€240',   color: 'var(--gr)' },
            { label: 'Avg Loss',     value: '−€100',   color: 'var(--re)' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--s2)', borderRadius: '8px', padding: '9px 8px', border: '1px solid var(--bd)' }}>
              <p style={{ margin: 0, color: 'var(--t3)', fontSize: '8px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</p>
              <p style={{ margin: '3px 0 0', color: m.color, fontSize: '12px', fontWeight: 700 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Equity curve */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', padding: '12px', border: '1px solid var(--bd)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '10px', fontWeight: 500 }}>Equity Curve</p>
            <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px', fontWeight: 600 }}>+€1,824 this month</p>
          </div>
          <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '56px', overflow: 'visible' }}>
            <defs>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gr2)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--gr2)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#eqGrad)" />
            <path d={linePath} fill="none" stroke="var(--gr2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3" fill="var(--gr2)" />
          </svg>
        </div>

        {/* Trade table — scrollable on mobile */}
        <div style={{ background: 'var(--s2)', borderRadius: '8px', border: '1px solid var(--bd)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '80px 50px 70px 110px 80px 1fr 60px',
              padding: '6px 11px', borderBottom: '1px solid var(--bd)',
              color: 'var(--t3)', fontSize: '8px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              minWidth: '460px',
            }}>
              <span>Symbol</span><span>Side</span><span>Time</span><span>Setup</span><span>Emotion</span><span>Tags</span><span style={{ textAlign: 'right' }}>P&L</span>
            </div>
            {tradeRows.map((t, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '80px 50px 70px 110px 80px 1fr 60px',
                padding: '7px 11px', borderBottom: i < tradeRows.length - 1 ? '1px solid var(--bd)' : 'none',
                alignItems: 'center', minWidth: '460px',
              }}>
                <span style={{ color: 'var(--t1)', fontSize: '10px', fontWeight: 600 }}>{t.symbol}</span>
                <span style={{
                  fontSize: '8px', padding: '2px 5px', borderRadius: '3px', fontWeight: 600, width: 'fit-content',
                  background: t.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)',
                  color: t.type === 'BUY' ? 'var(--gr2)' : 'var(--re)',
                }}>{t.type}</span>
                <span style={{ color: 'var(--t3)', fontSize: '9px' }}>{t.open}–{t.close}</span>
                <span style={{ color: 'var(--t2)', fontSize: '9px' }}>{t.setup}</span>
                <span style={{ color: emotionColor[t.emotion], fontSize: '9px', fontWeight: 500 }}>{t.emotion}</span>
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                  {t.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: '8px', padding: '1px 5px', borderRadius: '3px',
                      background: 'var(--s3)', color: 'var(--t3)', border: '1px solid var(--bd)',
                    }}>{tag}</span>
                  ))}
                </div>
                <span style={{
                  textAlign: 'right', fontSize: '10px', fontWeight: 700,
                  color: t.pnl >= 0 ? 'var(--gr2)' : 'var(--re)',
                }}>{t.pnl >= 0 ? '+' : ''}€{Math.abs(t.pnl).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ShowcaseSection() {
  return (
    <section id="showcase" style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Inside the dashboard</p>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>
          This is what your trading actually looks like
        </h2>
        <p style={{ color: 'var(--t2)', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Every trade annotated. Setup type, emotion, tags. An equity curve that shows your real growth.
          The data most traders never see about themselves.
        </p>
      </div>

      <TradingTabMockup />

      <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', marginTop: '24px' }}>
        {[
          { icon: '📎', title: 'Annotate every trade', desc: 'Tag each trade with setup type, pre-trade emotion, and mistake labels. The pattern becomes obvious fast.' },
          { icon: '📈', title: 'Real equity curve', desc: 'Not just a P&L number — a visual equity curve that shows exactly when you\'re growing and when you\'re giving it back.' },
          { icon: '🔍', title: 'Filter by anything', desc: 'Slice your performance by instrument, session, setup, or emotion. Find what\'s actually working for you specifically.' },
        ].map(c => (
          <div key={c.title} style={{
            background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '20px',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '10px' }}>{c.icon}</div>
            <h3 style={{ margin: '0 0 6px', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>{c.title}</h3>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: '⚡', color: 'var(--go2)', title: 'MT5 Sync — Any Broker', desc: 'Enter your MT5 login, password, and broker server — your full trade history syncs in seconds. No CSV exports, no copy-paste, no manual data entry. Works with every MT5 broker worldwide.' },
    { icon: '⬡', color: 'var(--ac)', title: 'Jarvis AI Coach', desc: 'Ask "why am I losing on Nasdaq?" and get an answer built from your own numbers — not generic YouTube advice. Jarvis reads every trade, every journal entry, and every emotion tag you\'ve ever logged.' },
    { icon: '🌐', color: 'var(--pu)', title: 'Macro Intelligence', desc: 'Economic data, central bank decisions, and geopolitical events — explained plainly before each session. Jarvis generates a daily directional bias for Gold, Nasdaq, and EUR/USD so you know what you\'re trading into.' },
    { icon: '🛡', color: 'var(--re)', title: 'Daily Loss Guard', desc: 'Set the maximum amount you\'re willing to lose in a single day. Jarvis watches every closed trade and fires a warning before you hit your limit — the discipline rule most traders say they follow but don\'t.' },
    { icon: '🏆', color: 'var(--gr2)', title: 'Prop Firm Tracker', desc: 'Running an FTMO, TFT, or MyFundedFX challenge? Set your rules once. Jarvis tracks your max daily loss, total drawdown, profit target, and minimum trading days in real time — so one bad session never ends your challenge.' },
    { icon: '📓', color: 'var(--am2)', title: 'Trading Journal', desc: 'Tag every trade with your setup type, pre-trade emotion, and mistake labels. After 30 days you\'ll see the exact emotional states and patterns that produce your best — and worst — results.' },
    { icon: '📊', color: 'var(--cy)', title: 'Deep Performance Analytics', desc: 'A full breakdown of your win rate, profit factor, expectancy, and avg P&L — sliced by instrument, session, day of week, setup type, and emotion. Stop guessing where your edge is. The data tells you.' },
    { icon: '🔄', color: 'var(--pu2)', title: 'Weekly Reviews', desc: 'Every Sunday, grade your trading week from A to F, log what worked, and note what to fix. Over months, you build a compound record of your growth — and a clear signal when you\'re drifting from your process.' },
    { icon: '✅', color: 'var(--gr)', title: 'Habits & Discipline Score', desc: 'The best traders don\'t just have good setups — they have consistent daily routines. Track your pre-market checklist, journaling streak, and risk limits. Your Discipline Score makes process visible before P&L does.' },
  ]

  return (
    <section id="features" style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Everything in one place</p>
        <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>Every tool a serious trader needs</h2>
        <p style={{ color: 'var(--t2)', fontSize: '16px', maxWidth: '500px', margin: '0 auto', lineHeight: 1.6 }}>
          Whether you trade Gold, indices, or forex — on a live account or a prop firm challenge — everything here is built around one question: why are you winning, and where are you leaking?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: '14px' }}>
        {features.map(f => (
          <div key={f.title} style={{
            background: 'var(--s1)', border: '1px solid var(--bd)',
            borderRadius: '14px', padding: '22px', cursor: 'default',
            transition: 'border-color 0.2s, transform 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--bd2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', marginBottom: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
              background: `color-mix(in srgb, ${f.color} 15%, transparent)`,
              border: `1px solid color-mix(in srgb, ${f.color} 30%, transparent)`,
            }}>{f.icon}</div>
            <h3 style={{ margin: '0 0 7px', color: 'var(--t1)', fontSize: '14px', fontWeight: 600 }}>{f.title}</h3>
            <p style={{ margin: 0, color: 'var(--t2)', fontSize: '12px', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create your free account', desc: 'Sign up with email or Google in under 30 seconds. No credit card, no commitment.', detail: 'Your data is fully private and isolated — secured with row-level encryption from day one.' },
    { n: '02', title: 'Connect your MT5 account', desc: 'Enter your MT5 login number, investor password, and broker server name. That\'s it — your entire trade history syncs automatically.', detail: 'Works with every MT5 broker worldwide — IC Markets, Blueberry, Pepperstone, FTMO live accounts, and more.' },
    { n: '03', title: 'See your real numbers', desc: 'Your dashboard fills instantly. Win rate, profit factor, P&L by instrument, session, and day of week — all calculated from your actual trades.', detail: 'Jarvis AI immediately surfaces your biggest patterns and the areas costing you the most money.' },
    { n: '04', title: 'Build a consistent process', desc: 'Journal every trade, track your daily habits, run weekly reviews. Over time, Jarvis correlates your routine with your results.', detail: 'Most traders identify their biggest leak within the first week of using the journal and analytics together.' },
  ]

  return (
    <section id="how" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      background: 'var(--s1)', borderTop: '1px solid var(--bd)', borderBottom: '1px solid var(--bd)',
    }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>How it works</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>Up and running in under 2 minutes</h2>
          <p style={{ color: 'var(--t2)', fontSize: '16px', maxWidth: '400px', margin: '0 auto' }}>No spreadsheets. No CSV exports. No manual data entry. Just connect your MT5 and trade.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: '24px', position: 'relative' }}>
          {steps.map(s => (
            <div key={s.n}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '12px', marginBottom: '18px',
                background: 'var(--bg)', border: '1px solid var(--bd2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '12px', color: 'var(--ac)',
                position: 'relative', zIndex: 1,
              }}>{s.n}</div>
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
          }}>Start your free account →</Link>
        </div>
      </div>
    </section>
  )
}

// ── Jarvis AI section ─────────────────────────────────────────────────────────
function JarvisSection() {
  const [active, setActive] = useState(0)
  const qa = [
    { q: 'Why am I losing on Nasdaq?', a: 'Your NAS100 trades show a 38% win rate — below breakeven. 6 of your 8 losses came in the first 30 minutes after NY open. You\'re likely trading against institutional order flow before direction is established. Consider a 30-minute wait rule after 15:30 CET.' },
    { q: "What's my best setup?", a: 'ICT Order Block setups on XAUUSD are your strongest edge — 78% win rate, avg +€142 per trade. They perform best during London session between 08:00–11:00 CET. This is where you should be focused.' },
    { q: 'Am I overtrading?', a: 'Yes — your Friday trade count is 2.3x your daily average, with a win rate of 31% vs 67% Mon–Thu. Friday P&L is –€340 this month alone. Consider a strict Friday morning-only rule, max 2 trades.' },
    { q: 'How does mood affect my P&L?', a: "When you log mood as 'confident', avg P&L is +€89/trade. When 'anxious' or 'tired', it drops to –€47. Your 3 worst losing streaks all started on low-energy days. Your energy score is a leading indicator of your performance." },
  ]

  return (
    <section style={{ padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 6vw, 72px)', alignItems: 'center' }}>
        <div>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Jarvis AI</p>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 16px', color: 'var(--t1)', lineHeight: 1.15 }}>
            An AI that actually knows your trading
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.7, margin: '0 0 28px' }}>
            Jarvis has access to every trade, every journal entry, every mood log.
            It doesn&apos;t give generic advice — it analyses <em>your</em> data and tells you
            exactly what&apos;s holding you back.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {qa.map((item, i) => (
              <button key={i} onClick={() => setActive(i)} style={{
                textAlign: 'left', padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                background: active === i ? 'rgba(77,143,255,0.1)' : 'transparent',
                border: active === i ? '1px solid rgba(77,143,255,0.3)' : '1px solid transparent',
                color: active === i ? 'var(--t1)' : 'var(--t2)',
                fontSize: '13px', transition: 'all 0.15s',
              }}>
                {active === i ? '→ ' : ''}{item.q}
              </button>
            ))}
          </div>
        </div>

        {/* Chat mockup */}
        <div style={{
          background: 'var(--s1)', border: '1px solid var(--bd)',
          borderRadius: '16px', overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '7px',
              background: 'linear-gradient(145deg, var(--ac), var(--pu))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px',
            }}>⬡</div>
            <div>
              <p style={{ margin: 0, color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>Jarvis</p>
              <p style={{ margin: 0, color: 'var(--gr2)', fontSize: '10px' }}>● Online</p>
            </div>
          </div>

          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ background: 'var(--ac)', color: 'white', padding: '9px 13px', borderRadius: '11px 11px 2px 11px', fontSize: '13px', maxWidth: '80%' }}>
                {qa[active].q}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
              <div style={{
                width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0,
                background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
              }}>⬡</div>
              <div style={{
                background: 'var(--s2)', border: '1px solid var(--bd)',
                padding: '11px 13px', borderRadius: '2px 11px 11px 11px',
                fontSize: '12px', color: 'var(--t2)', lineHeight: 1.65, maxWidth: '85%',
              }}>
                {qa[active].a}
              </div>
            </div>
          </div>

          <div style={{ padding: '11px 14px', borderTop: '1px solid var(--bd)' }}>
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '9px', padding: '9px 13px',
            }}>
              <span style={{ color: 'var(--t3)', fontSize: '12px', flex: 1 }}>Ask Jarvis anything…</span>
              <span style={{ background: 'var(--ac)', color: 'white', fontSize: '10px', padding: '3px 9px', borderRadius: '5px', fontWeight: 500 }}>Send</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Prop Firm section ─────────────────────────────────────────────────────────
function PropFirmSection() {
  return (
    <section style={{ padding: '0 clamp(16px, 5vw, 48px) clamp(60px, 10vw, 100px)', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,255,133,0.04) 0%, rgba(77,143,255,0.04) 100%)',
        border: '1px solid rgba(0,255,133,0.15)', borderRadius: '20px',
        padding: 'clamp(28px, 5vw, 56px) clamp(20px, 5vw, 60px)',
      }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(32px, 5vw, 60px)', alignItems: 'center' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px',
              borderRadius: '20px', marginBottom: '20px',
              background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.25)',
            }}>
              <span style={{ color: 'var(--gr2)', fontSize: '12px', fontWeight: 500 }}>🏆 Prop Firm Mode</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px, 5vw, 34px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)', lineHeight: 1.2 }}>
              Also running a prop firm challenge?
            </h2>
            <p style={{ color: 'var(--t2)', fontSize: '14px', lineHeight: 1.7, margin: '0 0 22px' }}>
              Activate Prop Firm Mode and Jarvis monitors every rule of your challenge in real time —
              max daily loss, total drawdown, profit target, minimum trading days. One wrong day won&apos;t
              catch you off guard again.
            </p>
            {['FTMO', 'The Funded Trader', 'MyFundedFX', 'E8 Funding', 'Any custom rules'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ color: 'var(--gr2)', fontSize: '11px' }}>✓</span>
                <span style={{ color: 'var(--t2)', fontSize: '13px' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '14px', padding: '22px' }}>
            <p style={{ margin: '0 0 18px', color: 'var(--t1)', fontSize: '13px', fontWeight: 600 }}>FTMO Challenge — Phase 1</p>
            {[
              { label: 'Profit Target',   current: 6.8, max: 10,  color: 'var(--gr2)', unit: '%' },
              { label: 'Max Daily Loss',  current: 1.2, max: 5,   color: 'var(--go2)', unit: '%' },
              { label: 'Max Drawdown',    current: 2.1, max: 10,  color: 'var(--ac)',  unit: '%' },
              { label: 'Trading Days',    current: 7,   max: 10,  color: 'var(--pu)',  unit: ' days' },
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
            <div style={{
              marginTop: '16px', padding: '9px 12px', borderRadius: '8px',
              background: 'rgba(0,255,133,0.07)', border: '1px solid rgba(0,255,133,0.18)',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}>
              <span style={{ color: 'var(--gr2)', fontSize: '13px' }}>●</span>
              <span style={{ color: 'var(--gr2)', fontSize: '11px', fontWeight: 500 }}>On track — 3 days to target at current pace</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────
function Pricing() {
  const [annual, setAnnual] = useState(false)

  const tiers = [
    {
      name: 'Starter',
      price: { monthly: 0, annual: 0 },
      tagline: 'Get started with the basics',
      cta: 'Start free',
      ctaHref: '/login?mode=signup',
      accent: 'var(--bd2)',
      highlighted: false,
      features: [
        '1 MT5 account',
        'Last 90 days of trade history',
        'Basic P&L, win rate & stats',
        'Trade journal',
        'Habits tracker',
        '20 Jarvis AI questions / month',
        'Mobile PWA',
      ],
    },
    {
      name: 'Pro',
      price: { monthly: 19, annual: 14 },
      tagline: 'For traders who are serious about improving',
      cta: 'Start Pro free for 7 days',
      ctaHref: '/login?mode=signup',
      accent: 'var(--ac)',
      highlighted: true,
      badge: 'Most popular',
      features: [
        '1 MT5 account',
        'Full trade history — unlimited',
        'All analytics (emotion, setup, session, radar)',
        'Equity curve + drawdown tracking',
        'Macro intelligence + AI daily bias',
        'Weekly reviews & grading',
        'Performance report exports (CSV / PDF)',
        '300 Jarvis AI questions / month',
        'Priority sync — every 30 seconds',
      ],
    },
    {
      name: 'Elite',
      price: { monthly: 39, annual: 29 },
      tagline: 'For funded traders and full-time professionals',
      cta: 'Get Elite',
      ctaHref: '/login?mode=signup',
      accent: 'var(--go2)',
      highlighted: false,
      features: [
        'Up to 3 MT5 accounts',
        'Everything in Pro',
        'Prop firm challenge tracker (FTMO, TFT, MFF…)',
        'Custom daily loss limits & drawdown alerts',
        'Unlimited Jarvis AI — no monthly cap',
        'Multi-account P&L overview',
        'Priority support',
      ],
    },
  ]

  return (
    <section id="pricing" style={{
      padding: 'clamp(60px, 10vw, 100px) clamp(16px, 5vw, 48px)',
      borderTop: '1px solid var(--bd)', background: 'var(--s1)',
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ color: 'var(--ac)', fontSize: '12px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Pricing</p>
          <h2 style={{ fontSize: 'clamp(28px, 6vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 14px', color: 'var(--t1)' }}>
            Simple, transparent pricing
          </h2>
          <p style={{ color: 'var(--t2)', fontSize: '15px', lineHeight: 1.6, margin: '0 auto 28px', maxWidth: '460px' }}>
            Start free. Upgrade when you need more. No hidden fees, no usage surprises — just one flat monthly rate.
          </p>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '4px', borderRadius: '10px', background: 'var(--s2)', border: '1px solid var(--bd)' }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: !annual ? 'var(--bg)' : 'transparent',
                color: !annual ? 'var(--t1)' : 'var(--t3)',
                boxShadow: !annual ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>Monthly</button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '6px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                background: annual ? 'var(--bg)' : 'transparent',
                color: annual ? 'var(--t1)' : 'var(--t3)',
                boxShadow: annual ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
              }}>Annual <span style={{ color: 'var(--gr2)', fontSize: '11px', fontWeight: 600 }}>save ~30%</span></button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: '16px', alignItems: 'start' }}>
          {tiers.map(tier => {
            const price = annual ? tier.price.annual : tier.price.monthly
            return (
              <div
                key={tier.name}
                style={{
                  background: tier.highlighted ? 'linear-gradient(160deg, rgba(77,143,255,0.07) 0%, var(--s1) 60%)' : 'var(--s1)',
                  border: `1px solid ${tier.highlighted ? 'rgba(77,143,255,0.35)' : 'var(--bd)'}`,
                  borderRadius: '16px',
                  padding: '28px',
                  position: 'relative',
                  boxShadow: tier.highlighted ? '0 0 0 1px rgba(77,143,255,0.12), 0 24px 60px rgba(0,0,0,0.3)' : 'none',
                }}>

                {tier.badge && (
                  <div style={{
                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                    background: 'var(--ac)', color: 'white', fontSize: '11px', fontWeight: 600,
                    padding: '3px 14px', borderRadius: '20px', whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(77,143,255,0.4)',
                  }}>{tier.badge}</div>
                )}

                <p style={{ color: 'var(--t3)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px' }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', margin: '0 0 6px' }}>
                  <span style={{ fontSize: '40px', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1 }}>
                    {price === 0 ? 'Free' : `€${price}`}
                  </span>
                  {price > 0 && (
                    <span style={{ color: 'var(--t3)', fontSize: '13px', paddingBottom: '6px' }}>/ month</span>
                  )}
                </div>
                {price > 0 && annual && (
                  <p style={{ color: 'var(--t3)', fontSize: '11px', margin: '0 0 10px' }}>billed €{price * 12} / year</p>
                )}
                <p style={{ color: 'var(--t3)', fontSize: '12px', margin: '0 0 24px', lineHeight: 1.5 }}>{tier.tagline}</p>

                <Link href={tier.ctaHref} style={{
                  display: 'block', textAlign: 'center',
                  padding: '11px', borderRadius: '9px',
                  fontSize: '13px', fontWeight: 600, textDecoration: 'none',
                  background: tier.highlighted ? 'var(--ac)' : 'var(--s2)',
                  color: tier.highlighted ? 'white' : 'var(--t1)',
                  border: tier.highlighted ? 'none' : '1px solid var(--bd2)',
                  marginBottom: '22px',
                  boxShadow: tier.highlighted ? '0 4px 16px rgba(77,143,255,0.3)' : 'none',
                }}>{tier.cta}</Link>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  {tier.features.map(f => (
                    <div key={f} style={{ display: 'flex', gap: '9px', alignItems: 'flex-start' }}>
                      <span style={{ color: tier.highlighted ? 'var(--ac)' : 'var(--gr2)', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>✓</span>
                      <span style={{ color: 'var(--t2)', fontSize: '12px', lineHeight: 1.5 }}>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '12px', marginTop: '28px', lineHeight: 1.6 }}>
          All plans include a 7-day free trial. Cancel any time — no questions asked. Prices in EUR, VAT may apply.
        </p>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--bd)',
      padding: 'clamp(20px, 4vw, 28px) clamp(16px, 5vw, 48px)',
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
      gap: '16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '20px', height: '20px', borderRadius: '5px',
          background: 'linear-gradient(145deg, var(--go2), var(--go))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px',
        }}>⬡</div>
        <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Velquor © 2026</span>
      </div>
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        {['Privacy', 'Terms', 'Contact'].map(l => (
          <a key={l} href="#" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>{l}</a>
        ))}
        <Link href="/impressum" style={{ color: 'var(--t3)', fontSize: '12px', textDecoration: 'none' }}>Impressum</Link>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem('velquor-intro-seen')) {
      setShowSplash(true)
    }
  }, [])

  function handleSplashDone() {
    sessionStorage.setItem('velquor-intro-seen', '1')
    setShowSplash(false)
  }

  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    document.body.style.overflowX = 'hidden'
    document.documentElement.style.overflowX = 'hidden'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.overflowX = ''
      document.documentElement.style.overflowX = ''
    }
  }, [])

  return (
    <>
      {showSplash && <IntroSplash onDone={handleSplashDone} />}
      <div style={{ background: 'var(--bg)', color: 'var(--t1)', overflowX: 'hidden' }}>
        <Nav />
        <Hero />
        <StatsBar />
        <ShowcaseSection />
        <Features />
        <HowItWorks />
        <JarvisSection />
        <PropFirmSection />
        <Pricing />
        <Footer />
      </div>
    </>
  )
}
