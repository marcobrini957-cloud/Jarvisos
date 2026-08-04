'use client'

import Icon from '@/components/ui/Icon'
import { Label, Segmented } from '@/components/ui/vq'

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
  defaultRole = 'follower',
  mainLogin = null,
  onClose,
  onAdded,
}: {
  groupId:      string
  defaultRole?: 'leader' | 'follower'
  mainLogin?:   string | null   // login of the user's connected main terminal
  onClose:      () => void
  onAdded:      () => void
}) {
  const [role,      setRole]      = useState<'leader' | 'follower'>(defaultRole)
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
      if (!password) { setError(role === 'follower' ? 'Trading password required — followers place real trades' : 'Password required (investor password is enough for a leader)'); return }
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

  const hint: React.CSSProperties = { fontSize: 'var(--text-xs)', color: 'var(--t3)', marginTop: '6px', lineHeight: 1.5 }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-card)',
        padding: '28px', width: '100%', maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto',
        }}>
        <div style={{ fontSize: 'var(--text-md)', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
          Add Account
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Role */}
          <div>
            <div style={{ marginBottom: '6px' }}><Label>Role</Label></div>
            <Segmented
              options={[{ key: 'leader', label: 'Leader' }, { key: 'follower', label: 'Follower' }]}
              value={role}
              onChange={setRole}
            />
            <div style={hint}>
              {role === 'leader'
                ? 'This account places the real trades — others will copy it.'
                : "This account follows and copies the leader's trades automatically."}
            </div>
          </div>

          {/* Connection method */}
          <div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)', marginBottom: '6px' }}>CONNECTION</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {([['cloud', 'VELQUOR Cloud'], ['ea', 'My own MetaTrader']] as const).map(([m, label]) => (
                <button
                  key={m} type="button"
                  onClick={() => setMethod(m)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-base)',
                    fontWeight: method === m ? 700 : 400,
                    background: method === m ? 'var(--color-surface-3)' : 'transparent',
                    border:     '1px solid var(--color-line-1)',
                    color:      method === m ? 'var(--color-up)' : 'var(--t3)',
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
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>MT5 ACCOUNT NUMBER</span>
            <input
              value={mt5Login} onChange={e => setMt5Login(e.target.value)}
              placeholder="e.g. 123456789" type="number"
              style={inputStyle}
            />
            {isMainAccount && method === 'cloud' && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-up)' }}>
                <Icon name="check" size={12} /> This is your connected VELQUOR terminal — no password needed, we reuse it.
              </span>
            )}
          </label>

          {/* Cloud: broker server + password */}
          {method === 'cloud' && !isMainAccount && (
            <>
              <div>
                <div style={{ marginBottom: '6px' }}><Label>Broker server</Label></div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {BROKERS.flatMap(b => b.servers.map(s => (
                    <button
                      key={s.name} type="button"
                      onClick={() => setMt5Server(s.name)}
                      style={{
                        fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)',
                        padding: '5px 12px', borderRadius: '999px',
                        background: mt5Server === s.name ? 'var(--color-ink-1)' : 'var(--color-surface-2)',
                        border:     '1px solid ' + (mt5Server === s.name ? 'transparent' : 'var(--color-line-1)'),
                        color:      mt5Server === s.name ? 'var(--color-void)' : 'var(--color-ink-3)',
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
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
                  {role === 'follower' ? 'TRADING PASSWORD' : 'PASSWORD'}
                </span>
                <input
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder={role === 'follower' ? 'Main/trading password' : 'Investor (read-only) password is enough'}
                  type="password" autoComplete="off"
                  style={inputStyle}
                />
                <span style={hint}>
                  {role === 'follower'
                    ? 'Followers execute the copied trades, so the trading password is required.'
                    : 'A leader only reports its trades — the read-only investor password works.'}
                  {' '}Encrypted and stored only on our EU trade server, never in the database.
                </span>
              </label>
            </>
          )}

          {/* EA: optional server */}
          {method === 'ea' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
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
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--t3)' }}>
              NICKNAME <span style={{ color: '#555' }}>(optional)</span>
            </span>
            <input
              value={nickname} onChange={e => setNickname(e.target.value)}
              placeholder="e.g. FTMO Challenge"
              style={inputStyle}
            />
          </label>

          {error && (
            <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-down)', padding: '8px 12px', background: 'rgba(240,80,75,0.08)', borderRadius: 'var(--radius-md)', lineHeight: 1.5 }}>
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
