'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup' | 'reset'

const FEATURES = [
  { icon: '📊', text: 'Real-time MT5 sync' },
  { icon: '🧠', text: 'AI trade analysis' },
  { icon: '📓', text: 'Mood & journal tracking' },
  { icon: '💼', text: 'Portfolio tracker' },
]

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

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/dashboard')
    })
    // Pre-fill mode from URL param
    const params = new URLSearchParams(window.location.search)
    if (params.get('mode') === 'signup') setMode('signup')
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
      if (authError) setError(authError.message)
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
        },
      })
      if (authError) setError(authError.message)
      else setSignedUp(true)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--s2)',
    border: '1px solid var(--bd2)',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'var(--t1)',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: 'var(--t2)',
    fontSize: '12px',
    marginBottom: '6px',
    fontWeight: 500,
  }

  const isDisabled = loading || !email || !password

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      fontFamily: 'inherit',
    }}>
      {/* ── Left panel (decorative, hidden on mobile) ─────────────────── */}
      <div style={{
        display: 'none',
        width: '45%',
        flexShrink: 0,
        background: 'var(--s1)',
        borderRight: '1px solid var(--bd)',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 44px',
      }} className="login-left-panel">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px', height: '36px',
            background: 'linear-gradient(145deg, var(--go2) 0%, var(--go) 100%)',
            borderRadius: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px',
            boxShadow: '0 4px 16px rgba(232,152,10,0.4)',
          }}>
            ⬡
          </div>
          <div>
            <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>Jarvis</span>
            <span style={{ color: 'var(--t3)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginLeft: '5px' }}>OS</span>
          </div>
        </div>

        {/* Main copy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <h2 style={{
            fontSize: '36px', fontWeight: 700, color: 'var(--t1)',
            letterSpacing: '-0.035em', lineHeight: 1.2, margin: 0,
          }}>
            Trade smarter.<br />
            <span style={{
              background: 'linear-gradient(90deg, var(--go2) 0%, var(--go) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>Not harder.</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {FEATURES.map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', flexShrink: 0,
                }}>
                  {f.icon}
                </span>
                <span style={{ color: 'var(--t2)', fontSize: '14px', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tagline */}
        <p style={{ color: 'var(--t3)', fontSize: '12px', fontStyle: 'italic', lineHeight: 1.6 }}>
          "Used by traders who take their edge seriously."
        </p>
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
            <div style={{
              width: '48px', height: '48px',
              background: 'linear-gradient(145deg, var(--go2) 0%, var(--go) 100%)',
              borderRadius: '14px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
              boxShadow: '0 4px 20px rgba(200,133,26,0.35)',
            }}>
              ⬡
            </div>
            <div style={{ textAlign: 'center' }}>
              <h1 style={{ color: 'var(--t1)', fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
                Velquor
              </h1>
              <p style={{ color: 'var(--t3)', fontSize: '13px', marginTop: '4px' }}>
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>
          </div>

          {/* Google OAuth — shown on signin/signup, not reset */}
          {!signedUp && mode !== 'reset' && (
            <>
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'var(--s2)', border: '1px solid var(--bd2)',
                  borderRadius: '10px', cursor: loading ? 'default' : 'pointer',
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
              background: 'rgba(0,217,110,0.08)',
              border: '1px solid rgba(0,217,110,0.2)',
              borderRadius: '12px',
              textAlign: 'center',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}>
              <span style={{ fontSize: '24px' }}>✉️</span>
              <p style={{ color: 'var(--gr2)', fontSize: '14px', fontWeight: 600, margin: 0 }}>
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
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--re)', fontSize: '13px',
                      background: 'rgba(255,51,71,0.08)',
                      border: '1px solid rgba(255,51,71,0.2)',
                      borderRadius: '8px', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--ac)',
                      border: 'none', borderRadius: '10px',
                      color: isDisabled ? 'var(--t3)' : 'white',
                      fontSize: '14px', fontWeight: 600,
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
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
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
                      onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                      onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                    />
                  </div>

                  {error && (
                    <p style={{
                      color: 'var(--re)', fontSize: '13px',
                      background: 'rgba(255,51,71,0.08)',
                      border: '1px solid rgba(255,51,71,0.2)',
                      borderRadius: '8px', padding: '10px 12px', margin: 0,
                    }}>
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isDisabled}
                    style={{
                      width: '100%', padding: '13px',
                      background: isDisabled ? 'var(--s2)' : 'var(--ac)',
                      border: 'none', borderRadius: '10px',
                      color: isDisabled ? 'var(--t3)' : 'white',
                      fontSize: '14px', fontWeight: 600,
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
                    background: 'rgba(0,217,110,0.08)',
                    border: '1px solid rgba(0,217,110,0.2)',
                    borderRadius: '12px',
                    textAlign: 'center',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}>
                    <span style={{ fontSize: '24px' }}>✉️</span>
                    <p style={{ color: 'var(--gr2)', fontSize: '14px', fontWeight: 600, margin: 0 }}>Check your email</p>
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
                        onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                        onBlur={e  => (e.target.style.borderColor = 'var(--bd2)')}
                      />
                    </div>
                    {error && (
                      <p style={{ color: 'var(--re)', fontSize: '13px', background: 'rgba(255,51,71,0.08)', border: '1px solid rgba(255,51,71,0.2)', borderRadius: '8px', padding: '10px 12px', margin: 0 }}>
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !email}
                      style={{
                        width: '100%', padding: '13px',
                        background: loading || !email ? 'var(--s2)' : 'var(--ac)',
                        border: 'none', borderRadius: '10px',
                        color: loading || !email ? 'var(--t3)' : 'white',
                        fontSize: '14px', fontWeight: 600,
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
