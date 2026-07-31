'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
  const params = useSearchParams()
  const next = params.get('next') || '/'

  const [password, setPassword] = useState('')
  const [error,    setError]    = useState(false)
  const [busy,     setBusy]     = useState(false)

  // An invite link (/gate?code=NAME-XXXX) fills the field and submits itself.
  // A tester should meet the product, not a password box.
  const auto = useRef(false)
  const invited = params.get('code')
  useEffect(() => {
    if (!invited || auto.current) return
    auto.current = true
    setPassword(invited)
    void attempt(invited)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invited])

  async function attempt(entry: string) {
    if (!entry.trim() || busy) return
    setBusy(true)
    setError(false)
    const ok = await unlockSite(entry)
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

  function submit(e: React.FormEvent) {
    e.preventDefault()
    void attempt(password)
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

        {/*
          Readable, not masked. Beta codes get dictated over the phone and read
          off a message — hiding the characters turns every typo into a silent
          "Incorrect". What is behind this curtain is a product, not an account.
        */}
        <input
          type="text"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(false) }}
          placeholder="Password or access code"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Site password or beta access code"
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

        {/*
          Only `busy` disables this. Keying it off the input's React state as
          well meant a value that arrived without an input event — a password
          manager, an autofill, a fill that landed before hydration — left the
          button dead with the field visibly full, and Enter does not submit a
          form whose only submit button is disabled. `submit` guards on empty.
        */}
        <button
          type="submit"
          disabled={busy}
          style={{
            width: '100%', padding: '10px',
            background: '#ffffff', border: 'none', borderRadius: '6px',
            color: '#000000', fontSize: '13px', cursor: busy ? 'default' : 'pointer',
            opacity: !password.trim() || busy ? 0.35 : 1,
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
