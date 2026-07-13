'use client'

import { useState } from 'react'
import { inputStyle, btnPrimary, btnSecondary } from './styles'

// ── Add Account Modal ─────────────────────────────────────────────────────────
export function AddAccountModal({
  groupId,
  defaultRole = 'slave',
  onClose,
  onAdded,
}: {
  groupId:      string
  defaultRole?: 'master' | 'slave'
  onClose:      () => void
  onAdded:      () => void
}) {
  const [role,      setRole]      = useState<'master' | 'slave'>(defaultRole)
  const [mt5Login,  setMt5Login]  = useState('')
  const [mt5Server, setMt5Server] = useState('')
  const [nickname,  setNickname]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!mt5Login.trim()) { setError('MT5 login required'); return }
    setLoading(true); setError('')
    const res = await fetch(`/api/copy/groups/${groupId}/accounts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role, mt5_login: mt5Login.trim(), mt5_server: mt5Server.trim(), nickname: nickname.trim() }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    onAdded()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        padding: '28px', width: '100%', maxWidth: '380px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
          Add Account
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>ROLE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['master', 'slave'] as const).map(r => (
                <button
                  key={r} type="button"
                  onClick={() => setRole(r)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '12px',
                    fontWeight: role === r ? 700 : 400,
                    background: role === r ? 'rgba(122,79,255,0.15)' : 'var(--s2)',
                    border:     role === r ? '1px solid rgba(122,79,255,0.5)' : '1px solid var(--bd)',
                    color:      role === r ? 'var(--ac)' : 'var(--t3)',
                    cursor:     'pointer', textTransform: 'uppercase', letterSpacing: '0.06em',
                  }}
                >
                  {r === 'master' ? 'Master' : 'Slave'}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--t3)', marginTop: '6px', lineHeight: 1.5 }}>
              {role === 'master'
                ? 'This account places the real trades — others will copy it.'
                : "This account follows and copies the master's trades automatically."}
            </div>
          </div>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>MT5 ACCOUNT NUMBER</span>
            <input
              value={mt5Login} onChange={e => setMt5Login(e.target.value)}
              placeholder="e.g. 123456789" type="number"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
              BROKER SERVER <span style={{ color: '#555' }}>(optional)</span>
            </span>
            <input
              value={mt5Server} onChange={e => setMt5Server(e.target.value)}
              placeholder="e.g. ICMarketsEU-Demo02"
              style={inputStyle}
            />
          </label>

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
              NICKNAME <span style={{ color: '#555' }}>(optional)</span>
            </span>
            <input
              value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="e.g. ICM Main Live"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ fontSize: '12px', color: '#FF3347', padding: '8px 12px', background: 'rgba(255,51,71,0.08)', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Adding…' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
