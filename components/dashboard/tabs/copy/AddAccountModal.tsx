'use client'

import { useState } from 'react'
import { inputStyle, btnPrimary, btnSecondary } from './styles'
import { BROKERS } from '@/lib/brokers'

// ── Add Account Modal ─────────────────────────────────────────────────────────
// Two ways to connect an account to a copy group:
//  1. VELQUOR Cloud — we host the terminal: broker server + login + password,
//     zero user-side setup (password-free if it's the already-connected main
//     terminal).
//  2. Own MetaTrader — user runs the VELQUOR EA themselves; we only need the
//     account number to correlate signals.
export function AddAccountModal({
  groupId,
  defaultRole = 'slave',
  mainLogin = null,
  onClose,
  onAdded,
}: {
  groupId:      string
  defaultRole?: 'master' | 'slave'
  mainLogin?:   string | null   // login of the user's connected main terminal
  onClose:      () => void
  onAdded:      () => void
}) {
  const [role,      setRole]      = useState<'master' | 'slave'>(defaultRole)
  const [method,    setMethod]    = useState<'cloud' | 'ea'>('cloud')
  const [mt5Login,  setMt5Login]  = useState('')
  const [mt5Server, setMt5Server] = useState('')
  const [password,  setPassword]  = useState('')
  const [nickname,  setNickname]  = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const isMainAccount = mainLogin != null && mt5Login.trim() === String(mainLogin)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const login = mt5Login.trim()
    if (!login) { setError('MT5 account number required'); return }
    if (method === 'cloud' && !isMainAccount) {
      if (!mt5Server.trim()) { setError('Pick or enter your broker server'); return }
      if (!password) { setError(role === 'slave' ? 'Trading password required — slaves place real trades' : 'Password required (investor password is enough for a master)'); return }
    }
    setLoading(true); setError('')

    // 1) register the account in the group
    const res = await fetch(`/api/copy/groups/${groupId}/accounts`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ role, mt5_login: login, mt5_server: mt5Server.trim(), nickname: nickname.trim() }),
    })
    const data = await res.json()
    if (!res.ok) { setLoading(false); setError(data.error ?? 'Failed'); return }

    // 2) cloud method → provision the hosted terminal for it
    if (method === 'cloud') {
      const conn = await fetch(`/api/copy/accounts/${data.id}/connect`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password, server: mt5Server.trim() }),
      })
      const connData = await conn.json().catch(() => ({}))
      setLoading(false)
      if (!conn.ok) {
        setError(`Account added, but cloud hosting failed: ${connData.error ?? 'unknown error'}. You can retry with “Host in Cloud” on the account row.`)
        onAdded()
        return
      }
    } else {
      setLoading(false)
    }
    onAdded()
    onClose()
  }

  const hint: React.CSSProperties = { fontSize: '10px', color: 'var(--t3)', marginTop: '6px', lineHeight: 1.5 }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        padding: '28px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
          Add Account
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Role */}
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
            <div style={hint}>
              {role === 'master'
                ? 'This account places the real trades — others will copy it.'
                : "This account follows and copies the master's trades automatically."}
            </div>
          </div>

          {/* Connection method */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>CONNECTION</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([['cloud', 'VELQUOR Cloud'], ['ea', 'My own MetaTrader']] as const).map(([m, label]) => (
                <button
                  key={m} type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '12px',
                    fontWeight: method === m ? 700 : 400,
                    background: method === m ? 'rgba(0,255,133,0.08)' : 'var(--s2)',
                    border:     method === m ? '1px solid rgba(0,255,133,0.35)' : '1px solid var(--bd)',
                    color:      method === m ? '#00FF85' : 'var(--t3)',
                    cursor:     'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div style={hint}>
              {method === 'cloud'
                ? 'We run the terminal for you — works even if your computer is off. Nothing to install.'
                : 'You run the VELQUOR EA in your own MetaTrader with the copy settings shown on the group card.'}
            </div>
          </div>

          {/* Account number */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>MT5 ACCOUNT NUMBER</span>
            <input
              value={mt5Login} onChange={e => setMt5Login(e.target.value)}
              placeholder="e.g. 123456789" type="number"
              style={inputStyle}
            />
            {isMainAccount && method === 'cloud' && (
              <span style={{ fontSize: '10px', color: '#00FF85' }}>
                ✓ This is your connected VELQUOR terminal — no password needed, we reuse it.
              </span>
            )}
          </label>

          {/* Cloud: broker server + password */}
          {method === 'cloud' && !isMainAccount && (
            <>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>BROKER SERVER</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {BROKERS.flatMap(b => b.servers.map(s => (
                    <button
                      key={s.name} type="button"
                      onClick={() => setMt5Server(s.name)}
                      style={{
                        fontSize: '11px', padding: '5px 10px', borderRadius: '20px',
                        background: mt5Server === s.name ? 'rgba(122,79,255,0.15)' : 'var(--s2)',
                        border:     mt5Server === s.name ? '1px solid rgba(122,79,255,0.5)' : '1px solid var(--bd)',
                        color:      mt5Server === s.name ? 'var(--ac)' : 'var(--t3)',
                        cursor: 'pointer',
                      }}
                    >
                      {b.name.split(' ')[0]} {s.label}
                    </button>
                  )))}
                </div>
                <input
                  value={mt5Server} onChange={e => setMt5Server(e.target.value)}
                  placeholder="or type it: e.g. ICMarketsEU-Live02 / host:port"
                  style={inputStyle}
                />
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
                  {role === 'slave' ? 'TRADING PASSWORD' : 'PASSWORD'}
                </span>
                <input
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={role === 'slave' ? 'Main/trading password' : 'Investor (read-only) password is enough'}
                  type="password" autoComplete="off"
                  style={inputStyle}
                />
                <span style={hint}>
                  {role === 'slave'
                    ? 'Slaves execute the copied trades, so the trading password is required.'
                    : 'A master only reports its trades — the read-only investor password works.'}
                  {' '}Encrypted and stored only on our EU trade server, never in the database.
                </span>
              </label>
            </>
          )}

          {/* EA: optional server */}
          {method === 'ea' && (
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
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>
              NICKNAME <span style={{ color: '#555' }}>(optional)</span>
            </span>
            <input
              value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="e.g. FTMO Challenge"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ fontSize: '12px', color: '#FF3347', padding: '8px 12px', background: 'rgba(255,51,71,0.08)', borderRadius: '8px', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Connecting…' : method === 'cloud' ? 'Add & Connect' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
