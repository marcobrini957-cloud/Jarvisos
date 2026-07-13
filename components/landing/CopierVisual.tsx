'use client'

import { useEffect, useState } from 'react'

export function CopierVisual() {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(t => t + 1), 2800)
    return () => clearInterval(iv)
  }, [])
  const signalActive = tick % 4 === 1
  const execDone     = tick % 4 === 2

  return (
    <div style={{ background: '#090d12', borderRadius: '16px', border: '1px solid rgba(255,184,48,0.14)', overflow: 'hidden' }}>
      {/* Group header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.018)' }}>
        <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 700 }}>My Copy Group</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF85', display: 'block', boxShadow: '0 0 5px #00FF85' }} />
          <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 500 }}>Active</span>
        </div>
      </div>

      {/* Master */}
      <div style={{ padding: '11px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,184,48,0.03)' }}>
        <p style={{ margin: '0 0 6px', color: '#FFB830', fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em' }}>MASTER</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00FF85', display: 'block', boxShadow: '0 0 5px #00FF85' }} />
            <span style={{ color: 'rgba(255,255,255,0.88)', fontSize: '13px', fontWeight: 600 }}>ICM Main Live</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '10px' }}>#452891</span>
        </div>
      </div>

      {/* Signal banner */}
      <div style={{
        padding: '7px 16px',
        background: signalActive ? 'rgba(255,184,48,0.09)' : execDone ? 'rgba(0,255,133,0.05)' : 'transparent',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', gap: '7px',
        opacity: (signalActive || execDone) ? 1 : 0,
        transition: 'opacity 0.3s, background 0.3s',
        minHeight: '30px',
      }}>
        <span style={{ fontSize: '11px' }}>{execDone ? '✓' : '⚡'}</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: execDone ? '#00FF85' : '#FFB830' }}>
          {signalActive && 'XAUUSD BUY 0.5 lots → broadcasting to slaves…'}
          {execDone && 'All slaves executed — avg 1.8 seconds'}
        </span>
      </div>

      {/* Slaves */}
      <div style={{ padding: '11px 16px' }}>
        <p style={{ margin: '0 0 9px', color: 'rgba(255,255,255,0.28)', fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em' }}>SLAVE ACCOUNTS (3)</p>
        {[
          { name: 'FTMO Demo #781234', status: 'active',  execLots: '0.5 lots' },
          { name: 'Hedge Fund #334-B', status: 'active',  execLots: '0.25 lots' },
          { name: 'Personal ICM #229', status: 'paused',  execLots: null },
        ].map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 0',
            borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.status === 'active' ? '#00FF85' : '#444', display: 'block' }} />
              <span style={{ color: 'rgba(255,255,255,0.72)', fontSize: '12px' }}>{s.name}</span>
            </div>
            {execDone && s.execLots ? (
              <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 600 }}>{s.execLots} ✓</span>
            ) : (
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px' }}>{s.status}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div style={{ padding: '9px 16px', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '20px' }}>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px' }}>Avg execution</span>
          <span style={{ color: '#00FF85', fontSize: '10px', fontWeight: 600 }}>1.8s</span>
        </div>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: 'rgba(255,255,255,0.28)', fontSize: '10px' }}>Signals today</span>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', fontWeight: 600 }}>47</span>
        </div>
      </div>
    </div>
  )
}
