'use client'

import { useState } from 'react'
import { inputStyle, btnPrimary, btnSecondary } from './styles'
import { Label, Segmented } from '@/components/ui/vq'

// ── Create Group Modal ────────────────────────────────────────────────────────
export function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name,     setName]     = useState('Copy Group 1')
  const [sizing,   setSizing]   = useState<'mirror' | 'multiplier' | 'fixed'>('mirror')
  const [lotMult,  setLotMult]  = useState('1.0')
  const [lotFixed, setLotFixed] = useState('0.01')
  const [maxLot,   setMaxLot]   = useState('10.0')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    // 1:1 mirror is proportional × 1.0 with an effectively-open cap.
    const res = await fetch('/api/copy/groups', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        name,
        lot_mode:       sizing === 'fixed' ? 'fixed' : 'proportional',
        lot_multiplier: sizing === 'mirror' ? 1.0 : parseFloat(lotMult),
        lot_fixed:      parseFloat(lotFixed),
        max_lot:        sizing === 'mirror' ? 100 : parseFloat(maxLot),
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
        background: 'var(--s1)', border: '1px solid var(--color-line-1)', borderRadius: 'var(--radius-card)',
        padding: '28px', width: '100%', maxWidth: '400px',
        }}>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(16px, 1.25vw, 19px)',
          letterSpacing: '-0.025em', color: 'var(--color-ink-1)', marginBottom: '20px',
        }}>
          New copy group
        </div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Label>Group name</Label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </label>

          <div>
            <div style={{ marginBottom: '6px' }}><Label>Lot sizing</Label></div>
            {/* The same segmented control as every other choice in the product.
                It was three drawn boxes whose selected state was a white 15%
                fill with a 50% border — louder than the modal's own primary
                action, and the fourth different way to show "this one". */}
            <Segmented
              options={[
                { key: 'mirror',     label: '1:1 Mirror' },
                { key: 'multiplier', label: 'Multiplier' },
                { key: 'fixed',      label: 'Fixed' },
              ]}
              value={sizing}
              onChange={setSizing}
            />
          </div>

          {sizing === 'mirror' && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>
              Followers copy every trade at exactly the leader&apos;s lot size.
            </span>
          )}
          {sizing === 'multiplier' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Lot multiplier</Label>
              <input value={lotMult} onChange={e => setLotMult(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>Follower lots = leader lots × {lotMult || '1.0'}</span>
            </label>
          )}
          {sizing === 'fixed' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Fixed lot size</Label>
              <input value={lotFixed} onChange={e => setLotFixed(e.target.value)} type="number" step="0.01" min="0.01" style={inputStyle} />
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--t3)' }}>Follower always trades exactly {lotFixed || '0.01'} lots</span>
            </label>
          )}

          {sizing !== 'mirror' && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <Label>Max lot cap</Label>
              <input value={maxLot} onChange={e => setMaxLot(e.target.value)} type="number" step="0.1" min="0.01" style={inputStyle} />
            </label>
          )}

          {error && (
            <div style={{ fontSize: 'var(--text-base)', color: 'var(--color-down)', padding: '8px 12px', background: 'rgba(240,80,75,0.08)', borderRadius: 'var(--radius-md)' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={loading} style={btnPrimary}>
              {loading ? 'Creating…' : 'Create group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
