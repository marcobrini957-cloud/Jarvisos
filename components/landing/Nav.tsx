'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/ui/LogoMark'
import { useLocale } from '@/hooks/useLocale'

export function Nav() {
  const { t } = useLocale()
  const [scrolled,   setScrolled]   = useState(false)
  const [loggedIn,   setLoggedIn]   = useState(false)
  const [menuOpen,   setMenuOpen]   = useState(false)
  const [featOpen,   setFeatOpen]   = useState(false)
  const featRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!menuOpen) return
    const h = () => setMenuOpen(false)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [menuOpen])

  // Close features dropdown on outside click
  useEffect(() => {
    if (!featOpen) return
    const h = (e: MouseEvent) => {
      if (featRef.current && !featRef.current.contains(e.target as Node)) setFeatOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [featOpen])

  const FEATURES = [
    { icon: '◈', label: 'Overview', sub: 'P&L, win rate, net worth at a glance', href: '#features' },
    { icon: '◉', label: 'Trading', sub: 'Live positions, open trades, sync', href: '#features' },
    { icon: '▤', label: 'Journal', sub: 'Log trades, tag setups, review sessions', href: '#features' },
    { icon: '◆', label: 'Portfolio', sub: 'All accounts, all brokers in one view', href: '#features' },
    { icon: '◐', label: 'News', sub: 'Red-folder releases & economic calendar', href: '#features' },
    { icon: '✦', label: 'VELQUOR Analyst', sub: 'AI insights that read your trading', href: '#features' },
  ]

  const navLinkStyle = {
    color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', fontWeight: 500,
    textDecoration: 'none', padding: '6px 2px', whiteSpace: 'nowrap' as const,
    transition: 'color 0.15s',
    cursor: 'pointer', background: 'none', border: 'none',
  }

  return (
    <>
      {/* Mobile backdrop */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 98, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        />
      )}

      {/* Mobile slide-down menu */}
      <div className="sm:hidden" style={{
        position: 'fixed', top: '62px', left: 0, right: 0, zIndex: 99,
        background: 'rgba(5,5,8,0.98)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none',
        borderRadius: '0 0 20px 20px',
        transform: menuOpen ? 'translateY(0)' : 'translateY(calc(-100% - 62px))',
        transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
        padding: '12px 20px 28px',
        display: 'flex', flexDirection: 'column', gap: '2px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
      }}>
        {[['Features', '#features'], ['Pricing', '#pricing'], ['How it works', '#how'], ['FAQ', '#faq']].map(([label, href]) => (
          <a key={label} href={href} onClick={() => setMenuOpen(false)} style={{
            color: 'var(--t1)', fontSize: '17px', fontWeight: 500,
            textDecoration: 'none', padding: '14px 4px',
            borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'block',
          }}>{label}</a>
        ))}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
          <Link href="/login" onClick={() => setMenuOpen(false)} style={{
            color: 'var(--t1)', fontSize: '15px', fontWeight: 500,
            textDecoration: 'none', padding: '13px 18px', borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.12)', textAlign: 'center',
          }}>{t.nav.signIn}</Link>
          <Link href="/login?mode=signup" onClick={() => setMenuOpen(false)} style={{
            background: '#fff', color: '#000', fontSize: '15px', fontWeight: 700,
            textDecoration: 'none', padding: '14px 18px', borderRadius: '10px',
            textAlign: 'center',
          }}>{t.nav.getStarted}</Link>
        </div>
      </div>

      {/* Features mega-dropdown */}
      {featOpen && (
        <div ref={featRef} style={{
          position: 'fixed', top: '62px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 101, width: '680px', maxWidth: 'calc(100vw - 32px)',
          background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.09)',
          borderRadius: '16px', boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          animation: 'featDropIn 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`@keyframes featDropIn{from{opacity:0;transform:translateX(-50%) translateY(-8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
          <div style={{ display: 'flex' }}>
            {/* Left panel */}
            <div style={{
              width: '200px', flexShrink: 0, padding: '24px 20px',
              background: 'linear-gradient(160deg,#111 0%,#0a0a0a 100%)',
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#FFB830,#F5B040)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#000' }}>V</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#F2F2F2', lineHeight: 1.3 }}>Your trading OS.<br/>All in one place.</div>
              <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>Track every trade, session, and insight — live from your broker.</div>
              <Link href="/login?mode=signup" onClick={() => setFeatOpen(false)} style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 600, color: '#FFB830', textDecoration: 'none',
              }}>Get started →</Link>
            </div>
            {/* Right panel grid */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(255,255,255,0.06)' }}>
              {FEATURES.map((f) => (
                <a key={f.label} href={f.href} onClick={() => setFeatOpen(false)} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: '16px 18px',
                  background: '#0a0a0a', textDecoration: 'none',
                  transition: 'background 0.12s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#111')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#0a0a0a')}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(77,143,255,0.1)', border: '1px solid rgba(77,143,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#4D8FFF', flexShrink: 0 }}>{f.icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F2F2F2', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontSize: 11.5, color: '#555', lineHeight: 1.45 }}>{f.sub}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center',
        height: '62px',
        background: scrolled || menuOpen ? 'rgba(0,0,0,0.94)' : 'transparent',
        backdropFilter: scrolled || menuOpen ? 'blur(20px)' : 'none',
        borderBottom: scrolled || menuOpen ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
        transition: 'background 0.25s, border-color 0.25s, backdrop-filter 0.25s',
        padding: '0 20px',
        gap: '32px',
      }}>

        {/* Logo */}
        <button onClick={() => {
          setMenuOpen(false); setFeatOpen(false)
          if (loggedIn) window.location.href = '/dashboard'
          else window.scrollTo({ top: 0, behavior: 'smooth' })
        }} style={{
          display: 'flex', alignItems: 'center', gap: '9px',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: '8px',
            padding: '5px 10px 5px 7px',
          }}>
            <LogoMark size={22} />
            <span style={{ color: '#F2F2F2', fontWeight: 700, fontSize: '13.5px', letterSpacing: '0.02em' }}>VELQUOR</span>
          </div>
        </button>

        {/* Desktop center links */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '4px', flex: 1 }}>

          {/* Features dropdown trigger */}
          <button onClick={() => setFeatOpen(v => !v)} style={{
            ...navLinkStyle,
            display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '7px',
            color: featOpen ? '#F2F2F2' : 'rgba(255,255,255,0.65)',
            background: featOpen ? 'rgba(255,255,255,0.06)' : 'none',
          }}
            onMouseEnter={e => { if (!featOpen) e.currentTarget.style.color = '#F2F2F2' }}
            onMouseLeave={e => { if (!featOpen) e.currentTarget.style.color = 'rgba(255,255,255,0.65)' }}
          >
            Features
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ opacity: 0.55, transform: featOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
              <path d="M2 4l3.5 3.5L9 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Pricing */}
          <Link href="/pricing" style={{ ...navLinkStyle, padding: '6px 10px', borderRadius: '7px', display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none', color: 'rgba(255,255,255,0.65)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
          >
            Pricing
            <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,184,48,0.15)', color: '#FFB830', border: '1px solid rgba(255,184,48,0.25)', letterSpacing: '0.03em' }}>FREE</span>
          </Link>

          {[['How it works', '/#how'], ['FAQ', '/#faq']].map(([label, href]) => (
            <a key={label} href={href} style={{ ...navLinkStyle, padding: '6px 10px', borderRadius: '7px', textDecoration: 'none', color: 'rgba(255,255,255,0.65)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            >{label}</a>
          ))}

        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: 'auto' }}>
          {/* Desktop */}
          <div className="hidden sm:flex" style={{ alignItems: 'center', gap: '4px' }}>
            <Link href="/login" style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              color: 'rgba(255,255,255,0.65)', fontSize: '13.5px', fontWeight: 500,
              textDecoration: 'none', padding: '6px 12px', borderRadius: '7px',
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = '#F2F2F2')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.65)')}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.7 }}>
                <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M2.5 12c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {t.nav.signIn}
            </Link>
            <Link href="/login?mode=signup" style={{
              background: '#fff', color: '#000', fontSize: '13.5px', fontWeight: 700,
              textDecoration: 'none', padding: '7px 18px', borderRadius: '8px',
              whiteSpace: 'nowrap', transition: 'background 0.15s, box-shadow 0.15s',
              boxShadow: '0 2px 12px rgba(255,255,255,0.12)',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,255,255,0.2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(255,255,255,0.12)' }}
            >{t.nav.getStarted}</Link>
          </div>

          {/* Mobile hamburger */}
          <button className="sm:hidden" onClick={() => { setMenuOpen(v => !v); setFeatOpen(false) }}
            aria-label="Menu" style={{
              width: '36px', height: '36px', borderRadius: '9px',
              background: menuOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: menuOpen ? '0px' : '5px', cursor: 'pointer', padding: 0, transition: 'all 0.2s',
            }}>
            <span style={{ display: 'block', width: '15px', height: '1.5px', background: '#F2F2F2', borderRadius: '2px', transform: menuOpen ? 'rotate(45deg) translateY(0.75px)' : 'none', transition: 'transform 0.22s' }} />
            <span style={{ display: 'block', width: '15px', height: '1.5px', background: '#F2F2F2', borderRadius: '2px', transform: menuOpen ? 'rotate(-45deg) translateY(-0.75px)' : 'none', transition: 'transform 0.22s' }} />
          </button>
        </div>
      </nav>
    </>
  )
}

