'use client'
import { useState, useTransition } from 'react'
import { verifyDevPassword } from './actions'
import { LogoMark } from '@/components/ui/LogoMark'

export default function DevLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    startTransition(async () => {
      const ok = await verifyDevPassword(password)
      if (ok) {
        onSuccess()
      } else {
        setError(true)
        setPassword('')
      }
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#030508',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
      overflowY: 'auto',
    }}>
      {/* Grid lines background */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(rgba(0,255,133,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,133,1) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(0,255,133,0.03)', border: '1px solid rgba(0,255,133,0.15)',
          borderRadius: '16px', padding: '40px 36px',
          boxShadow: '0 0 60px rgba(0,255,133,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <LogoMark size={28} />
            <div>
              <div style={{ color: '#00FF85', fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>VELQUOR</div>
              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '10px', letterSpacing: '0.08em' }}>DEV CONSOLE</div>
            </div>
          </div>

          <div style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.4)', fontSize: '11px', letterSpacing: '0.06em' }}>
            ACCESS CODE
          </div>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter dev password"
              autoFocus
              style={{
                background: 'rgba(0,255,133,0.04)', border: `1px solid ${error ? 'rgba(255,51,71,0.6)' : 'rgba(0,255,133,0.2)'}`,
                borderRadius: '8px', padding: '12px 14px', color: '#00FF85', fontSize: '13px',
                outline: 'none', fontFamily: 'inherit', letterSpacing: '0.08em',
                transition: 'border-color 0.2s',
              }}
            />
            {error && (
              <div style={{ color: '#FF3347', fontSize: '11px', letterSpacing: '0.04em' }}>✕ Invalid access code</div>
            )}
            <button
              type="submit"
              disabled={isPending || !password}
              style={{
                background: isPending ? 'rgba(0,255,133,0.1)' : 'rgba(0,255,133,0.12)',
                border: '1px solid rgba(0,255,133,0.3)', borderRadius: '8px',
                color: '#00FF85', fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em',
                padding: '12px', cursor: isPending ? 'wait' : 'pointer',
                textTransform: 'uppercase', fontFamily: 'inherit',
                transition: 'background 0.2s',
              }}
            >
              {isPending ? 'Verifying...' : 'Enter Console'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.12)', fontSize: '10px', letterSpacing: '0.06em' }}>
          RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY
        </div>
      </div>
    </div>
  )
}
