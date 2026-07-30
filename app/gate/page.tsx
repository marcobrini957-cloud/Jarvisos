'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { unlockSite } from './actions'
import { LogoMark } from '@/components/ui/LogoMark'

/**
 * The lockdown curtain.
 *
 * Deliberately says almost nothing: no product name beyond the mark, no
 * description, no "coming soon" copy. Someone who finds the domain early should
 * learn nothing about what is being built here.
 */
function Gate() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(false)
  const [busy,     setBusy]     = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!password || busy) return
    setBusy(true)
    setError(false)
    const ok = await unlockSite(password)
    setBusy(false)
    if (ok) {
      // A full load, not a client transition: the proxy has to re-evaluate with
      // the new cookie before the destination will render.
      window.location.href = next
    } else {
      setError(true)
      setPassword('')
    }
  }

  return (
    <div className="vq2" style={{
      minHeight: '100dvh', background: '#000000',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      <form
        onSubmit={submit}
        style={{
          width: '100%', maxWidth: '300px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px',
        }}
      >
        <LogoMark size={34} />

        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
          aria-label="Site password"
          aria-invalid={error}
          style={{
            width: '100%', textAlign: 'center',
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${error ? '#F0504B' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '6px', padding: '11px 14px',
            color: '#ffffff', fontSize: '13px', letterSpacing: '0.04em',
            outline: 'none',
            fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
          }}
        />

        <button
          type="submit"
          disabled={!password || busy}
          style={{
            width: '100%', padding: '10px',
            background: '#ffffff', border: 'none', borderRadius: '6px',
            color: '#000000', fontSize: '13px', cursor: busy ? 'default' : 'pointer',
            opacity: !password || busy ? 0.35 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {busy ? 'Checking…' : 'Enter'}
        </button>

        <span style={{
          fontSize: '11px', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: error ? '#F0504B' : 'rgba(255,255,255,0.22)',
          minHeight: '14px',
        }}>
          {error ? 'Incorrect' : 'Private'}
        </span>
      </form>
    </div>
  )
}

export default function GatePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#000000' }} />}>
      <Gate />
    </Suspense>
  )
}
