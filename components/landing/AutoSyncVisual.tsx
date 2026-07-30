'use client'

import { useEffect, useState } from 'react'

/**
 * The journal filling itself.
 *
 * This is the trade log the product actually renders, so it is now built the
 * way the product builds it: BUY/SELL in the ink voice, figures in mono, and
 * P&L green/red only on the P&L. The green border, the glowing sync dot, the
 * green "auto" pill and the green "1.2 seconds ago" were all colour spent on
 * things that are not money.
 */
export function AutoSyncVisual() {
  const [pulse, setPulse] = useState(false)
  useEffect(() => {
    const iv = setInterval(() => setPulse(p => !p), 1400)
    return () => clearInterval(iv)
  }, [])

  const rows = [
    { sym: 'XAUUSD', type: 'BUY',  pnl: '+€284.50', time: '09:14', fresh: true },
    { sym: 'NAS100', type: 'SELL', pnl: '−€112.20', time: '15:31', fresh: false },
    { sym: 'XAUUSD', type: 'BUY',  pnl: '+€196.00', time: '10:02', fresh: false },
    { sym: 'EURUSD', type: 'BUY',  pnl: '+€44.80',  time: '13:20', fresh: false },
  ]

  const label = {
    fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
    letterSpacing: '0.16em', textTransform: 'uppercase' as const,
    color: 'var(--color-ink-3)',
  }

  return (
    <div style={{
      background: 'var(--color-void)', border: '1px solid var(--color-line-1)',
      borderRadius: 'var(--radius-md)', overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--color-line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={label}>Trade journal</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {/* The dot is the only thing that moves: it is the sync heartbeat. */}
          <span style={{
            width: 5, height: 5, borderRadius: '50%', display: 'block',
            background: 'var(--color-ink-1)',
            opacity: pulse ? 1 : 0.3, transition: 'opacity 0.6s',
          }} />
          <span style={label}>MT5 live sync</span>
        </div>
      </div>

      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 14px', gap: '10px',
          borderBottom: i < rows.length - 1 ? '1px solid var(--color-line-1)' : 'none',
          background: r.fresh ? 'var(--color-surface-1)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xs)',
              letterSpacing: '0.12em', color: 'var(--color-ink-3)',
              border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-xs)',
              padding: '1px 5px',
            }}>{r.type}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', color: 'var(--color-ink-1)' }}>
              {r.sym}
            </span>
            <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>{r.time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px', flexShrink: 0 }}>
            <span className="vq-num" style={{
              fontSize: 'var(--text-base)',
              color: r.pnl.startsWith('+') ? 'var(--color-up)' : 'var(--color-down)',
            }}>{r.pnl}</span>
            {r.fresh && <span style={label}>auto</span>}
          </div>
        </div>
      ))}

      <div style={{
        padding: '9px 14px', borderTop: '1px solid var(--color-line-1)',
        display: 'flex', alignItems: 'baseline', gap: '6px',
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--color-ink-4)' }}>
          Last sync
        </span>
        <span className="vq-num" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-ink-1)' }}>1.2s ago</span>
      </div>
    </div>
  )
}
