'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/ui/LogoMark'
import Icon from '@/components/ui/Icon'

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

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--s2)',
    border: '1px solid var(--color-line-1)',
    borderRadius: 'var(--radius-sm)',
    padding: '11px 12px',
    color: 'var(--color-ink-1)',
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-md)',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: 'var(--font-display)',
    fontSize: 'var(--text-2xs)',
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'var(--color-ink-3)',
    marginBottom: '7px',
  }

  const isDisabled = loading || !email || !password

  return (
    <div className="vq2" style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'inherit',
    }}>
      {/* ── Left panel ────────────────────────────────────────────────────
          Was the hero's decoration set again at half scale: Aurora bars, three
          radial glows, a blue badge pill, a blue→magenta gradient border with
          three coloured shadows around the preview, and green ticks against
          "Any MT5 Broker". The panel's job is to show the product, so it shows
          the product on a hairline. */}
      <div style={{
        display: 'none',
        width: '52%',
        flexShrink: 0,
        background: 'var(--color-void)',
        borderRight: '1px solid var(--color-line-1)',
        flexDirection: 'column',
      }} className="login-left-panel">
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 32px 24px' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '9px', textDecoration: 'none' }}>
            <LogoMark size={22} />
            <span style={{
              fontFamily: 'var(--font-mark)', fontSize: 'var(--text-xl)', lineHeight: 1,
              letterSpacing: '0.02em', textTransform: 'uppercase', color: 'var(--color-ink-1)',
            }}>Velquor</span>
          </Link>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '22px', paddingTop: '12px' }}>
            <p style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.16em', textTransform: 'uppercase',
              color: 'var(--color-ink-3)', margin: 0,
            }}>
              Built for serious MT5 traders
            </p>

            <div>
              <h2 style={{
                fontFamily: 'var(--font-display)', fontSize: 'clamp(var(--text-3xl),3.4vw,var(--text-d2))',
                lineHeight: 0.99, letterSpacing: '-0.035em', margin: '0 0 14px',
              }}>
                <span style={{ color: 'var(--color-ink-1)' }}>See the truth.</span><br />
                <span style={{ color: 'var(--color-ink-3)' }}>Trade the edge.</span>
              </h2>
              <p style={{
                margin: 0, fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                color: 'var(--color-ink-3)', lineHeight: 1.65, maxWidth: '46ch',
              }}>
                Connect your MT5 account and instantly see what&apos;s working, what&apos;s not, and exactly where you&apos;re leaking money.
              </p>
            </div>

            <div style={{
              border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-md)',
              overflow: 'hidden', background: 'var(--s1)',
            }}>
              <LoginDashboardPreview />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', paddingTop: '16px', borderTop: '1px solid var(--color-line-1)' }}>
            {['Any MT5 broker', 'Live & demo accounts', 'AI-powered', 'Free to start'].map(b => (
              <span key={b} style={{
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)',
                letterSpacing: '0.04em', color: 'var(--color-ink-3)',
              }}>{b}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ─────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg)',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          gap: '28px',
        }}>

          {/* Back link */}
          <Link href="/" style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            color: 'var(--t3)', fontSize: '12px', textDecoration: 'none',
            alignSelf: 'flex-start',
          }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
          >
            ← Back to home
          </Link>

          {/* Logo + heading */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <LogoMark size={48} />
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: 'var(--t1)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Velquor
              </h1>
              <p style={{ color: 'var(--t3)', fontSize: '13px', marginTop: '4px' }}>
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
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
                    background: 'var(--s2)', border: '1px solid var(--color-line-1)',
                    borderRadius: 'var(--radius-sm)', cursor: loading ? 'default' : 'pointer',
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
                <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
                <span style={{ color: 'var(--t3)', fontSize: '11px', flexShrink: 0 }}>or continue with email</span>
                <div style={{ flex: 1, height: '1px', background: 'var(--bd)' }} />
              </div>
            </>
          )}

          {/* Success message after signup */}
          {signedUp ? (
            <div style={{
              padding: '20px',
              background: 'var(--s1)',
              border: '1px solid var(--color-line-1)',
              borderRadius: 'var(--radius-md)',
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
                  color: 'var(--ac)', fontSize: '13px', cursor: 'pointer', fontWeight: 500,
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
                      onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
                    />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '12px', cursor: 'pointer', padding: 0 }}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
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
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--color-ink-1)',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      color: isDisabled ? 'var(--color-ink-4)' : 'var(--color-void)',
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      marginTop: '4px',
                    }}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
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
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--color-ink-1)',
                      border: 'none', borderRadius: 'var(--radius-sm)',
                      color: isDisabled ? 'var(--color-ink-4)' : 'var(--color-void)',
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                      cursor: isDisabled ? 'default' : 'pointer',
                      transition: 'all 0.15s',
                      marginTop: '4px',
                    }}
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
                        onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
                        onBlur={e  => (e.target.style.borderColor = 'var(--color-line-1)')}
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
                      style={{
                        width: '100%', padding: '13px',
                        background: loading || !email ? 'var(--s2)' : 'var(--color-ink-1)',
                        border: 'none', borderRadius: 'var(--radius-sm)',
                        color: loading || !email ? 'var(--color-ink-4)' : 'var(--color-void)',
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)',
                        cursor: loading || !email ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
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
              <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: '13px', margin: 0 }}>
                {mode === 'signin' ? (
                  <>Don&apos;t have an account?{' '}
                    <button
                      onClick={() => switchMode('signup')}
                      style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      style={{ background: 'none', border: 'none', color: 'var(--ac)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
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
      `}</style>
    </div>
  )
}
