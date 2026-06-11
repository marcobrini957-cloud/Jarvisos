'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
  }, [router])

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
                Jarvis OS
              </h1>
              <p style={{ color: 'var(--t3)', fontSize: '13px', marginTop: '4px' }}>
                {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
              </p>
            </div>
          </div>

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
