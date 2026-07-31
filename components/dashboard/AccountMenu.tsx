'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { eur } from '@/lib/utils/formatting'
import { Label, Num } from '@/components/ui/vq'

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

// Live / stale / offline is system state, so amber is allowed in the middle
// band — but nothing here glows any more.
const DOT_COLOR = {
  live:    'var(--color-up)',
  stale:   'var(--color-warn)',
  offline: 'var(--color-ink-4)',
} as const

function fmtEur(n: number | null): string {
  if (n === null || n === undefined) return '—'
  // Same grouping as the dashboard hero — the top bar used to render de-AT
  // (€2 358,19) directly above an en-US (€2,358.19) copy of the same balance.
  return eur(n)
}

function timeAgo(iso: string | null): string {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

/** Role marker. All three roles read in ink — the tier is the word itself. */
function RoleBadge({ text }: { text: string }) {
  return (
    <span style={{
      background: 'var(--color-surface-2)', color: 'var(--color-ink-2)',
      fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: 'var(--radius-xs)', flexShrink: 0,
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
    flex: 1, padding: '7px 0', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)',
    background: 'var(--color-surface-2)', border: '1px solid var(--color-line-1)',
    color: 'var(--color-ink-2)', cursor: 'pointer', transition: 'all 0.12s',
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2"
        style={{
          padding: '4px 10px', borderRadius: 'var(--radius-sm)',
          background: open ? 'var(--color-surface-2)' : 'transparent',
          border: '1px solid var(--color-line-1)',
          cursor: 'pointer',
          transition: 'all 0.12s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-state-hover)')}
        onMouseLeave={e => (e.currentTarget.style.background = open ? 'var(--color-surface-2)' : 'transparent')}
      >
        <span style={{
          width: '5px', height: '5px', borderRadius: '50%', display: 'inline-block', flexShrink: 0,
          background: status.connected ? 'var(--color-up)' : status.error ? 'var(--color-down)' : 'var(--color-ink-4)',
          animation:  syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
        }} />

        {status.connected ? (
          <div className="flex items-center gap-3">
            <span className="topbar-mt5-label"><Label>{pillLabel}</Label></span>
            {pillBalance !== null && <Num size="sm" tone="neutral">{fmtEur(pillBalance)}</Num>}
            {pillOpen > 0 && (
              <span className="topbar-mt5-open" style={{
                background: 'var(--color-surface-2)', color: 'var(--color-ink-1)',
                fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                padding: '1px 5px', borderRadius: 'var(--radius-xs)',
              }}>
                {pillOpen} open
              </span>
            )}
            {/* Derived from Date.now(), so the server's string and the client's
                can straddle a minute boundary. Same guard as SessionClock and
                the News clocks. */}
            {pillSynced && (
              <span className="topbar-mt5-time" suppressHydrationWarning><Num size="2xs" tone="muted">{timeAgo(pillSynced)}</Num></span>
            )}
            <span style={{
              color: 'var(--color-ink-4)', fontSize: 'var(--text-2xs)',
              transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
            }}>▾</span>
          </div>
        ) : status.error ? (
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--color-down)', fontSize: 'var(--text-base)' }}>Reconnect MT5</span>
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)', fontSize: 'var(--text-base)' }}>Connect MT5</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)',
          width: '336px', zIndex: 50,
          background: '#0F0F0F', border: '1px solid var(--color-line-2)',
          borderRadius: 'var(--radius-md)',
          padding: '10px', display: 'flex', flexDirection: 'column', gap: '9px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
            <Label>Trading accounts</Label>
            <button
              onClick={() => { onSync(); loadAccounts() }}
              title="Sync now"
              style={{
                background: 'transparent', border: 'none', color: 'var(--color-ink-3)', cursor: 'pointer',
                fontSize: 'var(--text-base)', padding: '2px 4px',
                animation: syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
              }}
            >
              ⟳
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {accounts.length === 0 && (
              <div style={{
                fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
                fontSize: 'var(--text-base)', padding: '10px', textAlign: 'center',
              }}>
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
                    padding: '8px 9px', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                    background: isSelected ? 'var(--color-surface-2)' : 'transparent',
                    borderLeft: `2px solid ${isSelected ? 'var(--color-ink-1)' : 'transparent'}`,
                    border: 'none', cursor: 'pointer', transition: 'all 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-state-hover)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    width: '5px', height: '5px', borderRadius: '50%', flexShrink: 0,
                    background: DOT_COLOR[acc.status],
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Num size="sm" tone="neutral">{acc.login ?? '—'}</Num>
                      {acc.kind === 'primary'  && <RoleBadge text="Primary" />}
                      {acc.role === 'leader'   && <RoleBadge text="Leader" />}
                      {acc.role === 'follower' && <RoleBadge text="Copy" />}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
                      fontSize: 'var(--text-xs)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {acc.groupName ?? acc.broker ?? (acc.kind === 'primary' ? 'Main account' : 'Copy account')}
                      <span suppressHydrationWarning>{acc.lastSeen ? ` · ${timeAgo(acc.lastSeen)}` : ''}</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 }}>
                    <Num size="sm" tone="neutral">{fmtEur(acc.balance)}</Num>
                    <Num size="2xs" tone="muted">
                      {acc.openCount > 0 ? `${acc.openCount} open` : `eq ${fmtEur(acc.equity)}`}
                    </Num>
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ height: '1px', background: 'var(--color-line-1)' }} />

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              style={actionStyle}
              onClick={() => { setOpen(false); onConnect() }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-1)'; e.currentTarget.style.background = 'var(--color-state-active)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-2)'; e.currentTarget.style.background = 'var(--color-surface-2)' }}
            >
              MT5 connection
            </button>
            <button
              style={actionStyle}
              onClick={() => {
                setOpen(false)
                window.dispatchEvent(new CustomEvent('vq-switch-tab', { detail: 8 }))
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-ink-1)'; e.currentTarget.style.background = 'var(--color-state-active)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-ink-2)'; e.currentTarget.style.background = 'var(--color-surface-2)' }}
            >
              Copy trading →
            </button>
          </div>

          <p style={{
            fontFamily: 'var(--font-display)', color: 'var(--color-ink-3)',
            fontSize: 'var(--text-xs)', margin: 0, padding: '0 4px', lineHeight: 1.45,
          }}>
            Journal &amp; analytics always track your primary account. Copy accounts execute mirrors — their history lives in the Copy tab.
          </p>
        </div>
      )}
    </div>
  )
}
