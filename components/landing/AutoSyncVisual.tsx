'use client'

import { useEffect, useState } from 'react'

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
  return (
    <div style={{ background: '#090d12', borderRadius: '16px', border: '1px solid rgba(0,255,133,0.14)', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.018)' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em' }}>TRADE JOURNAL</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF85', display: 'block', boxShadow: '0 0 6px #00FF85', opacity: pulse ? 1 : 0.38, transition: 'opacity 0.6s' }} />
          <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 500 }}>MT5 Live Sync</span>
        </div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '11px 16px',
          borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          background: r.fresh ? 'rgba(0,255,133,0.03)' : 'transparent',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{
              fontSize: '9px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700,
              background: r.type === 'BUY' ? 'rgba(0,255,133,0.1)' : 'rgba(255,51,71,0.1)',
              color: r.type === 'BUY' ? '#00FF85' : '#FF3347',
            }}>{r.type}</span>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '13px', fontWeight: 600 }}>{r.sym}</span>
            <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px' }}>{r.time}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <span style={{ color: r.pnl.startsWith('+') ? '#00FF85' : '#FF3347', fontSize: '12px', fontWeight: 700 }}>{r.pnl}</span>
            {r.fresh && (
              <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(0,255,133,0.1)', border: '1px solid rgba(0,255,133,0.22)', color: '#00FF85', fontWeight: 600 }}>auto</span>
            )}
          </div>
        </div>
      ))}
      <div style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>Last sync:</span>
        <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 600 }}>1.2 seconds ago</span>
      </div>
    </div>
  )
}
