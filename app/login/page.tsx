'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/ui/LogoMark'
import Icon from '@/components/ui/Icon'
import { Atmosphere } from '@/components/landing/v2/Atmosphere'
import { MarketClock } from '@/components/landing/v2/MarketClock'

type Mode = 'signin' | 'signup' | 'reset'


import dynamic from 'next/dynamic'

const LoginDashboardPreview = dynamic(
  () => import('@/components/login/LoginDashboardPreview').then(m => m.LoginDashboardPreview)
)

// ── Google Identity Services (native ID-token flow) ─────────────────────────
// Runs Google sign-in on velquor.app itself instead of redirecting through
// supabase.co, so Google's consent screen shows our own domain — no custom-domain
// add-on required. Supabase already trusts this (web) client ID, so the ID token
// exchanges directly via signInWithIdToken.
const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  || '42227403634-tnt1qj65togu9s067ugfgek9jciru5d5.apps.googleusercontent.com'

// ON by default now that velquor.app + http://localhost:3000 are Authorized
// JavaScript origins on the Google OAuth client. Escape hatch: set
// NEXT_PUBLIC_GOOGLE_GIS=off to fall back to the supabase redirect flow without
// a code change (GIS also auto-falls-back if the script fails to load).
const GIS_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_GIS !== 'off'

// Only run the native flow on hosts registered as Authorized JS origins on the
// Google client. Vercel preview URLs (*.vercel.app) aren't — Google forbids
// wildcards — so there we fall back to the supabase redirect flow.
const GIS_ALLOWED_HOSTS = new Set(['velquor.app', 'localhost', '127.0.0.1'])

type GoogleIdApi = {
  initialize(cfg: {
    client_id: string
    callback: (res: { credential: string }) => void
    nonce?: string
    use_fedcm_for_prompt?: boolean
    cancel_on_tap_outside?: boolean
  }): void
  renderButton(parent: HTMLElement, opts: Record<string, unknown>): void
  prompt(): void
}
declare global {
  interface Window { google?: { accounts?: { id?: GoogleIdApi } } }
}

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const existing = document.getElementById('gis-script')
    if (existing) { existing.addEventListener('load', () => resolve()); return }
    const s = document.createElement('script')
    s.id = 'gis-script'
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google sign-in failed to load'))
    document.head.appendChild(s)
  })
}

// Google embeds a HASHED nonce in the ID token; we hand Supabase the RAW one and
// it re-hashes to verify — guards against token replay.
async function makeNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = crypto.randomUUID() + crypto.randomUUID()
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  const hashed = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
  return { raw, hashed }
}

// Turn raw Supabase auth errors into guidance. Key case: a user who signed up
// with Google later tries email+password (they never set one) — Supabase returns
// a generic "invalid credentials", so we nudge them toward the Google button.
function friendlyAuthError(msg: string, mode: 'signin' | 'signup'): string {
  const m = msg.toLowerCase()
  if (m.includes('email not confirmed')) {
    return 'Please confirm your email first — check your inbox for the confirmation link we sent.'
  }
  if (mode === 'signin' && (m.includes('invalid login') || m.includes('invalid credentials'))) {
    return 'Wrong email or password. If you signed up with Google, use "Continue with Google" above instead.'
  }
  if (mode === 'signup' && (m.includes('already registered') || m.includes('already exists') || m.includes('user already'))) {
    return 'An account with this email already exists. Try signing in — or use "Continue with Google" if you signed up that way.'
  }
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('signin')

  // Sign-in state
  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  // Sign-up extra
  const [displayName, setDisplayName] = useState('')
  const [signedUp,    setSignedUp]    = useState(false)
  const [resetSent,   setResetSent]   = useState(false)

  // Google Identity Services
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const nonceRef     = useRef<string>('')
  const [gisReady, setGisReady] = useState(false)

  // Root layout locks overflow:hidden for the dashboard — unlock so the form
  // stays reachable on small phones (and under the cookie banner)
  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.documentElement.style.overflow = 'auto'
    return () => {
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
    // Pre-fill mode from URL param
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
    // Surface auth redirect failures (e.g. from /auth/callback) instead of
    // silently dropping the user back on the form
    const authError = params.get('error')
    if (authError) {
      setError(
        authError === 'auth_callback_failed'
          ? 'Sign-in could not be completed. Please try again.'
          : `Sign-in failed (${authError.replace(/[_-]/g, ' ')}). Please try again.`
      )
    }
  }, [router])

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) setError(authError.message)
    } finally {
      setLoading(false)
    }
  }

  // Native Google flow: exchange the ID token from GIS for a Supabase session.
  async function handleGoogleCredential(response: { credential: string }) {
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: nonceRef.current,
      })
      if (authError) setError(authError.message)
      else router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  // Load Google Identity Services once and wire up the native ID-token flow.
  useEffect(() => {
    if (!GIS_ENABLED) return
    if (!GIS_ALLOWED_HOSTS.has(window.location.hostname)) return
    let cancelled = false
    ;(async () => {
      try {
        const { raw, hashed } = await makeNonce()
        nonceRef.current = raw
        await loadGis()
        if (cancelled) return
        const id = window.google?.accounts?.id
        if (!id) return
        id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          nonce: hashed,
          use_fedcm_for_prompt: true,
          cancel_on_tap_outside: true,
        })
        setGisReady(true)
        id.prompt() // Google One Tap
      } catch {
        // GIS unavailable → the fallback redirect button stays usable.
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // (Re)render Google's button whenever the Google area is visible.
  useEffect(() => {
    if (!gisReady || signedUp || mode === 'reset') return
    const id = window.google?.accounts?.id
    const el = googleBtnRef.current
    if (!id || !el) return
    el.innerHTML = ''
    id.renderButton(el, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: mode === 'signup' ? 'signup_with' : 'signin_with',
      shape: 'pill',
      logo_alignment: 'center',
      width: 336,
    })
  }, [gisReady, mode, signedUp])

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setSignedUp(false)
    setResetSent(false)
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email)
      if (authError) setError(authError.message)
      else setResetSent(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) setError(friendlyAuthError(authError.message, 'signin'))
      else router.replace('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || 'Trader' },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (authError) setError(friendlyAuthError(authError.message, 'signup'))
      else setSignedUp(true)
    } finally {
      setLoading(false)
    }
  }

  // Fields on the landing's language: glass over the shader rather than a solid
  // panel, and the same +0.28em micro-caps the sections use for their eyebrows.
  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,0.045)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: '10px',
    padding: '13px 14px',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontSize: '15px',
    letterSpacing: '-0.01em',
    outline: 'none',
    transition: 'border-color 0.2s, background 0.2s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.42)',
    marginBottom: '9px',
  }

  // The primary action, matching the landing's white pill.
  const primaryBtn = (disabled: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '14px',
    background: disabled ? 'rgba(255,255,255,0.09)' : '#fff',
    border: '1px solid transparent',
    borderRadius: '999px',
    color: disabled ? 'rgba(255,255,255,0.38)' : '#000',
    fontFamily: 'var(--font-display)',
    fontSize: '15px',
    letterSpacing: '-0.01em',
    cursor: disabled ? 'default' : 'pointer',
    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), background 0.2s',
  })

  // Quiet inline links. The landing has no accent-coloured CTA and this page
  // should not reintroduce one — white on dark, weight carried by contrast.
  const linkBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontFamily: 'var(--font-display)', fontSize: '13px',
    color: 'rgba(255,255,255,0.86)', textDecoration: 'underline',
    textUnderlineOffset: '3px', textDecorationColor: 'rgba(255,255,255,0.28)',
  }

  const isDisabled = loading || !email || !password

  return (
    <div className="vq2" style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#05070a',
      display: 'flex',
      fontFamily: 'inherit',
    }}>
      {/* The landing's shader, behind the whole page. Sign-in is the first
          screen after the front door, so it should feel like the same room —
          the old page dropped you onto flat grey the moment you clicked. */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Atmosphere />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, rgba(5,7,10,0.10) 0%, rgba(5,7,10,0.55) 46%, rgba(5,7,10,0.88) 100%)',
        }} />
      </div>

      {/* ── Left panel: the product ─────────────────────────────────────── */}
      <div style={{
        display: 'none',
        position: 'relative',
        zIndex: 1,
        width: '52%',
        flexShrink: 0,
        flexDirection: 'column',
      }} className="login-left-panel">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 32px 24px' }}>
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px', textDecoration: 'none',
            alignSelf: 'flex-start',
          }}>
            <LogoMark size={26} showBackground={false} />
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '18px', lineHeight: 1,
              letterSpacing: '0.04em', color: '#fff',
            }}>VELQUOR</span>
          </Link>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '26px', paddingTop: '12px' }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '0.28em', textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.40)', margin: 0,
            }}>
              Built for serious MT5 traders
            </p>

            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(34px, 3.8vw, 56px)',
                lineHeight: 1.02, letterSpacing: '-0.035em', margin: '0 0 18px', color: '#fff',
              }}>
                See the truth.<br />
                <span style={{ color: 'rgba(255,255,255,0.46)' }}>Trade the edge.</span>
              </h2>
              <p style={{
                margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(15px, 1.2vw, 18px)',
                color: 'rgba(255,255,255,0.66)', lineHeight: 1.45,
                letterSpacing: '-0.015em', maxWidth: '44ch',
              }}>
                Connect MetaTrader once and see what is working, what is not, and
                exactly where you are giving money back.
              </p>
            </div>

            {/* The replica in a lit case, the same treatment the landing gives it. */}
            <div style={{ position: 'relative' }}>
              <div aria-hidden style={{
                position: 'absolute', inset: '-10% -5% -14%',
                background: 'radial-gradient(58% 50% at 50% 10%, rgba(77,143,255,0.18), transparent 70%)',
                filter: 'blur(26px)', pointerEvents: 'none',
              }} />
              <div style={{
                position: 'relative',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                overflow: 'hidden',
                background: 'rgba(6,9,14,0.80)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                boxShadow: '0 40px 90px -45px rgba(0,0,0,0.95)',
              }}>
                <div aria-hidden style={{
                  position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px',
                  background: 'linear-gradient(90deg, transparent, rgba(180,210,255,0.75), transparent)',
                }} />
                <LoginDashboardPreview />
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex', gap: '20px', flexWrap: 'wrap', paddingTop: '18px',
            borderTop: '1px solid rgba(255,255,255,0.10)',
          }}>
            {['Any MT5 broker', 'Live & demo accounts', 'Free to start'].map(b => (
              <span key={b} style={{
                fontFamily: 'var(--font-mono)', fontSize: '11px',
                letterSpacing: '0.06em', color: 'rgba(255,255,255,0.34)',
              }}>{b}</span>
            ))}
            <span style={{ marginLeft: 'auto' }}><MarketClock /></span>
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'clamp(20px, 4vw, 40px)',
      }}>
        <div className="login-card" style={{
          width: '100%',
          maxWidth: '420px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          // Glass, so the shader stays faintly visible through the form and
          // this reads as the same surface language as the landing.
          background: 'rgba(255,255,255,0.035)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: '18px',
          padding: 'clamp(24px, 3vw, 36px)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          boxShadow: '0 50px 100px -50px rgba(0,0,0,0.95)',
        }}>

          {/* Back link */}
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            color: 'rgba(255,255,255,0.44)', fontFamily: 'var(--font-display)',
            fontSize: '13px', letterSpacing: '-0.01em', textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.80)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.44)')}
          >
            ← Back to home
          </Link>

          {/* Mark + heading. Ranged left, like every other heading on the site —
              the centred logo-over-centred-title stack was the template look. */}
          <div className="login-head" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <LogoMark size={40} showBackground={false} />
            <div style={{ minWidth: 0 }}>
              <h1 style={{
                margin: 0, color: '#fff', fontFamily: 'var(--font-display)',
                fontSize: 'clamp(22px, 2.2vw, 28px)', lineHeight: 1.05,
                letterSpacing: '-0.032em',
              }}>
                {mode === 'signin' ? 'Welcome back.' : mode === 'signup' ? 'Create your account.' : 'Reset your password.'}
              </h1>
              <p style={{
                margin: '6px 0 0', color: 'rgba(255,255,255,0.48)',
                fontFamily: 'var(--font-display)', fontSize: '14px', letterSpacing: '-0.01em',
              }}>
                {mode === 'signin' ? 'Your trades are already logged.' : mode === 'signup' ? 'Free forever. No card.' : 'We will email you a link.'}
              </p>
            </div>
          </div>

          {/* Google sign-in — native GIS button (shows velquor.app), with the
              supabase redirect flow as an automatic fallback if GIS can't load */}
          {!signedUp && mode !== 'reset' && (
            <>
              {gisReady ? (
                <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }} />
              ) : (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '12px 16px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '999px', cursor: loading ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    color: 'var(--t1)', fontSize: '14px', fontWeight: 500,
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--bd3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd2)')}
                >
                  {/* Google G logo */}
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continue with Google
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
                <span style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.08em', flexShrink: 0 }}>or continue with email</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.10)' }} />
              </div>
            </>
          )}

          {/* Success message after signup */}
          {signedUp ? (
            <div style={{
              padding: '20px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: '12px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: 'var(--color-ink-2)' }}><Icon name="mail" size={20} /></span>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)', margin: 0 }}>
                Check your email
              </p>
              <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                We sent a confirmation link to <strong style={{ color: 'var(--t1)' }}>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={() => switchMode('signin')}
                style={{
                  marginTop: '8px', background: 'none', border: 'none',
                  color: 'rgba(255,255,255,0.86)', fontSize: '13px', cursor: 'pointer',
                }}
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Sign-in form */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        style={{ ...linkBtn, fontSize: '12px' }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--color-down)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                      background: 'var(--color-down-dim)',
                      border: '1px solid var(--color-down-dim)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{ ...primaryBtn(isDisabled), marginTop: '4px' }}
                  >
                    {loading ? 'Signing in…' : 'Sign in'}
                  </button>
                </form>
              )}

              {/* Sign-up form */}
              {mode === 'signup' && (
                <form onSubmit={handleSignUp} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Trader"
                      autoComplete="name"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                      onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--color-down)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                      background: 'var(--color-down-dim)',
                      border: '1px solid var(--color-down-dim)',
                      borderRadius: 'var(--radius-sm)', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{ ...primaryBtn(isDisabled), marginTop: '4px' }}
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </button>
                </form>
              )}

              {/* Reset password form */}
              {mode === 'reset' && (
                resetSent ? (
                  <div style={{
                    padding: '20px',
                    background: 'var(--s1)',
                    border: '1px solid var(--color-line-1)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                  }}>
                    <span style={{ color: 'var(--color-ink-2)' }}><Icon name="mail" size={20} /></span>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--color-ink-1)', margin: 0 }}>Check your email</p>
                    <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      Password reset link sent to <strong style={{ color: 'var(--t1)' }}>{email}</strong>.
                    </p>
                    <button onClick={() => switchMode('signin')} style={{ marginTop: '8px', background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <p style={{ color: 'var(--t2)', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
                      Enter your email and we&apos;ll send you a reset link.
                    </p>
                    <div>
                      <label style={labelStyle}>Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        style={inputStyle}
                        onFocus={e => (e.target.style.borderColor = 'rgba(255,255,255,0.34)')}
                        onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.11)')}
                      />
                    </div>
                    {error && (
                      <p style={{ color: 'var(--color-down)', fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', background: 'var(--color-down-dim)', border: '1px solid var(--color-down-dim)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', margin: 0 }}>
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email}
                      style={primaryBtn(loading || !email)}
                    >
                      {loading ? 'Sending…' : 'Send reset link'}
                    </button>
                    <button onClick={() => switchMode('signin')} type="button" style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: '13px', cursor: 'pointer' }}>
                      Back to sign in
                    </button>
                  </form>
                )
              )}

              {/* Toggle mode */}
              {mode !== 'reset' && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.44)', fontFamily: 'var(--font-display)', fontSize: '13px', margin: 0 }}>
                {mode === 'signin' ? (
                  <>Don&apos;t have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      style={linkBtn}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      style={linkBtn}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inline responsive styles for left panel */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel { display: flex !important; }
        }
        /* align-items needs !important: the element carries an inline
           alignItems:'center', which beats a stylesheet rule regardless of the
           media query — the heading stayed centred over left-aligned labels. */
        @media (max-width: 420px) {
          .login-head { flex-direction: column; align-items: flex-start !important; gap: 12px; }
        }
        .login-card button[type="submit"]:not(:disabled):hover { transform: translateY(-1px); }
      `}</style>
    </div>
  )
}
