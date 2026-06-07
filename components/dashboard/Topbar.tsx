'use client'

import { useState, useEffect, useCallback } from 'react'
import MT5ConnectModal from './MT5ConnectModal'
import { useDisplayMode } from '@/context/DisplayModeContext'

interface MT5Status {
  connected:     boolean
  balance:       number | null
  equity:        number | null
  openPositions: number
  syncedAt:      string | null
  error:         string | null
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  return `${Math.floor(s / 3600)}h ago`
}

export default function Topbar() {
  const { displayMode, toggleDisplayMode } = useDisplayMode()
  const [showModal, setShowModal] = useState(false)
  const [status,    setStatus]    = useState<MT5Status>({
    connected: false, balance: null, equity: null,
    openPositions: 0, syncedAt: null, error: null,
  })
  const [syncing, setSyncing] = useState(false)
  const [, setTick]           = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 15000)
    return () => clearInterval(id)
  }, [])

  const runSync = useCallback(async (quick = true) => {
    if (syncing) return
    setSyncing(true)
    try {
      const res  = await fetch(`/api/mt5-sync?quick=${quick}`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setStatus({
          connected: true, balance: data.balance, equity: data.equity,
          openPositions: data.openPositions, syncedAt: data.syncedAt, error: null,
        })
      } else {
        setStatus(prev => ({ ...prev, connected: false, error: data.error }))
      }
    } catch {
      setStatus(prev => ({ ...prev, connected: false, error: 'Network error' }))
    } finally {
      setSyncing(false)
    }
  }, [syncing])

  // On mount: show cached snapshot instantly, then quick sync in background
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    // 1. Load cached data from Supabase immediately
    fetch('/api/mt5-sync')
      .then(r => r.json())
      .then(d => {
        if (d.snapshot) {
          setStatus({
            connected:     true,
            balance:       d.snapshot.balance,
            equity:        d.snapshot.equity,
            openPositions: d.snapshot.open_trades_count ?? 0,
            syncedAt:      d.snapshot.snapshot_at,
            error:         null,
          })
        }
      })
      .catch(() => {})

    // 2. Quick sync after 3 seconds (only last 14 days — fast)
    const t = setTimeout(() => runSync(true), 3000)
    // 3. Full sync once per hour
    const i = setInterval(() => runSync(false), 60 * 60 * 1000)
    return () => { clearTimeout(t); clearInterval(i) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSaveCredentials(data: { accountId: string; investorPassword: string; server: string }) {
    const res = await fetch('/api/user/mt5-credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed')
    setTimeout(runSync, 500)
  }

  return (
    <>
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          height: '48px',
          padding: '0 20px',
          background: 'var(--s1)',
          borderBottom: '1px solid var(--bd)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.02)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div style={{
            width: '26px', height: '26px',
            background: 'linear-gradient(145deg, var(--go2) 0%, var(--am) 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(200,133,26,0.35)',
          }}>
            ⬡
          </div>
          <div className="flex items-baseline gap-1">
            <span style={{ color: 'var(--t1)', fontWeight: 700, fontSize: '13px', letterSpacing: '-0.01em' }}>
              Jarvis
            </span>
            <span style={{ color: 'var(--t3)', fontSize: '10px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>OS</span>
          </div>
        </div>

        {/* MT5 Status */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background: 'transparent',
            border: '1px solid var(--bd2)',
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* Status indicator */}
          <span style={{
            width: '6px', height: '6px', borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: status.connected ? 'var(--gr2)' : status.error ? 'var(--re)' : 'var(--t3)',
            boxShadow:  status.connected ? '0 0 6px var(--gr)' : 'none',
            animation:  syncing ? 'pulse-dot 1s ease-in-out infinite' : 'none',
          }} />

          {status.connected ? (
            <div className="flex items-center gap-3">
              <span style={{ color: 'var(--t2)', fontSize: '12px' }}>MT5</span>
              {status.balance !== null && (
                <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>
                  €{status.balance.toLocaleString('de-AT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              {status.openPositions > 0 && (
                <span style={{
                  background: 'rgba(88,166,255,0.12)', color: 'var(--ac)',
                  fontSize: '11px', padding: '1px 7px', borderRadius: '4px',
                }}>
                  {status.openPositions} open
                </span>
              )}
              {status.syncedAt && (
                <span style={{ color: 'var(--t3)', fontSize: '11px' }}>{timeAgo(status.syncedAt)}</span>
              )}
            </div>
          ) : status.error ? (
            <span style={{ color: 'var(--re)', fontSize: '12px' }}>Reconnect MT5</span>
          ) : (
            <span style={{ color: 'var(--t3)', fontSize: '12px' }}>Connect MT5</span>
          )}
        </button>

        {/* Display mode toggle */}
        <button
          onClick={toggleDisplayMode}
          title={displayMode === 'pct' ? 'Switch to EUR values' : 'Switch to % values'}
          style={{
            width: '32px', height: '28px',
            background: 'var(--s2)',
            border: '1px solid var(--bd2)',
            borderRadius: '7px',
            color: 'var(--t2)',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.12s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--t1)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s2)'; e.currentTarget.style.color = 'var(--t2)' }}
        >
          {displayMode === 'pct' ? '€' : '%'}
        </button>

        {/* User */}
        <div className="flex items-center gap-2">
          <div style={{
            width: '28px', height: '28px',
            background: 'var(--ac)', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '12px', color: 'white', fontWeight: 600,
          }}>
            M
          </div>
          <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
            <span style={{ color: 'var(--t1)', fontSize: '12px', fontWeight: 500 }}>Marco</span>
            <span style={{ color: 'var(--t3)', fontSize: '10px' }}>Vienna · EUR</span>
          </div>
        </div>
      </div>

      {showModal && (
        <MT5ConnectModal
          onClose={() => setShowModal(false)}
          onSave={handleSaveCredentials}
          isConnected={status.connected}
        />
      )}
    </>
  )
}
