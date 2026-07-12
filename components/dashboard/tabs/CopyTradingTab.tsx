'use client'

import { useState, useEffect, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────
interface CopyAccount {
  id:           string
  role:         'master' | 'slave'
  nickname:     string
  mt5_login:    string
  mt5_server:   string
  status:       'pending' | 'active' | 'paused' | 'error'
  last_seen_at: string | null
}

interface CopyGroup {
  id:             string
  name:           string
  lot_mode:       'fixed' | 'proportional'
  lot_fixed:      number
  lot_multiplier: number
  max_lot:        number
  active:         boolean
  created_at:     string
  copy_accounts:  CopyAccount[]
}

interface CopyLogEntry {
  id:            string
  status:        'success' | 'failed' | 'pending'
  slave_ticket:  string | null
  slave_lots:    number | null
  error_message: string | null
  executed_at:   string | null
  created_at:    string
  copy_accounts: { nickname: string; mt5_login: string; role: string }
  copy_signals:  {
    signal_type:   'OPEN' | 'CLOSE'
    master_ticket: number
    symbol:        string
    trade_type:    string
    lot_size:      number
    open_price:    number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusDot(status: string, lastSeen: string | null) {
  const isRecent = lastSeen && (Date.now() - new Date(lastSeen).getTime()) < 15000
  const color =
    status === 'active' && isRecent ? '#00FF85' :
    status === 'active'             ? '#FFD700' :
    status === 'paused'             ? '#888'    :
    status === 'error'              ? '#FF3347' : '#444'
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: (status === 'active' && isRecent) ? '0 0 6px #00FF85' : undefined,
    }} />
  )
}

function timeAgo(ts: string | null) {
  if (!ts) return 'never'
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ── Add Account Modal ─────────────────────────────────────────────────────────
function AddAccountModal({
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

// ── Create Group Modal ────────────────────────────────────────────────────────
function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState('Copy Group 1')
  const [lotMode,  setLotMode]  = useState<'proportional' | 'fixed'>('proportional')
  const [lotMult,  setLotMult]  = useState('1.0')
  const [lotFixed, setLotFixed] = useState('0.01')
  const [maxLot,   setMaxLot]   = useState('10.0')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/copy/groups', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, lot_mode: lotMode,
        lot_multiplier: parseFloat(lotMult),
        lot_fixed:      parseFloat(lotFixed),
        max_lot:        parseFloat(maxLot),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    onCreated()
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
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
          New Copy Group
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>GROUP NAME</span>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </label>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>LOT SIZING MODE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['proportional', 'fixed'] as const).map(m => (
                <button
                  key={m} type="button" onClick={() => setLotMode(m)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '12px',
                    fontWeight: lotMode === m ? 700 : 400,
                    background: lotMode === m ? 'rgba(122,79,255,0.15)' : 'var(--s2)',
                    border:     lotMode === m ? '1px solid rgba(122,79,255,0.5)' : '1px solid var(--bd)',
                    color:      lotMode === m ? 'var(--ac)' : 'var(--t3)',
                    cursor:     'pointer', textTransform: 'capitalize',
                  }}
                >
                  {m === 'proportional' ? 'Proportional' : 'Fixed'}
                </button>
              ))}
            </div>
          </div>

          {lotMode === 'proportional' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>LOT MULTIPLIER</span>
              <input value={lotMult} onChange={e => setLotMult(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>Slave lots = master lots × {lotMult || '1.0'}</span>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>FIXED LOT SIZE</span>
              <input value={lotFixed} onChange={e => setLotFixed(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>Slave always trades exactly {lotFixed || '0.01'} lots</span>
            </label>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>MAX LOT CAP</span>
            <input value={maxLot} onChange={e => setMaxLot(e.target.value)} type="number" step="0.1" min="0.01" style={inputStyle} />
          </label>

          {error && (
            <div style={{ fontSize: '12px', color: '#FF3347', padding: '8px 12px', background: 'rgba(255,51,71,0.08)', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Signal Log ────────────────────────────────────────────────────────────────
function SignalLog({ groupId }: { groupId: string }) {
  const [entries, setEntries] = useState<CopyLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const res = await fetch(`/api/copy/groups/${groupId}/log`)
      if (cancelled) return
      if (!res.ok) { setError('Could not load log'); setLoading(false); return }
      const data = await res.json()
      setEntries(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    load()
    const iv = setInterval(load, 10000)
    return () => { cancelled = true; clearInterval(iv) }
  }, [groupId])

  if (loading) return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>
      Loading log…
    </div>
  )

  if (error) return (
    <div style={{ padding: '16px', textAlign: 'center', color: '#FF3347', fontSize: '12px' }}>
      {error}
    </div>
  )

  if (entries.length === 0) return (
    <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--t3)', fontSize: '12px' }}>
      No activity yet — signals appear here once the master starts trading.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map(e => {
        const sig        = e.copy_signals
        const acc        = e.copy_accounts
        const statusColor = e.status === 'success' ? '#00FF85' : e.status === 'failed' ? '#FF3347' : '#FFD700'
        const sigColor   = sig.signal_type === 'OPEN' ? '#00FF85' : '#FF3347'

        return (
          <div key={e.id} style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 80px 60px',
            alignItems: 'center',
            padding: '7px 14px',
            borderRadius: '8px',
            background: 'var(--s2)',
            gap: '10px',
            fontSize: '11px',
          }}>
            <div style={{
              padding: '2px 6px', borderRadius: '4px', textAlign: 'center',
              background: sig.signal_type === 'OPEN' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)',
              color: sigColor, fontWeight: 700, fontSize: '10px', letterSpacing: '0.06em',
            }}>
              {sig.signal_type}
            </div>

            <div>
              <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sig.symbol}</span>
              {' '}
              <span style={{ color: sig.trade_type === 'BUY' ? '#00FF85' : '#FF3347', fontSize: '10px' }}>
                {sig.trade_type}
              </span>
              <div style={{ color: 'var(--t3)', fontSize: '10px', marginTop: '1px' }}>
                → {acc.nickname || `#${acc.mt5_login}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: statusColor, flexShrink: 0,
                boxShadow: e.status === 'success' ? '0 0 4px #00FF85' : undefined,
              }} />
              <span style={{ color: statusColor, textTransform: 'capitalize', fontSize: '10px' }}>
                {e.status}
              </span>
            </div>

            <div style={{ color: 'var(--t3)', textAlign: 'right' }}>
              {timeAgo(e.executed_at ?? e.created_at)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Group Card ────────────────────────────────────────────────────────────────
function GroupCard({ group, onRefresh }: { group: CopyGroup; onRefresh: () => void }) {
  const [addAccountRole, setAddAccountRole] = useState<'master' | 'slave' | null>(null)
  const [toggling,       setToggling]       = useState(false)
  const [showLog,        setShowLog]        = useState(false)

  const master = group.copy_accounts.find(a => a.role === 'master')
  const slaves = group.copy_accounts.filter(a => a.role === 'slave')

  async function toggleActive() {
    setToggling(true)
    await fetch(`/api/copy/groups/${group.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ active: !group.active }),
    })
    setToggling(false)
    onRefresh()
  }

  async function deleteGroup() {
    if (!confirm(`Delete "${group.name}"? This will stop all copy trading in this group.`)) return
    await fetch(`/api/copy/groups/${group.id}`, { method: 'DELETE' })
    onRefresh()
  }

  async function removeAccount(accountId: string) {
    await fetch(`/api/copy/groups/${group.id}/accounts/${accountId}`, { method: 'DELETE' })
    onRefresh()
  }

  async function toggleAccountStatus(acc: CopyAccount) {
    const newStatus = acc.status === 'paused' ? 'active' : 'paused'
    await fetch(`/api/copy/groups/${group.id}/accounts/${acc.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus }),
    })
    onRefresh()
  }

  return (
    <>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        overflow: 'hidden', marginBottom: '16px',
      }}>
        {/* Group header */}
        <div style={{
          padding: '16px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid var(--bd)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: group.active ? '#00FF85' : '#444',
              boxShadow: group.active ? '0 0 6px #00FF85' : undefined,
            }} />
            <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--t1)' }}>{group.name}</span>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
              background: 'var(--s2)', color: 'var(--t3)', letterSpacing: '0.06em',
            }}>
              {group.lot_mode === 'fixed'
                ? `${group.lot_fixed} lots fixed`
                : `${group.lot_multiplier}× lots`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleActive} disabled={toggling}
              style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '11px',
                background: group.active ? 'rgba(255,51,71,0.1)' : 'rgba(0,255,133,0.1)',
                border:     group.active ? '1px solid rgba(255,51,71,0.3)' : '1px solid rgba(0,255,133,0.3)',
                color:      group.active ? '#FF3347' : '#00FF85',
                cursor:     'pointer', fontWeight: 600,
              }}
            >
              {group.active ? 'Pause' : 'Resume'}
            </button>
            <button
              onClick={deleteGroup}
              style={{
                padding: '5px 12px', borderRadius: '8px', fontSize: '11px',
                background: 'var(--s2)', border: '1px solid var(--bd)',
                color: 'var(--t3)', cursor: 'pointer',
              }}
            >
              Delete
            </button>
          </div>
        </div>

        {/* Accounts */}
        <div style={{ padding: '16px 20px' }}>

          {/* Master section */}
          <div style={{ marginBottom: '12px' }}>
            <div style={{
              fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em',
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>MASTER ACCOUNT</span>
              {!master && (
                <button
                  onClick={() => setAddAccountRole('master')}
                  style={{
                    fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontWeight: 600, letterSpacing: '0.06em',
                  }}
                >
                  + ADD MASTER
                </button>
              )}
            </div>

            {master ? (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: '10px',
                background: 'rgba(122,79,255,0.06)', border: '1px solid rgba(122,79,255,0.15)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {statusDot(master.status, master.last_seen_at)}
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                      {master.nickname || master.mt5_login}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                      #{master.mt5_login}{master.mt5_server ? ` · ${master.mt5_server}` : ''} · {timeAgo(master.last_seen_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeAccount(master.id)}
                  style={{ fontSize: '11px', color: '#FF3347', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div style={{
                padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                background: 'var(--s2)', border: '1px dashed var(--bd)',
                fontSize: '12px', color: 'var(--t3)',
              }}>
                No master account — click <strong style={{ color: 'var(--ac)' }}>+ ADD MASTER</strong> above
              </div>
            )}
          </div>

          {/* Slave section */}
          <div>
            <div style={{
              fontSize: '10px', color: 'var(--t3)', letterSpacing: '0.08em',
              marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span>SLAVE ACCOUNTS ({slaves.length})</span>
              <button
                onClick={() => setAddAccountRole('slave')}
                style={{
                  fontSize: '10px', color: 'var(--ac)', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontWeight: 600, letterSpacing: '0.06em',
                }}
              >
                + ADD SLAVE
              </button>
            </div>

            {slaves.length === 0 ? (
              <div style={{
                padding: '12px 14px', borderRadius: '10px', textAlign: 'center',
                background: 'var(--s2)', border: '1px dashed var(--bd)',
                fontSize: '12px', color: 'var(--t3)',
              }}>
                No slave accounts yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {slaves.map(slave => (
                  <div key={slave.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'var(--s2)', border: '1px solid var(--bd)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {statusDot(slave.status, slave.last_seen_at)}
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)' }}>
                          {slave.nickname || slave.mt5_login}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--t3)' }}>
                          #{slave.mt5_login}{slave.mt5_server ? ` · ${slave.mt5_server}` : ''} · {timeAgo(slave.last_seen_at)}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => toggleAccountStatus(slave)}
                        style={{
                          fontSize: '10px', padding: '4px 10px', borderRadius: '6px',
                          background: 'var(--s1)', border: '1px solid var(--bd)',
                          color: 'var(--t3)', cursor: 'pointer',
                        }}
                      >
                        {slave.status === 'paused' ? 'Resume' : 'Pause'}
                      </button>
                      <button
                        onClick={() => removeAccount(slave.id)}
                        style={{ fontSize: '11px', color: '#FF3347', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* EA config snippet */}
        {(master || slaves.length > 0) && (
          <div style={{
            margin: '0 20px 16px', padding: '12px 14px', borderRadius: '10px',
            background: 'rgba(0,255,133,0.03)', border: '1px solid rgba(0,255,133,0.1)',
          }}>
            <div style={{ fontSize: '10px', color: '#00FF85', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 700 }}>
              EA CONFIGURATION
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--t2)', lineHeight: '1.7' }}>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyMode</span> = <span style={{ color: '#FFD700' }}>COPY_MASTER</span> <span style={{ color: '#555' }}>// or COPY_SLAVE</span></div>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyGroupId</span> = <span style={{ color: '#7A4FFF' }}>"{group.id}"</span></div>
              <div><span style={{ color: 'var(--t3)' }}>InpCopyLotMode</span> = <span style={{ color: '#FFD700' }}>
                {group.lot_mode === 'fixed' ? 'LOT_FIXED' : 'LOT_PROPORTIONAL'}
              </span></div>
              {group.lot_mode === 'fixed'
                ? <div><span style={{ color: 'var(--t3)' }}>InpCopyLotFixed</span> = <span style={{ color: '#00FF85' }}>{group.lot_fixed}</span></div>
                : <div><span style={{ color: 'var(--t3)' }}>InpCopyLotMult</span> = <span style={{ color: '#00FF85' }}>{group.lot_multiplier}</span></div>
              }
              <div><span style={{ color: 'var(--t3)' }}>InpCopyMaxLot</span> = <span style={{ color: '#00FF85' }}>{group.max_lot}</span></div>
            </div>
          </div>
        )}

        {/* Activity log */}
        <div style={{ borderTop: '1px solid var(--bd)' }}>
          <button
            onClick={() => setShowLog(v => !v)}
            style={{
              width: '100%', padding: '10px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'transparent', border: 'none', cursor: 'pointer',
              fontSize: '11px', color: 'var(--t3)', fontWeight: 600, letterSpacing: '0.06em',
            }}
          >
            <span>ACTIVITY LOG</span>
            <span style={{
              fontSize: '10px', color: 'var(--t3)',
              display: 'inline-block',
              transform: showLog ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}>▾</span>
          </button>
          {showLog && (
            <div style={{ padding: '0 20px 16px' }}>
              <SignalLog groupId={group.id} />
            </div>
          )}
        </div>
      </div>

      {addAccountRole !== null && (
        <AddAccountModal
          groupId={group.id}
          defaultRole={addAccountRole}
          onClose={() => setAddAccountRole(null)}
          onAdded={onRefresh}
        />
      )}
    </>
  )
}

// ── Plan Gate Banner ──────────────────────────────────────────────────────────
function PlanGateBanner() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 56, height: 56, borderRadius: '14px',
        background: 'rgba(122,79,255,0.12)', border: '1px solid rgba(122,79,255,0.2)',
        fontSize: '24px', marginBottom: '20px',
      }}>
        ⚡
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)', marginBottom: '10px' }}>
        Copy Trading requires Pro or Ultra
      </div>
      <div style={{ fontSize: '14px', color: 'var(--t3)', maxWidth: '340px', margin: '0 auto 28px', lineHeight: 1.6 }}>
        Automatically mirror your trades across multiple MT5 accounts. Upgrade to unlock this feature.
      </div>
      <div style={{
        display: 'inline-flex', gap: '12px', padding: '16px 24px',
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '14px',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--t1)' }}>Pro</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>1 copy group · 1 slave</div>
        </div>
        <div style={{ width: 1, background: 'var(--bd)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFD700' }}>Ultra</div>
          <div style={{ fontSize: '11px', color: 'var(--t3)' }}>3 copy groups · 5 slaves each</div>
        </div>
      </div>
    </div>
  )
}

// ── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '1', title: 'Create a Copy Group',      desc: 'Set up a group with a name and lot sizing config (proportional or fixed).' },
    { n: '2', title: 'Add your accounts',         desc: 'Add the MT5 account number for your master (the one placing real trades) and your slave accounts.' },
    { n: '3', title: 'Configure the EA',          desc: 'Copy the group ID shown above into VelquorBridge.mq5, set the mode to MASTER or SLAVE, and load it on each MT5.' },
    { n: '4', title: 'Trades mirror instantly',   desc: 'When the master opens or closes a trade, slaves receive the signal within 2 seconds and execute automatically.' },
  ]
  return (
    <div style={{
      background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
      padding: '20px', marginTop: '24px',
    }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--t2)', letterSpacing: '0.06em', marginBottom: '16px' }}>
        HOW IT WORKS
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {steps.map(s => (
          <div key={s.n} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(122,79,255,0.15)', border: '1px solid rgba(122,79,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 700, color: 'var(--ac)',
            }}>
              {s.n}
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1)', marginBottom: '3px' }}>{s.title}</div>
              <div style={{ fontSize: '12px', color: 'var(--t3)', lineHeight: 1.5 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export default function CopyTradingTab() {
  const [groups,          setGroups]          = useState<CopyGroup[]>([])
  const [loading,         setLoading]         = useState(true)
  const [tier,            setTier]            = useState<string>('free')
  const [showCreateGroup, setShowCreateGroup] = useState(false)

  // Single fetch: sets groups + derives tier from response status
  const load = useCallback(async () => {
    const res = await fetch('/api/copy/groups')
    if (res.status === 401) { setLoading(false); return }
    if (res.status === 403) { setTier('free'); setLoading(false); return }
    if (res.ok) {
      const data = await res.json()
      setTier('pro')
      setGroups(Array.isArray(data) ? data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [load])

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: '13px' }}>
        Loading…
      </div>
    )
  }

  return (
    // No extra padding or overflow here — DashboardShell's <main> handles both
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1)' }}>Copy Trading</div>
          <div style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '4px' }}>
            Mirror trades across multiple MT5 accounts in real time
          </div>
        </div>
        {tier !== 'free' && (
          <button
            onClick={() => setShowCreateGroup(true)}
            style={{
              padding: '9px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
              background: 'rgba(122,79,255,0.15)', border: '1px solid rgba(122,79,255,0.3)',
              color: 'var(--ac)', cursor: 'pointer', flexShrink: 0,
            }}
          >
            + New Group
          </button>
        )}
      </div>

      {tier === 'free' ? (
        <PlanGateBanner />
      ) : (
        <>
          {groups.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: 'var(--s1)', border: '1px dashed var(--bd)', borderRadius: '16px',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--t1)', marginBottom: '8px' }}>
                No copy groups yet
              </div>
              <div style={{ fontSize: '13px', color: 'var(--t3)', marginBottom: '20px' }}>
                Create your first group to start mirroring trades
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                style={{
                  padding: '10px 24px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                  background: 'rgba(122,79,255,0.15)', border: '1px solid rgba(122,79,255,0.3)',
                  color: 'var(--ac)', cursor: 'pointer',
                }}
              >
                Create Copy Group
              </button>
            </div>
          ) : (
            groups.map(g => <GroupCard key={g.id} group={g} onRefresh={load} />)
          )}

          <HowItWorks />
        </>
      )}

      {/* MT5 URL whitelist reminder — shown for all tiers */}
      <div style={{
        marginTop: '20px', padding: '12px 16px', borderRadius: '10px',
        background: 'var(--s1)', border: '1px solid var(--bd)',
        fontSize: '11px', color: 'var(--t3)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--t2)' }}>Add to MT5 allowed URLs:</strong>{' '}
        <code style={{ color: 'var(--ac)', background: 'var(--s2)', padding: '1px 6px', borderRadius: '4px' }}>
          https://bridge.velquor.app
        </code>
        {' '}under <em>Tools → Options → Expert Advisors → Allow WebRequest</em>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => { setShowCreateGroup(false); load() }}
        />
      )}
    </div>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  background:   'var(--s2)',
  border:       '1px solid var(--bd)',
  borderRadius: '8px',
  padding:      '10px 12px',
  color:        'var(--t1)',
  fontSize:     '13px',
  outline:      'none',
  width:        '100%',
  boxSizing:    'border-box',
}

const btnPrimary: React.CSSProperties = {
  flex:         1,
  padding:      '10px 0',
  borderRadius: '8px',
  fontSize:     '13px',
  fontWeight:   600,
  background:   'rgba(122,79,255,0.15)',
  border:       '1px solid rgba(122,79,255,0.3)',
  color:        'var(--ac)',
  cursor:       'pointer',
}

const btnSecondary: React.CSSProperties = {
  flex:         1,
  padding:      '10px 0',
  borderRadius: '8px',
  fontSize:     '13px',
  fontWeight:   400,
  background:   'var(--s2)',
  border:       '1px solid var(--bd)',
  color:        'var(--t3)',
  cursor:       'pointer',
}
