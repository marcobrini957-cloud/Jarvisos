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
    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--t3)', fontSize: 'var(--text-base)' }}>
      Loading log…
    </div>
  )

  if (error) return (
    <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-down)', fontSize: 'var(--text-base)' }}>
      {error}
    </div>
  )

  if (entries.length === 0) return (
    <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--t3)', fontSize: 'var(--text-base)' }}>
      No activity yet — signals appear here once the leader starts trading.
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {entries.map(e => {
        const sig        = e.copy_signals
        const acc        = e.copy_accounts
        const statusColor = e.status === 'success' ? 'var(--color-up)' : e.status === 'failed' ? 'var(--color-down)' : '#FFFFFF'
        const sigColor   = sig.signal_type === 'OPEN' ? 'var(--color-up)' : 'var(--color-down)'

        return (
          <div key={e.id} style={{
            display: 'grid',
            gridTemplateColumns: '44px 1fr 80px 60px',
            alignItems: 'center',
            padding: '7px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)',
            gap: '10px',
            fontSize: 'var(--text-sm)',
          }}>
            <div style={{
              padding: '2px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
              background: sig.signal_type === 'OPEN' ? 'rgba(0,196,106,0.1)' : 'rgba(240,80,75,0.1)',
              color: sigColor, fontWeight: 700, fontSize: 'var(--text-xs)', letterSpacing: '0.06em',
            }}>
              {sig.signal_type}
            </div>

            <div>
              <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{sig.symbol}</span>
              {' '}
              <span style={{ color: sig.trade_type === 'BUY' ? 'var(--color-up)' : 'var(--color-down)', fontSize: 'var(--text-xs)' }}>
                {sig.trade_type}
              </span>
              <div style={{ color: 'var(--t3)', fontSize: 'var(--text-xs)', marginTop: '1px' }}>
                → {acc.nickname || `#${acc.mt5_login}`}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: statusColor, flexShrink: 0,
                              }} />
              <span style={{ color: statusColor, textTransform: 'capitalize', fontSize: 'var(--text-xs)' }}>
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
