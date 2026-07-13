'use client'

import { useState } from 'react'
import { inputStyle, btnPrimary, btnSecondary } from './styles'

// ── Create Group Modal ────────────────────────────────────────────────────────
export function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState('Copy Group 1')
  const [lotMode,  setLotMode]  = useState<'proportional' | 'fixed'>('proportional')
  const [lotMult,  setLotMult]  = useState('1.0')
  const [lotFixed, setLotFixed] = useState('0.01')
  const [maxLot,   setMaxLot]   = useState('10.0')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/copy/groups', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name, lot_mode: lotMode,
        lot_multiplier: parseFloat(lotMult),
        lot_fixed:      parseFloat(lotFixed),
        max_lot:        parseFloat(maxLot),
      }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Failed'); return }
    onCreated()
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '16px',
        padding: '28px', width: '100%', maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--t1)', marginBottom: '20px' }}>
          New Copy Group
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>GROUP NAME</span>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </label>

          <div>
            <div style={{ fontSize: '11px', color: 'var(--t3)', marginBottom: '6px' }}>LOT SIZING MODE</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['proportional', 'fixed'] as const).map(m => (
                <button
                  key={m} type="button" onClick={() => setLotMode(m)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: '8px', fontSize: '12px',
                    fontWeight: lotMode === m ? 700 : 400,
                    background: lotMode === m ? 'rgba(122,79,255,0.15)' : 'var(--s2)',
                    border:     lotMode === m ? '1px solid rgba(122,79,255,0.5)' : '1px solid var(--bd)',
                    color:      lotMode === m ? 'var(--ac)' : 'var(--t3)',
                    cursor:     'pointer', textTransform: 'capitalize',
                  }}
                >
                  {m === 'proportional' ? 'Proportional' : 'Fixed'}
                </button>
              ))}
            </div>
          </div>

          {lotMode === 'proportional' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>LOT MULTIPLIER</span>
              <input value={lotMult} onChange={e => setLotMult(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>Slave lots = master lots × {lotMult || '1.0'}</span>
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--t3)' }}>FIXED LOT SIZE</span>
              <input value={lotFixed} onChange={e => setLotFixed(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: '10px', color: 'var(--t3)' }}>Slave always trades exactly {lotFixed || '0.01'} lots</span>
            </label>
          )}

          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: 'var(--t3)' }}>MAX LOT CAP</span>
            <input value={maxLot} onChange={e => setMaxLot(e.target.value)} type="number" step="0.1" min="0.01" style={inputStyle} />
          </label>

          {error && (
            <div style={{ fontSize: '12px', color: '#FF3347', padding: '8px 12px', background: 'rgba(255,51,71,0.08)', borderRadius: '8px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
