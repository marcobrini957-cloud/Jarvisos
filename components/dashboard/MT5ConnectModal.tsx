'use client'

import { useState, useEffect, useMemo } from 'react'
import { BROKERS } from '@/lib/brokers'
import Icon from '@/components/ui/Icon'
import { Select } from '@/components/ui/vq'

interface MT5ConnectModalProps {
  onClose: () => void
  onConnected?: () => void
  currentAccountId?: string
  isConnected?: boolean
}

export default function MT5ConnectModal({ onClose, onConnected, currentAccountId, isConnected }: MT5ConnectModalProps) {
  const [login,    setLogin]   = useState(currentAccountId ?? '')
  const [password, setPassword] = useState('')
  const [server,     setServer]     = useState('')
  const [serverOpen, setServerOpen] = useState(false)
  // MetaTrader's own directory, ~2,700 servers. Fetched once when the form
  // opens; the field filters it locally, which is what makes typing "vantage"
  // feel instant rather than like a search box.
  const [allServers, setAllServers] = useState<string[]>([])
  const [saving,   setSaving]  = useState(false)
  const [error,    setError]   = useState('')
  const [done,     setDone]    = useState(false)

  useEffect(() => {
    let live = true
    fetch('/api/mt5/servers')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (live && Array.isArray(d?.servers)) setAllServers(d.servers) })
      .catch(() => {})
    return () => { live = false }
  }, [])

  // Which of ours we can resolve to an address without the user finding a host.
  const knownNames = useMemo(
    () => new Set(BROKERS.flatMap(b => b.servers.map(x => x.name.toLowerCase()))),
    [],
  )

  const matches = useMemo(() => {
    const q = server.trim().toLowerCase()
    if (!q) return allServers.slice(0, 8)
    // Names that START with what was typed come first — someone typing "ic"
    // means IC Markets, not the 90 servers with "ic" somewhere inside them.
    const starts: string[] = [], contains: string[] = []
    for (const name of allServers) {
      const l = name.toLowerCase()
      if (l.startsWith(q)) starts.push(name)
      else if (l.includes(q)) contains.push(name)
      if (starts.length >= 8) break
    }
    return [...starts, ...contains].slice(0, 8)
  }, [server, allServers])

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
        className="vq-modal fixed z-50 vq-r p-6 flex flex-col gap-4"
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
              We read your account. We cannot trade it.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', lineHeight: 1 }}
          >
            <Icon name="close" size={13} />
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
            <div style={{ color: 'var(--color-up)', marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><Icon name="check" size={26} strokeWidth={1.75} /></div>
            <p style={{ color: 'var(--color-up)', fontSize: 'var(--text-md)', margin: 0 }}>MT5 account connected</p>
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
              onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
            />
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)' }}>Your numeric account number from your broker</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>
              Password <span style={{ color: 'var(--t3)', fontWeight: 400 }}>(your investor password works too — it is read-only)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="MetaTrader password"
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--color-line-3)')}
              onBlur={e => (e.target.style.borderColor = 'var(--bd2)')}
            />
            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', lineHeight: 1.55 }}>
              We only ever read this account — we cannot place, change or close a trade with it,
              and we cannot move money. If you would rather not hand over your main password,
              MetaTrader gives you a read-only one: Tools → Options → Server → Change investor
              password. Either works here.
            </p>
          </div>

          {/* Broker + server as ONE searchable field.
              It used to be a broker dropdown and then Live 1 / Live 2 / Demo
              buttons. Those labels are ours, not MetaTrader's: a trader reads
              "BlueberryMarkets-Live02" off their own terminal and then has to
              work out which of our three buttons that is. And the shape only
              fits a broker with exactly that many servers — it says nothing
              useful to someone on IC Markets or Vantage. Type what your
              terminal shows; if we know it we resolve it, and if we do not you
              can paste the address instead. */}
          <div className="flex flex-col gap-1.5">
            <label style={{ color: 'var(--t2)', fontSize: 'var(--text-base)', fontWeight: 500 }}>Server</label>
            <input
              value={server}
              onChange={e => { setServer(e.target.value); setServerOpen(true) }}
              onFocus={() => setServerOpen(true)}
              placeholder="Start typing your broker — e.g. ICMarkets, Vantage"
              autoComplete="off"
              style={{
                background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: 'var(--radius-md)',
                padding: '10px 12px', color: 'var(--t1)', fontSize: 'var(--text-base)', outline: 'none',
              }}
              onBlur={e => { e.target.style.borderColor = 'var(--bd2)'; setTimeout(() => setServerOpen(false), 150) }}
            />

            {serverOpen && matches.length > 0 && (
              <div style={{
                display: 'flex', flexDirection: 'column', gap: '2px',
                maxHeight: '168px', overflowY: 'auto',
                background: 'var(--color-surface-1)', border: '1px solid var(--color-line-1)',
                borderRadius: 'var(--radius-lg)', padding: '4px',
              }}>
                {matches.map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); setServer(name); setServerOpen(false) }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      padding: '7px 9px', borderRadius: 'var(--radius-md)', border: 'none',
                      background: 'transparent', color: 'var(--color-ink-1)',
                      fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-state-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                  >
                    <span>{name}</span>
                    {knownNames.has(name.toLowerCase()) && (
                      <span style={{ color: 'var(--color-ink-3)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>
                        verified
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <p style={{ color: 'var(--t3)', fontSize: 'var(--text-sm)', lineHeight: 1.55 }}>
              The server name shown beside your account in MetaTrader (File → Login to Trade
              Account). If your broker is not in the list, that is fine — paste the name and we
              will take it from there, or enter the address your broker gave you
              (host:port).
            </p>
          </div>
        </div>
        )}

        {/* Error.
            A failed connection used to be one red line and no way forward: the
            three things that actually go wrong here — a typo in the login, the
            wrong server of a broker's several, an investor password where a
            trading one is needed — are invisible from our side, and the person
            staring at the message cannot tell which one it was. So the message
            says what to check, and then hands over an address. Nobody should
            have to work out on their own how to reach us. */}
        {error && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: '8px',
            color: 'var(--color-down)', fontSize: 'var(--text-base)',
            background: 'var(--color-down-dim)', padding: '11px 13px',
            borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-down-dim)',
          }}>
            <span>{error}</span>
            <span style={{ color: 'var(--color-ink-2)', lineHeight: 1.55 }}>
              Check the login number, the broker server, and that the password is the
              one you sign in to MetaTrader with. If it still will not connect, send us
              the login number and broker and we will look at it:{' '}
              <a
                href="mailto:support@velquor.app?subject=Cannot%20connect%20my%20MetaTrader%20account"
                style={{ color: 'var(--color-ink-1)', textDecoration: 'underline' }}
              >
                support@velquor.app
              </a>
            </span>
          </div>
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
