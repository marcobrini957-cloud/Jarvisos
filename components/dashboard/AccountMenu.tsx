'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AccountOverview {
  kind:      'primary' | 'copy'
  login:     number | null
  role:      'leader' | 'follower' | null
  status:    'live' | 'stale' | 'offline'
  balance:   number | null
  equity:    number | null
  openCount: number
  broker:    string | null
  groupName: string | null
  lastSeen:  string | null
}

interface PrimaryStatus {
  connected:     boolean
  balance:       number | null
  equity:        number | null
  openPositions: number
  syncedAt:      string | null
  error:         string | null
}

const DOT_COLOR = { live: 'var(--gr2)', stale: 'var(--go2)', offline: 'var(--t3)' } as const

function fmtEur(n: number | null): string {
  if (n === null || n === undefined) return '—'
  return '€' + n.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

function RoleBadge({ text, tone }: { text: string; tone: 'accent' | 'gold' | 'muted' }) {
  const colors = {
    accent: { bg: 'rgba(88,166,255,0.12)',  fg: 'var(--ac)'  },
    gold:   { bg: 'rgba(240,180,41,0.12)',  fg: 'var(--go2)' },
    muted:  { bg: 'rgba(255,255,255,0.06)', fg: 'var(--t3)'  },
  }[tone]
  return (
    <span style={{
      background: colors.bg, color: colors.fg, fontSize: '9px', fontWeight: 700,
      letterSpacing: '0.06em', padding: '1px 6px', borderRadius: '4px', flexShrink: 0,
    }}>
      {text}
    </span>
  )
}

// Topbar MT5 pill + professional account switcher dropdown.
// The pill shows the selected account; the journal always tracks the primary.
export default function AccountMenu({
  status, syncing, onSync, onConnect,
}: {
  status:    PrimaryStatus
  syncing:   boolean
  onSync:    () => void
  onConnect: () => void
}) {
  const [open,     setOpen]     = useState(false)
  const [accounts, setAccounts] = useState<AccountOverview[]>([])
  const [selected, setSelected] = useState<number | null>(null) // mt5 login
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem('vq-account-view')
    if (saved) setSelected(Number(saved))
  }, [])

  const loadAccounts = useCallback(async () => {
    try {
      const res  = await fetch('/api/accounts/overview')
      const data = await res.json()
      if (Array.isArray(data.accounts)) setAccounts(data.accounts)
    } catch { /* keep last known */ }
  }, [])

  // Refresh on open + every 15s while open
  useEffect(() => {
    if (!open) return
    loadAccounts()
    const iv = setInterval(loadAccounts, 15_000)
    return () => clearInterval(iv)
  }, [open, loadAccounts])

  // Initial load so the pill can show a selected copy account after reload
  useEffect(() => { loadAccounts() }, [loadAccounts])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const primary = accounts.find(a => a.kind === 'primary')
  const selectedAcc =
    accounts.find(a => a.login === selected) ?? primary ?? null
  const showingPrimary = !selectedAcc || selectedAcc.kind === 'primary'

  // Pill figures: primary rides the fast mt5-sync status; copy accounts use
  // the bridge-heartbeat figures from the overview.
  const pillBalance = showingPrimary ? status.balance : selectedAcc?.balance ?? null
  const pillOpen    = showingPrimary ? status.openPositions : selectedAcc?.openCount ?? 0
  const pillSynced  = showingPrimary ? status.syncedAt : selectedAcc?.lastSeen ?? null
  const pillLabel   = showingPrimary
    ? 'MT5'
    : `${selectedAcc?.role === 'follower' ? 'COPY' : 'MT5'} ${selectedAcc?.login ?? ''}`

  function choose(acc: AccountOverview) {
    setSelected(acc.login)
    if (acc.login !== null) localStorage.setItem('vq-account-view', String(acc.login))
    if (acc.kind === 'primary') localStorage.removeItem('vq-account-view')
    setOpen(false)
  }

  const actionStyle: React.CSSProperties = {
    flex: 1, padding: '8px 0', borderRadius: '7px', fontSize: '11px', fontWeight: 600,
    background: 'var(--s3)', border: '1px solid var(--bd2)', color: 'var(--t2)',
    cursor: 'pointer', transition: 'all 0.12s',
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
        style={{
          background: open ? 'var(--s2)' : 'transparent',
          border: '1px solid var(--bd2)',
          cursor: 'pointer',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
        onMouseLeave={e => (e.currentTarget.style.background = open ? 'var(--s2)' : 'transparent')}
      >
        <span style={{
          width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', flexShrink: 0,
          background: status.connected ? 'var(--gr2)' : status.error ? 'var(--re)' : 'var(--t3)',
          boxShadow:  status.connected ? '0 0 6px var(--gr)' : 'none',
          animation:  syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
        }} />

        {status.connected ? (
          <div className="flex items-center gap-3">
            <span className="topbar-mt5-label" style={{ color: 'var(--t2)', fontSize: '12px' }}>{pillLabel}</span>
            {pillBalance !== null && (
              <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>{fmtEur(pillBalance)}</span>
            )}
            {pillOpen > 0 && (
              <span className="topbar-mt5-open" style={{
                background: 'rgba(88,166,255,0.12)', color: 'var(--ac)',
                fontSize: '11px', padding: '1px 7px', borderRadius: '4px',
              }}>
                {pillOpen} open
              </span>
            )}
            {pillSynced && (
              <span className="topbar-mt5-time" style={{ color: 'var(--t3)', fontSize: '11px' }}>{timeAgo(pillSynced)}</span>
            )}
            <span style={{ color: 'var(--t3)', fontSize: '9px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>▾</span>
          </div>
        ) : status.error ? (
          <span style={{ color: 'var(--re)', fontSize: '12px' }}>Reconnect MT5</span>
        ) : (
          <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Connect MT5</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
          width: '340px', zIndex: 50,
          background: 'var(--s2)', border: '1px solid var(--bd2)', borderRadius: '12px',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <span style={{ color: 'var(--t3)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em' }}>
              TRADING ACCOUNTS
            </span>
            <button
              onClick={() => { onSync(); loadAccounts() }}
              title="Sync now"
              style={{
                background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer',
                fontSize: '12px', padding: '2px 4px',
                animation: syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
              }}
            >
              ⟳
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {accounts.length === 0 && (
              <div style={{ color: 'var(--t3)', fontSize: '12px', padding: '10px', textAlign: 'center' }}>
                No accounts connected yet
              </div>
            )}
            {accounts.map(acc => {
              const isSelected = (selectedAcc?.login === acc.login && selectedAcc?.kind === acc.kind)
              return (
                <button
                  key={`${acc.kind}-${acc.login}`}
                  onClick={() => choose(acc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                    padding: '10px 10px', borderRadius: '9px', textAlign: 'left',
                    background: isSelected ? 'rgba(88,166,255,0.08)' : 'transparent',
                    border: isSelected ? '1px solid rgba(88,166,255,0.35)' : '1px solid transparent',
                    cursor: 'pointer', transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--s3)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                    background: DOT_COLOR[acc.status],
                    boxShadow: acc.status === 'live' ? '0 0 6px var(--gr)' : 'none',
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>
                        {acc.login ?? '—'}
                      </span>
                      {acc.kind === 'primary' && <RoleBadge text="PRIMARY" tone="accent" />}
                      {acc.role === 'leader'  && <RoleBadge text="LEADER"  tone="gold" />}
                      {acc.role === 'follower'   && <RoleBadge text="COPY"    tone="muted" />}
                    </div>
                    <span style={{
                      color: 'var(--t3)', fontSize: '10px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {acc.groupName ?? acc.broker ?? (acc.kind === 'primary' ? 'Main account' : 'Copy account')}
                      {acc.lastSeen ? ` · ${timeAgo(acc.lastSeen)}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                    <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 600 }}>{fmtEur(acc.balance)}</span>
                    <span style={{ color: 'var(--t3)', fontSize: '10px' }}>
                      {acc.openCount > 0 ? `${acc.openCount} open` : `eq ${fmtEur(acc.equity)}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--bd)' }} />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              style={actionStyle}
              onClick={() => { setOpen(false); onConnect() }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'var(--s2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'var(--s3)' }}
            >
              MT5 Connection
            </button>
            <button
              style={actionStyle}
              onClick={() => {
                setOpen(false)
                window.dispatchEvent(new CustomEvent('vq-switch-tab', { detail: 8 }))
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.background = 'var(--s2)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'var(--s3)' }}
            >
              Copy Trading →
            </button>
          </div>

          <p style={{ color: 'var(--t3)', fontSize: '9.5px', margin: 0, padding: '0 4px', lineHeight: 1.4 }}>
            Journal &amp; analytics always track your primary account. Copy accounts execute mirrors — their history lives in the Copy tab.
          </p>
        </div>
      )}
    </div>
  )
}
