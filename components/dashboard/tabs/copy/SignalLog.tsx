'use client'

import { useState, useEffect } from 'react'
import type { CopyLogEntry } from './types'
import { timeAgo } from './helpers'

// ── Signal Log ────────────────────────────────────────────────────────────────
export function SignalLog({ groupId }: { groupId: string }) {
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
      No activity yet — signals appear here once the leader starts trading.
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
