'use client'

import { useState } from 'react'
import type { CopyAccount } from './types'
import { inputStyle, btnPrimary, btnSecondary } from './styles'
import { BROKERS } from '@/lib/brokers'

// Host an already-added copy account in a VELQUOR cloud terminal.
// Password-free when the account is the user's connected main terminal.
export function HostAccountModal({
  account,
  mainLogin = null,
  onClose,
  onHosted,
}: {
  account:    CopyAccount
  mainLogin?: string | null
  onClose:    () => void
  onHosted:   () => void
}) {
  const isMain = mainLogin != null && String(account.mt5_login) === String(mainLogin)
  const [server,   setServer]   = useState(account.mt5_server || '')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!isMain) {
      if (!server.trim()) { setError('Pick or enter your broker server'); return }
      if (!password) { setError('Password required'); return }
    }
    setLoading(true); setError('')
    const res = await fetch(`/api/copy/accounts/${account.id}/connect`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password, server: server.trim() }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    onHosted()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        padding: '28px', width: '100%', maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '6px' }}>
          Host in VELQUOR Cloud
        </div>
        <div style={{ fontSize: '12px', color: 'var(--t3)', marginBottom: '18px', lineHeight: 1.5 }}>
          #{account.mt5_login} · {account.role === 'leader' ? 'Leader' : 'Follower'} — we run the terminal
          for you, 24/7, nothing to install.
        </div>

        {isMain ? (
          <div style={{ fontSize: '12px', color: '#00FF85', padding: '10px 12px', background: 'rgba(0,255,133,0.06)', border: '1px solid rgba(0,255,133,0.2)', borderRadius: '8px', marginBottom: '16px', lineHeight: 1.5 }}>
            ✓ This is your connected VELQUOR terminal — no password needed. It will be restarted in
            {' '}{account.role} mode and keeps syncing your dashboard as before.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>BROKER SERVER</div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {BROKERS.flatMap(b => b.servers.map(s => (
                  <button
                    key={s.name} type="button"
                    onClick={() => setServer(s.name)}
                    style={{
                      fontSize: '11px', padding: '5px 10px', borderRadius: '20px',
                      background: server === s.name ? 'rgba(122,79,255,0.15)' : 'var(--s2)',
                      border:     server === s.name ? '1px solid rgba(122,79,255,0.5)' : '1px solid var(--bd)',
                      color:      server === s.name ? 'var(--ac)' : 'var(--t3)',
                      cursor: 'pointer',
                    }}
                  >
                    {b.name.split(' ')[0]} {s.label}
                  </button>
                )))}
              </div>
              <input
                value={server} onChange={e => setServer(e.target.value)}
                placeholder="or type it: e.g. ICMarketsEU-Live02 / host:port"
                style={inputStyle}
              />
            </div>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                {account.role === 'follower' ? 'TRADING PASSWORD' : 'PASSWORD'}
              </span>
              <input
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder={account.role === 'follower' ? 'Main/trading password' : 'Investor (read-only) password is enough'}
                type="password" autoComplete="off"
                style={inputStyle}
              />
              <span style={{ fontSize: '10px', color: 'var(--t3)', lineHeight: 1.5 }}>
                {account.role === 'follower'
                  ? 'Followers execute the copied trades, so the trading password is required.'
                  : 'A leader only reports its trades — the read-only investor password works.'}
                {' '}Encrypted and stored only on our EU trade server, never in the database.
              </span>
            </label>
          </div>
        )}

        {error && (
          <div style={{ fontSize: '12px', color: '#FF3347', padding: '8px 12px', background: 'rgba(255,51,71,0.08)', borderRadius: '8px', marginBottom: '14px', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
          <button type="submit" disabled={loading} style={btnPrimary}>
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  )
}
