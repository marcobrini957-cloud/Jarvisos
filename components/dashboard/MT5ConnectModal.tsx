'use client'

import { useState } from 'react'
import { BROKERS } from '@/lib/brokers'

interface MT5ConnectModalProps {
  onClose: () => void
  onConnected?: () => void
  currentAccountId?: string
  isConnected?: boolean
}

export default function MT5ConnectModal({ onClose, onConnected, currentAccountId, isConnected }: MT5ConnectModalProps) {
  const [login,    setLogin]   = useState(currentAccountId ?? '')
  const [password, setPassword] = useState('')
  const [brokerId, setBrokerId] = useState(BROKERS[0]?.id ?? '')
  const [server,   setServer]  = useState(BROKERS[0]?.servers[0]?.name ?? '')
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')
  const [done,     setDone]    = useState(false)

  const broker = BROKERS.find(b => b.id === brokerId) ?? null
  const isOther = brokerId === '__other'

  async function handleSave() {
    if (!login.trim() || !password.trim() || !server.trim()) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Instant Connect: provisions a VELQUOR cloud terminal on our server
      const res = await fetch('/api/mt5/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), password: password.trim(), server: server.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Failed to connect. Check your credentials.')
        return
      }
      onConnected?.()
      setDone(true)
      setTimeout(onClose, 2000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to connect.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="fixed z-50 vq-r p-6 flex flex-col gap-4"
        style={{
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: '420px', maxWidth: 'calc(100vw - 32px)',
          background: 'var(--s1)', border: '1px solid var(--bd2)',
          }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 style={{ color: 'var(--t1)', fontSize: 'var(--text-md)', fontWeight: 500 }}>Connect MetaTrader 5</h2>
            <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', marginTop: '2px' }}>
              Investor password is read-only — no trading access.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 'var(--text-lg)', cursor: 'pointer', lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Status pill */}
        {isConnected && (
          <div className="flex items-center gap-2 px-3 py-2 vq-r"
            style={{ background: 'rgba(0,196,106,0.1)', border: '1px solid rgba(0,196,106,0.2)' }}>
            <span className="rounded-full" style={{ width: '7px', height: '7px', background: 'var(--color-ink-1)', display: 'inline-block' }} />
            <span style={{ color: 'var(--gr2)', fontSize: 'var(--text-base)' }}>Currently connected — update credentials below to reconnect</span>
          </div>
        )}

        {/* Success state */}
        {done && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 'var(--text-3xl)', marginBottom: '8px' }}>✓</div>
            <p style={{ color: 'var(--gr2)', fontSize: 'var(--text-md)', fontWeight: 600, margin: 0 }}>MT5 account connected!</p>
            <p style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', margin: '4px 0 0' }}>Starting your cloud terminal — first sync lands in a minute or two.</p>
          </div>
        )}

        {/* Fields */}
        {!done && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>MT5 Login Number</label>
            <input
              value={login}
              onChange={e => setLogin(e.target.value)}
              placeholder="e.g. 1234567"
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
            />
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Your numeric account number from your broker</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>Investor Password <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(read-only)</span></label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Your investor / read-only password"
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
            />
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
              In MT5: Tools → Options → Server → Change investor password. This gives read-only access — no trades can be placed.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>Broker</label>
            <select
              value={brokerId}
              onChange={e => {
                const id = e.target.value
                setBrokerId(id)
                const b = BROKERS.find(x => x.id === id)
                setServer(b?.servers[0]?.name ?? '')
              }}
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
              }}
            >
              {BROKERS.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              <option value="__other">Other / not listed</option>
            </select>
          </div>

          {broker && !isOther && (
            <div className="flex flex-col gap-1.5">
              <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>Server</label>
              <div className="flex gap-2 flex-wrap">
                {broker.servers.map(srv => {
                  const active = server === srv.name
                  return (
                    <button
                      key={srv.name}
                      type="button"
                      onClick={() => setServer(srv.name)}
                      style={{
                        flex: '1 1 30%', padding: '9px 8px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        fontSize: 'var(--text-base)', fontWeight: 500,
                        background: active ? 'var(--color-surface-3)' : 'var(--s2)',
                        color: active ? 'white' : 'var(--t2)',
                        border: `1px solid ${active ? 'var(--ac)' : 'var(--bd2)'}`,
                      }}
                    >
                      {srv.label}
                    </button>
                  )
                })}
              </div>
              <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
                The server shown next to your account in MT5 (File → Login to Trade Account)
              </p>
            </div>
          )}

          {isOther && (
            <div className="flex flex-col gap-1.5">
              <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>Server Address</label>
              <input
                value={server}
                onChange={e => setServer(e.target.value)}
                placeholder="e.g. live2.mybroker.com:443"
                style={{
                  background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                  padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
                }}
                onFocus={e => (e.target.style.borderColor = 'var(--ac)')}
                onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
              />
              <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>
                Your broker&apos;s MT5 server address and port. Ask support if unsure, then let us know so we add a button for it.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Error */}
        {error && (
          <p style={{ color: 'var(--re)', fontSize: 'var(--text-base)', background: 'rgba(240,80,75,0.08)', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(240,80,75,0.2)' }}>
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 vq-r"
            style={{ background: 'var(--s2)', border: '1px solid var(--bd2)', color: 'var(--t2)', fontSize: 'var(--text-base)', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 vq-r font-medium"
            style={{
              background: saving ? 'rgba(255,255,255,0.3)' : 'var(--color-ink-1)',
              border: 'none', color: 'var(--color-void)', fontSize: 'var(--text-base)', cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Connecting…' : 'Connect MT5'}
          </button>
        </div>

        {/* Info note */}
        <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', textAlign: 'center', lineHeight: '1.5' }}>
          VELQUOR runs a private cloud terminal for your account — trades sync 24/7 even
          when MT5 is closed on your devices. Credentials are encrypted on our EU server and
          never stored in the database; the investor password cannot place or modify trades.
        </p>
      </div>
    </>
  )
}
